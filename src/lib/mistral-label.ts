export type LabelBasis = "per_100g" | "per_serving" | "unknown";

export interface LabelNutrition {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  basis: LabelBasis;
}

export const LABEL_NUTRITION_SCHEMA = {
  name: "nutrition_label",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        description: "Product name if readable on the label, else empty string",
      },
      caloriesPer100g: {
        type: "number",
        description: "Energy in kcal preferably per 100 g",
      },
      proteinPer100g: { type: "number", description: "Protein grams per 100 g" },
      carbsPer100g: {
        type: "number",
        description: "Carbohydrates grams per 100 g",
      },
      fatPer100g: { type: "number", description: "Fat grams per 100 g" },
      basis: {
        type: "string",
        enum: ["per_100g", "per_serving", "unknown"],
        description:
          "per_100g if values are for 100g; per_serving if only per portion; unknown otherwise",
      },
    },
    required: [
      "name",
      "caloriesPer100g",
      "proteinPer100g",
      "carbsPer100g",
      "fatPer100g",
      "basis",
    ],
  },
} as const;

export const LABEL_ANNOTATION_PROMPT = `Tu lis une photo d'étiquette nutritionnelle (souvent en français).
Extrais les valeurs nutritionnelles de préférence "pour 100 g".
Si seules des valeurs "par portion" existent, utilise-les et mets basis=per_serving.
Ne invente pas de chiffres : si une valeur est illisible, mets 0 et basis=unknown.
caloriesPer100g doit être en kcal (pas kJ).`;

interface MistralOcrResponse {
  document_annotation?: string | null;
  pages?: Array<{ markdown?: string }>;
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10) / 10;
}

function asBasis(value: unknown): LabelBasis {
  if (value === "per_100g" || value === "per_serving" || value === "unknown") {
    return value;
  }
  return "unknown";
}

export function parseLabelNutrition(raw: unknown): LabelNutrition {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    name: typeof obj.name === "string" ? obj.name.trim() : "",
    caloriesPer100g: asNumber(obj.caloriesPer100g),
    proteinPer100g: asNumber(obj.proteinPer100g),
    carbsPer100g: asNumber(obj.carbsPer100g),
    fatPer100g: asNumber(obj.fatPer100g),
    basis: asBasis(obj.basis),
  };
}

/** Call Mistral OCR with caller-provided API key. Never log the key. */
export async function extractLabelFromImage(params: {
  apiKey: string;
  imageDataUrl: string;
}): Promise<LabelNutrition> {
  const { apiKey, imageDataUrl } = params;
  if (!apiKey.trim()) {
    throw new Error("MISSING_API_KEY");
  }
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("INVALID_IMAGE");
  }

  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        image_url: imageDataUrl,
      },
      document_annotation_format: {
        type: "json_schema",
        json_schema: LABEL_NUTRITION_SCHEMA,
      },
      document_annotation_prompt: LABEL_ANNOTATION_PROMPT,
      include_image_base64: false,
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("INVALID_API_KEY");
  }
  if (!res.ok) {
    throw new Error(`MISTRAL_HTTP_${res.status}`);
  }

  const data = (await res.json()) as MistralOcrResponse;
  if (!data.document_annotation) {
    throw new Error("NO_ANNOTATION");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data.document_annotation);
  } catch {
    throw new Error("BAD_ANNOTATION_JSON");
  }

  return parseLabelNutrition(parsed);
}
