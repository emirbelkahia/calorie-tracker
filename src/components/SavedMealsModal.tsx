"use client";

import { useEffect, useRef, useState } from "react";
import {
  applySavedMeal,
  deleteSavedMeal,
  listSavedMeals,
  saveMealAsTemplate,
} from "@/lib/db";
import type { SavedMeal } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { useScrollLock } from "@/lib/use-scroll-lock";

interface Props {
  open: boolean;
  onClose: () => void;
  mealId: number;
  mealTitle: string;
  canSave: boolean;
  onApplied: () => Promise<void>;
}

function mealKcal(meal: SavedMeal): number {
  return meal.items.reduce((sum, item) => sum + item.calories, 0);
}

export function SavedMealsModal({
  open,
  onClose,
  mealId,
  mealTitle,
  canSave,
  onApplied,
}: Props) {
  const { t } = useLocale();
  const [templates, setTemplates] = useState<SavedMeal[]>([]);
  const [name, setName] = useState(mealTitle);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [hiding, setHiding] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  useScrollLock(open && !hiding);

  useEffect(() => {
    let cancelled = false;
    listSavedMeals().then((list) => {
      if (!cancelled) setTemplates(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = backdropRef.current;
    if (!node) return;
    const onMove = (event: TouchEvent) => {
      if (event.target === node) event.preventDefault();
    };
    node.addEventListener("touchmove", onMove, { passive: false });
    return () => node.removeEventListener("touchmove", onMove);
  }, [open]);

  async function reloadTemplates() {
    setTemplates(await listSavedMeals());
  }

  function requestClose() {
    if (hiding) return;
    setHiding(true);
    window.setTimeout(onClose, 350);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!canSave || !trimmed || busy) return;
    setBusy(true);
    try {
      await saveMealAsTemplate(mealId, trimmed);
      await reloadTemplates();
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function handleApply(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await applySavedMeal(mealId, id);
      await onApplied();
      requestClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(meal: SavedMeal) {
    if (!meal.id) return;
    const ok = window.confirm(
      t("deleteSavedMealConfirm", { name: meal.name }),
    );
    if (!ok) return;
    await deleteSavedMeal(meal.id);
    await reloadTemplates();
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      style={hiding ? { opacity: 0 } : undefined}
    >
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="display text-2xl">{t("savedMeals")}</h2>
          <button
            type="button"
            className="btn btn-ghost px-3"
            onClick={requestClose}
          >
            {t("close")}
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4">
          <div className="field">
            <label htmlFor="saved-meal-name">{t("savedMealName")}</label>
            <input
              id="saved-meal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {!canSave && (
            <p className="text-sm text-[var(--ink-muted)]">
              {t("cannotSaveEmptyMeal")}
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canSave || !name.trim() || busy}
            onClick={handleSave}
          >
            {savedFlash ? t("mealTemplateSaved") : t("saveThisMeal")}
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {templates.length === 0 && (
            <p className="text-sm text-[var(--ink-muted)]">
              {t("noSavedMeals")}
            </p>
          )}
          {templates.map((meal) => (
            <li
              key={meal.id}
              className="flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-white"
            >
              <button
                type="button"
                className="min-w-0 flex-1 p-3 text-left"
                disabled={busy || meal.items.length === 0}
                onClick={() => meal.id != null && handleApply(meal.id)}
              >
                <div className="font-semibold">{meal.name}</div>
                <div className="text-sm text-[var(--ink-muted)]">
                  {t("savedMealMeta", {
                    n: meal.items.length,
                    kcal: Math.round(mealKcal(meal)),
                  })}
                </div>
                <div className="mt-1 text-sm text-[var(--brand)]">
                  {t("applyMeal")}
                </div>
              </button>
              <button
                type="button"
                className="shrink-0 px-3 text-sm text-[var(--red)]"
                onClick={() => handleDelete(meal)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
