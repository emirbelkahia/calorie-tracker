import type { DayColor, DayTotals, Profile } from "./types";

const PROTEIN_FLOOR_G_PER_KG = 1.6;

function worst(a: DayColor, b: DayColor): DayColor {
  const rank: Record<DayColor, number> = {
    gray: 0,
    green: 1,
    yellow: 2,
    red: 3,
  };
  return rank[a] >= rank[b] ? a : b;
}

/** Calorie band vs daily target (plan thresholds). */
export function calorieStatus(
  calories: number,
  target: number,
): Exclude<DayColor, "gray"> {
  if (target <= 0) return "yellow";
  const ratio = calories / target;
  if (ratio >= 0.9 && ratio <= 1.0) return "green";
  if ((ratio >= 0.75 && ratio < 0.9) || (ratio > 1.0 && ratio <= 1.1)) {
    return "yellow";
  }
  return "red";
}

/** Protein status vs g/kg floor and user target. */
export function proteinStatus(
  proteinG: number,
  weightKg: number,
  proteinGPerKg: number,
): Exclude<DayColor, "gray"> {
  if (weightKg <= 0) return "yellow";
  const perKg = proteinG / weightKg;
  if (perKg >= proteinGPerKg) return "green";
  if (perKg >= PROTEIN_FLOOR_G_PER_KG) return "yellow";
  return "red";
}

export function dayColor(
  totals: DayTotals | null | undefined,
  profile: Profile | null | undefined,
): DayColor {
  if (!totals || totals.entryCount === 0 || !profile) return "gray";
  const cal = calorieStatus(totals.calories, profile.dailyCalorieTarget);
  const pro = proteinStatus(
    totals.proteinG,
    profile.weightKg,
    profile.proteinGPerKg,
  );
  return worst(cal, pro);
}

export const DAY_COLOR_HEX: Record<DayColor, string> = {
  green: "#2F6F4E",
  yellow: "#C9A227",
  red: "#B42318",
  gray: "#C5CBC7",
};
