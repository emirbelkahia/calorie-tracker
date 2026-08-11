import { NextResponse } from "next/server";
import { searchOpenFoodFacts } from "@/lib/off";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchOpenFoodFacts(q);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Recherche indisponible", products: [] },
      { status: 502 },
    );
  }
}
