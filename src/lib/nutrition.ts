import type { ActivityLevel, GoalMode, Profile, Sex } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire",
  light: "Léger (1–3j/sem)",
  moderate: "Modéré (3–5j/sem)",
  active: "Actif (6–7j/sem)",
  very_active: "Très actif",
};

/** Mifflin–St Jeor BMR (kcal/day). */
export function calculateBmr(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

export function calculateCalorieTarget(
  tdee: number,
  goalMode: GoalMode,
  goalPercent: number,
): number {
  const pct = Math.max(0, Math.min(50, goalPercent)) / 100;
  if (goalMode === "deficit") return tdee * (1 - pct);
  if (goalMode === "surplus") return tdee * (1 + pct);
  return tdee;
}

export function calculateProteinTargetG(
  weightKg: number,
  proteinGPerKg: number,
): number {
  return weightKg * proteinGPerKg;
}

export function deriveTargets(
  input: Pick<
    Profile,
    | "sex"
    | "age"
    | "weightKg"
    | "heightCm"
    | "activity"
    | "goalMode"
    | "goalPercent"
    | "proteinGPerKg"
  >,
): Pick<Profile, "dailyCalorieTarget" | "dailyProteinTargetG"> {
  const bmr = calculateBmr(
    input.sex,
    input.weightKg,
    input.heightCm,
    input.age,
  );
  const tdee = calculateTdee(bmr, input.activity);
  return {
    dailyCalorieTarget: Math.round(
      calculateCalorieTarget(tdee, input.goalMode, input.goalPercent),
    ),
    dailyProteinTargetG: Math.round(
      calculateProteinTargetG(input.weightKg, input.proteinGPerKg),
    ),
  };
}

export const DEFAULT_PROFILE_INPUT = {
  sex: "male" as Sex,
  age: 30,
  weightKg: 75,
  heightCm: 175,
  activity: "moderate" as ActivityLevel,
  goalMode: "deficit" as GoalMode,
  goalPercent: 15,
  proteinGPerKg: 1.8,
};

export function buildDefaultProfile(): Profile {
  const targets = deriveTargets(DEFAULT_PROFILE_INPUT);
  return {
    id: 1,
    ...DEFAULT_PROFILE_INPUT,
    ...targets,
  };
}
