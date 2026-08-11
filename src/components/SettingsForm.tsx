"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateBmr, calculateTdee, deriveTargets } from "@/lib/nutrition";
import {
  ensureProfile,
  exportBackup,
  importBackup,
  saveProfile,
} from "@/lib/db";
import type {
  ActivityLevel,
  BackupPayload,
  GoalMode,
  Profile,
  Sex,
} from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

type FormState = Omit<
  Profile,
  "id" | "dailyCalorieTarget" | "dailyProteinTargetG"
>;

const ACTIVITY_KEYS: Record<ActivityLevel, MessageKey> = {
  sedentary: "activitySedentary",
  light: "activityLight",
  moderate: "activityModerate",
  active: "activityActive",
  very_active: "activityVeryActive",
};

export function SettingsForm() {
  const { t, locale, setLocale } = useLocale();
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    ensureProfile().then((p) => {
      setForm({
        sex: p.sex,
        age: p.age,
        weightKg: p.weightKg,
        heightCm: p.heightCm,
        activity: p.activity,
        goalMode: p.goalMode,
        goalPercent: p.goalPercent,
        proteinGPerKg: p.proteinGPerKg,
      });
    });
  }, []);

  const preview = useMemo(() => {
    if (!form) return null;
    const bmr = calculateBmr(form.sex, form.weightKg, form.heightCm, form.age);
    const tdee = calculateTdee(bmr, form.activity);
    const targets = deriveTargets(form);
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      ...targets,
    };
  }, [form]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !preview) return;
    await saveProfile({
      ...form,
      dailyCalorieTarget: preview.dailyCalorieTarget,
      dailyProteinTargetG: preview.dailyProteinTargetG,
    });
    setSaved(true);
    setMessage(t("settingsSaved"));
    setTimeout(() => setSaved(false), 2000);
  }

  async function onExport() {
    const payload = await exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calorie-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(t("backupExported"));
  }

  async function onImport(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      await importBackup(payload);
      const p = await ensureProfile();
      setForm({
        sex: p.sex,
        age: p.age,
        weightKg: p.weightKg,
        heightCm: p.heightCm,
        activity: p.activity,
        goalMode: p.goalMode,
        goalPercent: p.goalPercent,
        proteinGPerKg: p.proteinGPerKg,
      });
      setMessage(t("backupImported"));
    } catch {
      setMessage(t("backupImportFail"));
    }
  }

  if (!form || !preview) {
    return <p className="text-[var(--ink-muted)]">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-2">
        <p className="text-sm uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {t("settings")}
        </p>
        <h1 className="display mt-1 text-3xl text-[var(--brand)]">
          {t("profile")}
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">{t("settingsIntro")}</p>
      </header>

      <form className="panel flex flex-col gap-4 p-4" onSubmit={onSave}>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="sex">{t("sex")}</label>
            <select
              id="sex"
              value={form.sex}
              onChange={(e) =>
                setForm({ ...form, sex: e.target.value as Sex })
              }
            >
              <option value="male">{t("male")}</option>
              <option value="female">{t("female")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="age">{t("age")}</label>
            <input
              id="age"
              type="number"
              min={15}
              max={100}
              value={form.age}
              onChange={(e) =>
                setForm({ ...form, age: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="weight">{t("weight")}</label>
            <input
              id="weight"
              type="number"
              min={30}
              max={250}
              step={0.1}
              value={form.weightKg}
              onChange={(e) =>
                setForm({ ...form, weightKg: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="height">{t("height")}</label>
            <input
              id="height"
              type="number"
              min={120}
              max={230}
              value={form.heightCm}
              onChange={(e) =>
                setForm({ ...form, heightCm: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="activity">{t("activity")}</label>
          <select
            id="activity"
            value={form.activity}
            onChange={(e) =>
              setForm({
                ...form,
                activity: e.target.value as ActivityLevel,
              })
            }
          >
            {(Object.keys(ACTIVITY_KEYS) as ActivityLevel[]).map((key) => (
              <option key={key} value={key}>
                {t(ACTIVITY_KEYS[key])}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="goalMode">{t("goal")}</label>
            <select
              id="goalMode"
              value={form.goalMode}
              onChange={(e) =>
                setForm({ ...form, goalMode: e.target.value as GoalMode })
              }
            >
              <option value="deficit">{t("deficit")}</option>
              <option value="maintain">{t("maintain")}</option>
              <option value="surplus">{t("surplus")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="goalPercent">{t("gapPercent")}</label>
            <input
              id="goalPercent"
              type="number"
              min={0}
              max={40}
              disabled={form.goalMode === "maintain"}
              value={form.goalPercent}
              onChange={(e) =>
                setForm({ ...form, goalPercent: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="protein">{t("proteinPerKg")}</label>
          <input
            id="protein"
            type="number"
            min={1.6}
            max={2}
            step={0.1}
            value={form.proteinGPerKg}
            onChange={(e) =>
              setForm({ ...form, proteinGPerKg: Number(e.target.value) })
            }
          />
        </div>

        <div className="rounded-xl bg-[var(--brand-soft)] p-4">
          <p className="text-sm text-[var(--ink-muted)]">
            {t("bmrTdee", { bmr: preview.bmr, tdee: preview.tdee })}
          </p>
          <p className="display mt-1 text-2xl text-[var(--brand)]">
            {t("dailyAllow", { n: preview.dailyCalorieTarget })}
          </p>
          <p className="mt-1 text-[var(--ink-muted)]">
            {t("proteinTarget", { n: preview.dailyProteinTargetG })}
          </p>
        </div>

        <button type="submit" className="btn btn-primary">
          {saved ? t("saved") : t("save")}
        </button>
      </form>

      <section className="panel flex flex-col gap-3 p-4">
        <h2 className="display text-lg">{t("language")}</h2>
        <p className="text-sm text-[var(--ink-muted)]">{t("languageHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`btn ${locale === "fr" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLocale("fr")}
          >
            Français
          </button>
          <button
            type="button"
            className={`btn ${locale === "en" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLocale("en")}
          >
            English
          </button>
        </div>
      </section>

      <section className="panel flex flex-col gap-3 p-4">
        <h2 className="display text-xl">{t("backup")}</h2>
        <p className="text-sm text-[var(--ink-muted)]">{t("backupHint")}</p>
        <button type="button" className="btn btn-secondary" onClick={onExport}>
          {t("export")}
        </button>
        <label className="btn btn-ghost cursor-pointer">
          {t("import")}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
        </label>
      </section>

      <section className="panel p-4 text-sm text-[var(--ink-muted)]">
        <h2 className="display mb-2 text-lg text-[var(--ink)]">
          {t("installTitle")}
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("install1")}</li>
          <li>{t("install2")}</li>
          <li>{t("install3")}</li>
        </ol>
      </section>

      {message && (
        <p className="text-center text-sm text-[var(--brand)]">{message}</p>
      )}
    </div>
  );
}
