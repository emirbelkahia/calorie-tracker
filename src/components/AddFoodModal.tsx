"use client";

import { useEffect, useState } from "react";
import type { OffFoodResult } from "@/lib/off";
import { scaleMacros } from "@/lib/off";
import {
  deleteCustomFood,
  listCustomFoods,
  upsertCustomFood,
} from "@/lib/db";
import type { CustomFood } from "@/lib/types";
import type { LabelNutrition } from "@/lib/mistral-label";
import { compressImageForOcr } from "@/lib/image-compress";
import { getMistralApiKey, hasMistralApiKey } from "@/lib/mistral-key";
import { useLocale } from "./LocaleProvider";
import { NumberField } from "./NumberField";

export interface FoodDraft {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  quantityG: number;
  offId?: string;
  saveAsCustom?: boolean;
}

type Tab = "search" | "manual" | "saved";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (draft: FoodDraft) => Promise<void>;
}

export function AddFoodModal({ open, onClose, onAdd }: Props) {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OffFoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OffFoodResult | null>(null);
  const [quantityG, setQuantityG] = useState(100);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [pickedCustom, setPickedCustom] = useState<CustomFood | null>(null);
  const [editingCustom, setEditingCustom] = useState<CustomFood | null>(null);
  const [manual, setManual] = useState({
    name: "",
    caloriesPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    saveAsCustom: true,
  });
  const [busy, setBusy] = useState(false);
  const [canUseLabelPhoto, setCanUseLabelPhoto] = useState(false);
  const [labelPreview, setLabelPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [labelWarning, setLabelWarning] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listCustomFoods().then(setCustomFoods);
    setCanUseLabelPhoto(hasMistralApiKey());
    setPickedCustom(null);
    setEditingCustom(null);
    setLabelPreview(null);
    setLabelWarning(null);
    setLabelError(null);
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "search") return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    // OFF: ~10 search req/min — avoid search-as-you-type
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/foods/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          products: OffFoodResult[];
          error?: string;
        };
        setResults(data.products ?? []);
        if (data.error) setError(t("searchUnavailable"));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(t("searchUnavailable"));
        }
      } finally {
        setSearching(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, tab, t]);

  async function confirmFromPer100(
    source: {
      name: string;
      caloriesPer100g: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
      offId?: string;
    },
    qty: number,
    saveAsCustom?: boolean,
  ) {
    setBusy(true);
    try {
      const macros = scaleMacros(source, qty);
      if (saveAsCustom) {
        await upsertCustomFood({
          name: source.name,
          caloriesPer100g: source.caloriesPer100g,
          proteinPer100g: source.proteinPer100g,
          carbsPer100g: source.carbsPer100g,
          fatPer100g: source.fatPer100g,
        });
      }
      await onAdd({
        name: source.name,
        ...macros,
        quantityG: qty,
        offId: source.offId,
      });
      onClose();
      setSelected(null);
      setQuery("");
      setResults([]);
      setLabelPreview(null);
      setLabelWarning(null);
      setLabelError(null);
    } finally {
      setBusy(false);
    }
  }

  async function onPickLabelPhoto(file: File | null) {
    if (!file) return;
    setLabelError(null);
    setLabelWarning(null);
    try {
      const dataUrl = await compressImageForOcr(file);
      setLabelPreview(dataUrl);
    } catch {
      setLabelError(t("labelExtractFailed"));
    }
  }

  async function onExtractLabel() {
    if (!labelPreview) return;
    const apiKey = getMistralApiKey();
    if (!apiKey) {
      setCanUseLabelPhoto(false);
      setLabelError(t("labelHint"));
      return;
    }
    setExtracting(true);
    setLabelError(null);
    setLabelWarning(null);
    try {
      const res = await fetch("/api/foods/from-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mistral-api-key": apiKey,
        },
        body: JSON.stringify({ imageDataUrl: labelPreview }),
      });
      const data = (await res.json()) as {
        label?: LabelNutrition;
        error?: string;
      };
      if (!res.ok || !data.label) {
        if (data.error === "invalid_api_key" || res.status === 401) {
          setLabelError(t("labelBadKey"));
        } else {
          setLabelError(t("labelExtractFailed"));
        }
        return;
      }
      const label = data.label;
      setManual((m) => ({
        ...m,
        name: label.name || m.name,
        caloriesPer100g: label.caloriesPer100g,
        proteinPer100g: label.proteinPer100g,
        carbsPer100g: label.carbsPer100g,
        fatPer100g: label.fatPer100g,
        saveAsCustom: true,
      }));
      if (label.basis !== "per_100g") {
        setLabelWarning(t("labelBasisWarning"));
      }
    } catch {
      setLabelError(t("labelExtractFailed"));
    } finally {
      setExtracting(false);
    }
  }

  async function saveCustomEdit() {
    if (!editingCustom?.id || !editingCustom.name.trim()) return;
    setBusy(true);
    try {
      await upsertCustomFood({
        id: editingCustom.id,
        name: editingCustom.name.trim(),
        caloriesPer100g: editingCustom.caloriesPer100g,
        proteinPer100g: editingCustom.proteinPer100g,
        carbsPer100g: editingCustom.carbsPer100g,
        fatPer100g: editingCustom.fatPer100g,
      });
      setCustomFoods(await listCustomFoods());
      setEditingCustom(null);
    } finally {
      setBusy(false);
    }
  }

  async function removeSavedFood() {
    if (!editingCustom?.id) return;
    const ok = window.confirm(
      t("deleteSavedFoodConfirm", { name: editingCustom.name }),
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteCustomFood(editingCustom.id);
      setCustomFoods(await listCustomFoods());
      setEditingCustom(null);
      setPickedCustom(null);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="display text-2xl">{t("addFoodTitle")}</h2>
          <button type="button" className="btn btn-ghost px-3" onClick={onClose}>
            {t("close")}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {(
            [
              ["search", "tabOff"],
              ["manual", "tabManual"],
              ["saved", "tabSaved"],
            ] as const
          ).map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              className={`btn ${tab === id ? "btn-primary" : "btn-ghost"} text-sm`}
              onClick={() => {
                setTab(id);
                setSelected(null);
                setPickedCustom(null);
                setEditingCustom(null);
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {tab === "search" && !selected && (
          <div className="flex flex-col gap-3">
            <div className="field">
              <label htmlFor="off-search">{t("searchLabel")}</label>
              <input
                id="off-search"
                value={query}
                placeholder={t("searchPlaceholder")}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            {searching && (
              <p className="text-sm text-[var(--ink-muted)]">{t("searching")}</p>
            )}
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <ul className="flex flex-col gap-2">
              {results.map((item) => (
                <li key={`${item.id}-${item.name}`}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-[var(--line)] bg-white p-3 text-left"
                    onClick={() => {
                      setSelected(item);
                      setQuantityG(100);
                    }}
                  >
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-[var(--ink-muted)]">
                      {item.brand ? `${item.brand} · ` : ""}
                      {item.caloriesPer100g} kcal / 100g · P{" "}
                      {item.proteinPer100g}g
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {query.trim().length >= 3 && !searching && results.length === 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setTab("manual");
                  setManual((m) => ({ ...m, name: query.trim() }));
                }}
              >
                {t("createManual", { q: query.trim() })}
              </button>
            )}
          </div>
        )}

        {tab === "search" && selected && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="text-left text-sm text-[var(--brand)]"
              onClick={() => setSelected(null)}
            >
              {t("back")}
            </button>
            <h3 className="font-semibold">{selected.name}</h3>
            <div className="field">
              <label htmlFor="qty">{t("quantityG")}</label>
              <NumberField
                id="qty"
                mode="decimal"
                min={1}
                value={quantityG}
                onValueChange={setQuantityG}
              />
            </div>
            <p className="text-sm text-[var(--ink-muted)]">
              ≈ {scaleMacros(selected, quantityG).calories} kcal · P{" "}
              {scaleMacros(selected, quantityG).proteinG}g
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || quantityG <= 0}
              onClick={() =>
                confirmFromPer100(
                  {
                    name: selected.name,
                    caloriesPer100g: selected.caloriesPer100g,
                    proteinPer100g: selected.proteinPer100g,
                    carbsPer100g: selected.carbsPer100g,
                    fatPer100g: selected.fatPer100g,
                    offId: selected.id,
                  },
                  quantityG,
                )
              }
            >
              {t("add")}
            </button>
          </div>
        )}

        {tab === "manual" && (
          <div className="flex flex-col gap-3">
            {canUseLabelPhoto && (
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-white p-3">
                {!labelPreview ? (
                  <label className="btn btn-secondary cursor-pointer">
                    {t("photoLabel")}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        onPickLabelPhoto(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={labelPreview}
                      alt=""
                      className="max-h-48 w-full rounded-lg object-contain bg-[var(--bg)]"
                    />
                    <div className="flex gap-2">
                      <label className="btn btn-ghost flex-1 cursor-pointer text-sm">
                        {t("changePhoto")}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) =>
                            onPickLabelPhoto(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary flex-1 text-sm"
                        disabled={extracting}
                        onClick={onExtractLabel}
                      >
                        {extracting ? t("extractingLabel") : t("extractLabel")}
                      </button>
                    </div>
                  </>
                )}
                {labelError && (
                  <p className="text-sm text-[var(--red)]">{labelError}</p>
                )}
                {labelWarning && (
                  <p className="text-sm text-[var(--yellow)]">{labelWarning}</p>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="m-name">{t("name")}</label>
              <input
                id="m-name"
                value={manual.name}
                onChange={(e) =>
                  setManual({ ...manual, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="m-kcal">{t("kcalPer100")}</label>
                <NumberField
                  id="m-kcal"
                  mode="decimal"
                  min={0}
                  value={manual.caloriesPer100g}
                  onValueChange={(caloriesPer100g) =>
                    setManual({ ...manual, caloriesPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="m-p">{t("proteinPer100")}</label>
                <NumberField
                  id="m-p"
                  mode="decimal"
                  min={0}
                  value={manual.proteinPer100g}
                  onValueChange={(proteinPer100g) =>
                    setManual({ ...manual, proteinPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="m-c">{t("carbsPer100")}</label>
                <NumberField
                  id="m-c"
                  mode="decimal"
                  min={0}
                  value={manual.carbsPer100g}
                  onValueChange={(carbsPer100g) =>
                    setManual({ ...manual, carbsPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="m-f">{t("fatPer100")}</label>
                <NumberField
                  id="m-f"
                  mode="decimal"
                  min={0}
                  value={manual.fatPer100g}
                  onValueChange={(fatPer100g) =>
                    setManual({ ...manual, fatPer100g })
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="m-qty">{t("quantityG")}</label>
              <NumberField
                id="m-qty"
                mode="decimal"
                min={1}
                value={quantityG}
                onValueChange={setQuantityG}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manual.saveAsCustom}
                onChange={(e) =>
                  setManual({ ...manual, saveAsCustom: e.target.checked })
                }
              />
              {t("keepInFoods")}
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !manual.name.trim() || quantityG <= 0}
              onClick={() =>
                confirmFromPer100(
                  {
                    name: manual.name.trim(),
                    caloriesPer100g: manual.caloriesPer100g,
                    proteinPer100g: manual.proteinPer100g,
                    carbsPer100g: manual.carbsPer100g,
                    fatPer100g: manual.fatPer100g,
                  },
                  quantityG,
                  manual.saveAsCustom,
                )
              }
            >
              {t("add")}
            </button>
          </div>
        )}

        {tab === "saved" && editingCustom && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="text-left text-sm text-[var(--brand)]"
              onClick={() => setEditingCustom(null)}
            >
              {t("back")}
            </button>
            <h3 className="font-semibold">{t("editFoodTitle")}</h3>
            <div className="field">
              <label htmlFor="e-name">{t("name")}</label>
              <input
                id="e-name"
                value={editingCustom.name}
                onChange={(e) =>
                  setEditingCustom({ ...editingCustom, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label htmlFor="e-kcal">{t("kcalPer100")}</label>
                <NumberField
                  id="e-kcal"
                  mode="decimal"
                  min={0}
                  value={editingCustom.caloriesPer100g}
                  onValueChange={(caloriesPer100g) =>
                    setEditingCustom({ ...editingCustom, caloriesPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="e-p">{t("proteinPer100")}</label>
                <NumberField
                  id="e-p"
                  mode="decimal"
                  min={0}
                  value={editingCustom.proteinPer100g}
                  onValueChange={(proteinPer100g) =>
                    setEditingCustom({ ...editingCustom, proteinPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="e-c">{t("carbsPer100")}</label>
                <NumberField
                  id="e-c"
                  mode="decimal"
                  min={0}
                  value={editingCustom.carbsPer100g}
                  onValueChange={(carbsPer100g) =>
                    setEditingCustom({ ...editingCustom, carbsPer100g })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="e-f">{t("fatPer100")}</label>
                <NumberField
                  id="e-f"
                  mode="decimal"
                  min={0}
                  value={editingCustom.fatPer100g}
                  onValueChange={(fatPer100g) =>
                    setEditingCustom({ ...editingCustom, fatPer100g })
                  }
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !editingCustom.name.trim()}
              onClick={saveCustomEdit}
            >
              {t("save")}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-[var(--red)]"
              disabled={busy}
              onClick={removeSavedFood}
            >
              {t("deleteSavedFood")}
            </button>
          </div>
        )}

        {tab === "saved" && !editingCustom && pickedCustom && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="text-left text-sm text-[var(--brand)]"
              onClick={() => setPickedCustom(null)}
            >
              {t("back")}
            </button>
            <h3 className="font-semibold">{pickedCustom.name}</h3>
            <div className="field">
              <label htmlFor="saved-qty">{t("quantityG")}</label>
              <NumberField
                id="saved-qty"
                mode="decimal"
                min={1}
                value={quantityG}
                onValueChange={setQuantityG}
              />
            </div>
            <p className="text-sm text-[var(--ink-muted)]">
              ≈ {scaleMacros(pickedCustom, quantityG).calories} kcal · P{" "}
              {scaleMacros(pickedCustom, quantityG).proteinG}g
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || quantityG <= 0}
              onClick={() =>
                confirmFromPer100(
                  {
                    name: pickedCustom.name,
                    caloriesPer100g: pickedCustom.caloriesPer100g,
                    proteinPer100g: pickedCustom.proteinPer100g,
                    carbsPer100g: pickedCustom.carbsPer100g,
                    fatPer100g: pickedCustom.fatPer100g,
                  },
                  quantityG,
                )
              }
            >
              {t("add")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingCustom({ ...pickedCustom });
                setPickedCustom(null);
              }}
            >
              {t("editFood")}
            </button>
          </div>
        )}

        {tab === "saved" && !editingCustom && !pickedCustom && (
          <ul className="flex flex-col gap-2">
            {customFoods.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">
                {t("noSavedFoods")}
              </p>
            )}
            {customFoods.map((food) => (
              <li
                key={food.id}
                className="flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-white"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 p-3 text-left"
                  onClick={() => {
                    setPickedCustom(food);
                    setQuantityG(100);
                  }}
                >
                  <div className="font-semibold">{food.name}</div>
                  <div className="text-sm text-[var(--ink-muted)]">
                    {food.caloriesPer100g} kcal / 100g
                  </div>
                </button>
                <button
                  type="button"
                  className="shrink-0 px-3 text-sm text-[var(--brand)]"
                  onClick={() => setEditingCustom({ ...food })}
                >
                  {t("editFood")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
