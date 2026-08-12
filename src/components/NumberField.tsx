"use client";

import { useEffect, useState } from "react";

interface NumberFieldProps {
  id: string;
  value: number;
  onValueChange: (value: number) => void;
  /** Integer keypad on iOS; use decimal for weight/protein. */
  mode?: "numeric" | "decimal";
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

/**
 * Mobile-friendly number input:
 * - iOS numeric/decimal keyboard via inputMode (type=number is flaky on Safari)
 * - Allows clearing the field without forcing a stuck "0"
 */
export function NumberField({
  id,
  value,
  onValueChange,
  mode = "numeric",
  min,
  max,
  disabled,
}: NumberFieldProps) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function parse(raw: string): number | null {
    const normalized = raw.replace(",", ".").trim();
    if (normalized === "" || normalized === "." || normalized === "-") {
      return null;
    }
    const n = Number(normalized);
    if (Number.isNaN(n)) return null;
    return n;
  }

  function allowed(raw: string): boolean {
    if (raw === "") return true;
    if (mode === "numeric") return /^\d*$/.test(raw);
    return /^\d*[.,]?\d*$/.test(raw);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode={mode}
      pattern={mode === "numeric" ? "[0-9]*" : undefined}
      enterKeyHint="done"
      autoComplete="off"
      disabled={disabled}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        if (!allowed(next)) return;
        setText(next);
        const n = parse(next);
        if (n !== null) onValueChange(n);
      }}
      onBlur={() => {
        const n = parse(text);
        if (n === null) {
          setText(String(value));
          return;
        }
        let clamped = n;
        if (typeof min === "number") clamped = Math.max(min, clamped);
        if (typeof max === "number") clamped = Math.min(max, clamped);
        setText(String(clamped));
        if (clamped !== value) onValueChange(clamped);
      }}
    />
  );
}
