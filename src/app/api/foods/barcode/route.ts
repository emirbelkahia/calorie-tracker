import { NextResponse } from "next/server";
import {
  getOpenFoodFactsProduct,
  isPlausibleBarcode,
  normalizeBarcode,
} from "@/lib/off";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = normalizeBarcode(searchParams.get("code") ?? "");
  if (!isPlausibleBarcode(code)) {
    return NextResponse.json(
      { error: "invalid_barcode", product: null },
      { status: 400 },
    );
  }

  try {
    const product = await getOpenFoodFactsProduct(code);
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json(
      { error: "lookup_failed", product: null },
      { status: 502 },
    );
  }
}
