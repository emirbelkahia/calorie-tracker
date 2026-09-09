import { DAY_CLOSE_HOUR } from "./day-status";
import { toDateKey } from "./dates";
import type { MealType } from "./types";

/** Breakfast folds at 10:00, lunch at 16:00, dinner at 21:00 — today only. */
export function mealAutoCollapsed(
  journalDate: string,
  type: MealType,
  now: Date,
): boolean {
  if (type === "snack") return false;
  if (toDateKey(now) !== journalDate) return false;
  const hour = now.getHours();
  if (type === "breakfast") return hour >= 10;
  if (type === "lunch") return hour >= 16;
  if (type === "dinner") return hour >= DAY_CLOSE_HOUR;
  return false;
}
