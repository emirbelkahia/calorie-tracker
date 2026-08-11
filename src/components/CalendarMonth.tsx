"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  monthGrid,
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/dates";
import { dayColor, DAY_COLOR_HEX } from "@/lib/day-status";
import { ensureProfile, getMonthTotals } from "@/lib/db";
import type { DayColor, DayTotals, Profile } from "@/lib/types";
import Link from "next/link";
import { useLocale } from "./LocaleProvider";

function statusLabel(
  color: DayColor,
  t: (key: "empty" | "ok" | "limit" | "offTarget") => string,
) {
  if (color === "gray") return t("empty");
  if (color === "green") return t("ok");
  if (color === "yellow") return t("limit");
  return t("offTarget");
}

export function CalendarMonth() {
  const { t, locale } = useLocale();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totals, setTotals] = useState<Record<string, DayTotals>>({});
  const [selected, setSelected] = useState(toDateKey(new Date()));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await ensureProfile();
      const monthTotals = await getMonthTotals(
        cursor.getFullYear(),
        cursor.getMonth(),
      );
      if (!cancelled) {
        setProfile(p);
        setTotals(monthTotals);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cursor]);

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const today = toDateKey(new Date());
  const selectedTotals = totals[selected];
  const selectedColor: DayColor = dayColor(selectedTotals, profile);
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";

  const monthLabel = cursor.toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {t("brand")}
          </p>
          <h1 className="display mt-1 text-3xl capitalize text-[var(--brand)]">
            {monthLabel}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost px-3"
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-ghost px-3"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            ›
          </button>
        </div>
      </header>

      <section className="panel p-4">
        <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-[var(--ink-muted)]">
          {WEEKDAY_LABELS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((key, i) => {
            if (!key) return <div key={`empty-${i}`} />;
            const color = dayColor(totals[key], profile);
            const dayNum = Number(key.slice(-2));
            return (
              <button
                key={key}
                type="button"
                className="day-dot"
                data-color={color}
                data-today={key === today}
                aria-label={`${key}, ${color}`}
                onClick={() => setSelected(key)}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-4">
        {!ready || !profile ? (
          <p className="text-[var(--ink-muted)]">{t("loading")}</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="display text-xl capitalize">
                {new Date(selected + "T12:00:00").toLocaleDateString(
                  dateLocale,
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
              </h2>
              <span
                className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                style={{ background: DAY_COLOR_HEX[selectedColor] }}
              >
                {statusLabel(selectedColor, t)}
              </span>
            </div>

            <div className="macro-row">
              <div className="macro-chip">
                <strong>
                  {selectedTotals ? Math.round(selectedTotals.calories) : 0}
                </strong>
                <span>/ {profile.dailyCalorieTarget} kcal</span>
              </div>
              <div className="macro-chip">
                <strong>
                  {selectedTotals ? Math.round(selectedTotals.proteinG) : 0}
                </strong>
                <span>/ {profile.dailyProteinTargetG} g P</span>
              </div>
              <div className="macro-chip">
                <strong>
                  {selectedTotals ? Math.round(selectedTotals.carbsG) : 0}
                </strong>
                <span>g C</span>
              </div>
              <div className="macro-chip">
                <strong>
                  {selectedTotals ? Math.round(selectedTotals.fatG) : 0}
                </strong>
                <span>g F</span>
              </div>
            </div>

            <Link
              href={`/day/${selected}`}
              className="btn btn-primary mt-4 w-full"
            >
              {t("openJournal")}
            </Link>
          </>
        )}
      </section>

      <p className="text-center text-xs text-[var(--ink-muted)]">
        {t("calendarHint")}
      </p>
    </div>
  );
}
