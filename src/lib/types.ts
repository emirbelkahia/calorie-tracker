export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type DayColor = "green" | "yellow" | "red" | "gray";

export type GoalMode = "deficit" | "maintain" | "surplus";

export interface Profile {
  id: 1;
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goalMode: GoalMode;
  /** Percent for deficit/surplus (ignored for maintain). */
  goalPercent: number;
  /** Target protein grams per kg bodyweight (1.6–2.0). */
  proteinGPerKg: number;
  dailyCalorieTarget: number;
  dailyProteinTargetG: number;
}

export interface Meal {
  id?: number;
  date: string;
  type: MealType;
  name: string;
  sortOrder: number;
}

export interface FoodEntry {
  id?: number;
  mealId: number;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  quantityG: number;
  offId?: string;
}

export interface CustomFood {
  id?: number;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface DayTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  entryCount: number;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  meals: Meal[];
  foodEntries: FoodEntry[];
  customFoods: CustomFood[];
}
