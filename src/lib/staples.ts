import { STAPLES, type StapleFood } from "@/data/staples";
import type { Locale } from "@/lib/i18n";
import type { OffFoodResult } from "@/lib/off";

const STAPLE_LIMIT = 12;

function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isStapleId(id: string): boolean {
  return id.startsWith("ciqual-");
}

export function stapleToSearchHit(
  staple: StapleFood,
  locale: Locale,
): OffFoodResult {
  return {
    id: staple.id,
    name: locale === "en" ? staple.nameEn : staple.nameFr,
    caloriesPer100g: staple.caloriesPer100g,
    proteinPer100g: staple.proteinPer100g,
    carbsPer100g: staple.carbsPer100g,
    fatPer100g: staple.fatPer100g,
  };
}

export function searchStaples(query: string, locale: Locale): OffFoodResult[] {
  const q = fold(query);
  if (q.length < 2) return [];

  const scored: { staple: StapleFood; score: number }[] = [];
  for (const staple of STAPLES) {
    const name = fold(locale === "en" ? staple.nameEn : staple.nameFr);
    const other = fold(locale === "en" ? staple.nameFr : staple.nameEn);
    const haystacks = [name, other, ...staple.aliases.map(fold)];
    let score = 0;
    for (const hay of haystacks) {
      if (hay.startsWith(q)) score = Math.max(score, 3);
      else if (hay.split(/[\s,/()-]+/).some((word) => word.startsWith(q)))
        score = Math.max(score, 2);
    }
    if (score > 0) scored.push({ staple, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score || a.staple.nameFr.localeCompare(b.staple.nameFr, "fr"),
  );
  return scored
    .slice(0, STAPLE_LIMIT)
    .map((row) => stapleToSearchHit(row.staple, locale));
}

export function mergeStaplesAndOff(
  staples: OffFoodResult[],
  off: OffFoodResult[],
): OffFoodResult[] {
  const seen = new Set(staples.map((item) => item.id));
  return [...staples, ...off.filter((item) => !seen.has(item.id))];
}
