"use client";

import { useEffect, useRef, useState } from "react";
import { isPlausibleBarcode, normalizeBarcode } from "@/lib/off";
import { useLocale } from "./LocaleProvider";

interface Props {
  stream: MediaStream | null;
  cameraError: boolean;
  onDetected: (code: string) => void;
  onStop: () => void;
}

export function BarcodeScanner({
  stream,
  cameraError,
  onDetected,
  onStop,
}: Props) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [typed, setTyped] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [decodingPhoto, setDecodingPhoto] = useState(false);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.setAttribute("playsinline", "true");
    video.muted = true;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;

    (async () => {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      if (cancelled) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 300,
        tryPlayVideoTimeout: 8000,
      });
      controls = await reader.decodeFromStream(stream, video, (result) => {
        if (!result || cancelled) return;
        const code = normalizeBarcode(result.getText());
        if (!isPlausibleBarcode(code)) return;
        cancelled = true;
        controls?.stop();
        onDetectedRef.current(code);
      });
    })().catch(() => {
      /* live decode failed — photo / typed entry still work */
    });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [stream]);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    setDecodingPhoto(true);
    try {
      const url = URL.createObjectURL(file);
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
          await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);
        const result = await reader.decodeFromImageUrl(url);
        const code = normalizeBarcode(result.getText());
        if (!isPlausibleBarcode(code)) {
          setPhotoError(t("barcodeInvalid"));
          return;
        }
        onDetected(code);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setPhotoError(t("barcodePhotoFailed"));
    } finally {
      setDecodingPhoto(false);
    }
  }

  function submitTyped() {
    const code = normalizeBarcode(typed);
    if (!isPlausibleBarcode(code)) {
      setPhotoError(t("barcodeInvalid"));
      return;
    }
    onDetected(code);
  }

  return (
    <div className="flex flex-col gap-3">
      {stream ? (
        <video
          ref={videoRef}
          className="barcode-video"
          playsInline
          muted
          autoPlay
        />
      ) : null}
      {cameraError && (
        <p className="text-sm text-[var(--ink-muted)]">{t("cameraDenied")}</p>
      )}
      <p className="text-sm text-[var(--ink-muted)]">{t("scanHint")}</p>
      <div className="flex gap-2">
        <label className="btn btn-secondary flex-1 cursor-pointer text-sm">
          {decodingPhoto ? t("scanningBarcode") : t("scanPhoto")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={decodingPhoto}
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" className="btn btn-ghost flex-1" onClick={onStop}>
          {t("stopScan")}
        </button>
      </div>
      <div className="field">
        <label htmlFor="barcode-typed">{t("scanTypeLabel")}</label>
        <input
          id="barcode-typed"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("scanTypePlaceholder")}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!typed.trim()}
        onClick={submitTyped}
      >
        {t("lookUp")}
      </button>
      {photoError && <p className="text-sm text-[var(--red)]">{photoError}</p>}
    </div>
  );
}
