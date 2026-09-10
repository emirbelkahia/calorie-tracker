export interface PlateItemEstimate {
  name: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PlateEstimate {
  dishName: string;
  items: PlateItemEstimate[];
}

export const PLATE_ESTIMATE_SCHEMA = {
  name: "plate_estimate",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      dishName: {
        type: "string",
        description: "Short name for the dish if visible, else empty string",
      },
      items: {
        type: "array",
        description:
          "Visible components on the plate, each with estimated grams and macros for that portion",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", description: "Food name in French" },
            quantityG: {
              type: "number",
              description: "Estimated grams of this component",
            },
            calories: {
              type: "number",
              description: "Estimated kcal for this portion, not per 100g",
            },
            proteinG: { type: "number" },
            carbsG: { type: "number" },
            fatG: { type: "number" },
          },
          required: [
            "name",
            "quantityG",
            "calories",
            "proteinG",
            "carbsG",
            "fatG",
          ],
        },
      },
    },
    required: ["dishName", "items"],
  },
} as const;

export const PLATE_ESTIMATE_PROMPT = `Tu vois une photo d'assiette (repas déjà servi, souvent français).
Estime ce qui est VISIBLE uniquement. N'invente pas d'aliments hors cadre.
Pour chaque composante : nom, grammes estimés, kcal et macros (P/C/L) pour CETTE portion (pas /100g).
Les macros doivent rester cohérentes avec les grammes.
Si tu ne peux pas découper, une seule ligne pour tout le plat.
Ce sont des ESTIMATIONS, pas des mesures.`;

interface MistralChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

function parseItem(raw: unknown): PlateItemEstimate | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) return null;
  return {
    name,
    quantityG: Math.max(1, asNumber(obj.quantityG) || 100),
    calories: asNumber(obj.calories),
    proteinG: asNumber(obj.proteinG),
    carbsG: asNumber(obj.carbsG),
    fatG: asNumber(obj.fatG),
  };
}

export function parsePlateEstimate(raw: unknown): PlateEstimate {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const dishName = typeof obj.dishName === "string" ? obj.dishName.trim() : "";
  const list = Array.isArray(obj.items) ? obj.items : [];
  let items = list.map(parseItem).filter((item): item is PlateItemEstimate => item != null);
  if (items.length === 0 && dishName) {
    items = [
      {
        name: dishName,
        quantityG: 250,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
    ];
  }
  return { dishName, items };
}

function parseContentJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("BAD_ANNOTATION_JSON");
  }
}

/** Call Mistral vision chat with caller-provided API key. Never log the key. */
export async function estimatePlateFromImage(params: {
  apiKey: string;
  imageDataUrl: string;
}): Promise<PlateEstimate> {
  const { apiKey, imageDataUrl } = params;
  if (!apiKey.trim()) {
    throw new Error("MISSING_API_KEY");
  }
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("INVALID_IMAGE");
  }

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PLATE_ESTIMATE_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: PLATE_ESTIMATE_SCHEMA,
      },
      max_tokens: 800,
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("INVALID_API_KEY");
  }
  if (!res.ok) {
    throw new Error(`MISTRAL_HTTP_${res.status}`);
  }

  const data = (await res.json()) as MistralChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NO_ANNOTATION");
  }

  let parsed: unknown;
  try {
    parsed = parseContentJson(content);
  } catch {
    throw new Error("BAD_ANNOTATION_JSON");
  }

  const estimate = parsePlateEstimate(parsed);
  if (estimate.items.length === 0) {
    throw new Error("NO_ANNOTATION");
  }
  return estimate;
}
