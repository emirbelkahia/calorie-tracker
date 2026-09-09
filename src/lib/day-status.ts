import { toDateKey } from "./dates";
import type { DayColor, DayTotals, Profile } from "./types";

/** Same hour as dinner auto-collapse: after this, under-target is judged. */
export const DAY_CLOSE_HOUR = 21;

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

/** Today before 21:00 — under-target is expected; past days are always closed. */
export function isDayOpen(date: string, now: Date): boolean {
  return toDateKey(now) === date && now.getHours() < DAY_CLOSE_HOUR;
}

export function dayColor(
  totals: DayTotals | null | undefined,
  profile: Profile | null | undefined,
  ctx?: { date: string; now: Date },
): DayColor {
  if (!totals || totals.entryCount === 0 || !profile) return "gray";
  const stillOpen = ctx ? isDayOpen(ctx.date, ctx.now) : false;
  if (stillOpen) {
    const target = profile.dailyCalorieTarget;
    if (target <= 0) return "green";
    const ratio = totals.calories / target;
    if (ratio > 1.1) return "red";
    if (ratio > 1.0) return "yellow";
    return "green";
  }
  const cal = calorieStatus(totals.calories, profile.dailyCalorieTarget);
  const pro = proteinStatus(
    totals.proteinG,
    profile.weightKg,
    profile.proteinGPerKg,
  );
  return worst(cal, pro);
}

export type DayStatusKind =
  | "empty"
  | "inProgress"
  | "ok"
  | "limit"
  | "offTarget";

export function dayStatusKind(
  color: DayColor,
  stillOpen: boolean,
): DayStatusKind {
  if (color === "gray") return "empty";
  if (stillOpen && color === "green") return "inProgress";
  if (color === "green") return "ok";
  if (color === "yellow") return "limit";
  return "offTarget";
}

export const DAY_COLOR_HEX: Record<DayColor, string> = {
  green: "#2F6F4E",
  yellow: "#C9A227",
  red: "#B42318",
  gray: "#C5CBC7",
};
