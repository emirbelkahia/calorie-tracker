import { NextResponse } from "next/server";
import { extractLabelFromImage } from "@/lib/mistral-label";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-mistral-api-key")?.trim() ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
  }

  let imageDataUrl = "";
  try {
    const body = (await request.json()) as { imageDataUrl?: string };
    imageDataUrl = body.imageDataUrl?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  // Soft size guard (~4MB base64 payload)
  if (imageDataUrl.length > 5_500_000) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  try {
    const label = await extractLabelFromImage({ apiKey, imageDataUrl });
    return NextResponse.json({ label });
  } catch (err) {
    const code = err instanceof Error ? err.message : "extract_failed";
    if (code === "INVALID_API_KEY") {
      return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
    }
    if (code === "NO_ANNOTATION" || code === "BAD_ANNOTATION_JSON") {
      return NextResponse.json({ error: "extract_failed" }, { status: 422 });
    }
    return NextResponse.json({ error: "extract_failed" }, { status: 502 });
  }
}
