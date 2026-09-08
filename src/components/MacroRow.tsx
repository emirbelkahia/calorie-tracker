"use client";

import { calorieStatus, proteinStatus } from "@/lib/day-status";
import { effectiveCarbFatTargets } from "@/lib/nutrition";
import type { DayColor, Profile } from "@/lib/types";

interface MacroChipProps {
  value: number;
  label: string;
  target?: number;
  tone?: DayColor;
}

export function MacroChip({ value, label, target, tone }: MacroChipProps) {
  const ratio = target && target > 0 ? value / target : 0;
  const fill = Math.min(100, Math.max(0, ratio * 100));
  const showGauge = typeof target === "number" && target > 0;

  return (
    <div
      className="macro-chip"
      data-gauge={showGauge ? "true" : "false"}
      data-tone={showGauge ? tone : undefined}
    >
      {showGauge && (
        <div className="macro-chip-fill" style={{ height: `${fill}%` }} />
      )}
      <strong>{Math.round(value)}</strong>
      <span>
        {showGauge ? `/ ${Math.round(target)} ` : ""}
        {label}
      </span>
    </div>
  );
}

interface MacroRowProps {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  profile: Profile;
  labels: {
    kcal: string;
    prot: string;
    carbo: string;
    fat: string;
  };
}

export function MacroRow({
  calories,
  proteinG,
  carbsG,
  fatG,
  profile,
  labels,
}: MacroRowProps) {
  const calTone = calorieStatus(calories, profile.dailyCalorieTarget);
  const proTone = proteinStatus(
    proteinG,
    profile.weightKg,
    profile.proteinGPerKg,
  );
  const { dailyCarbsTargetG, dailyFatTargetG } =
    effectiveCarbFatTargets(profile);
  const carbTone = calorieStatus(carbsG, dailyCarbsTargetG);
  const fatTone = calorieStatus(fatG, dailyFatTargetG);

  return (
    <section className="macro-row">
      <MacroChip
        value={calories}
        target={profile.dailyCalorieTarget}
        label={labels.kcal}
        tone={calTone}
      />
      <MacroChip
        value={proteinG}
        target={profile.dailyProteinTargetG}
        label={labels.prot}
        tone={proTone}
      />
      <MacroChip
        value={carbsG}
        target={dailyCarbsTargetG}
        label={labels.carbo}
        tone={carbTone}
      />
      <MacroChip
        value={fatG}
        target={dailyFatTargetG}
        label={labels.fat}
        tone={fatTone}
      />
    </section>
  );
}
