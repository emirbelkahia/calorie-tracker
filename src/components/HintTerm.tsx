"use client";

import { useEffect, useId, useRef, useState } from "react";

interface Props {
  term: string;
  value: number;
  hint: string;
}

export function HintTerm({ term, value, hint }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="hint-term">
      <button
        type="button"
        className="hint-term-trigger"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          const pointerType = (event.nativeEvent as PointerEvent).pointerType;
          if (pointerType === "mouse") return;
          setOpen((current) => !current);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
      >
        {term} {value}
      </button>
      {open && (
        <span id={id} role="tooltip" className="hint-term-bubble">
          {hint}
        </span>
      )}
    </span>
  );
}
