"use client";

import { useEffect, useRef, useState } from "react";
import { isPlausibleBarcode, normalizeBarcode } from "@/lib/off";
import { useLocale } from "./LocaleProvider";

interface Props {
  stream: MediaStream | null;
  cameraError: boolean;
  confirmed: boolean;
  onDetected: (code: string) => void;
  onStop: () => void;
}

export function BarcodeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="1.5" height="12" rx="0.4" />
      <rect x="4" y="3" width="1" height="12" rx="0.4" />
      <rect x="6.2" y="3" width="2" height="12" rx="0.4" />
      <rect x="9.2" y="3" width="1" height="12" rx="0.4" />
      <rect x="11.2" y="3" width="1.5" height="12" rx="0.4" />
      <rect x="13.5" y="3" width="1" height="12" rx="0.4" />
      <rect x="15.5" y="3" width="1.5" height="12" rx="0.4" />
    </svg>
  );
}

export function BarcodeScanner({
  stream,
  cameraError,
  confirmed,
  onDetected,
  onStop,
}: Props) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [decodingPhoto, setDecodingPhoto] = useState(false);

  useEffect(() => {
    if (!stream || !videoRef.current || confirmed) return;
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
      /* live decode failed — photo fallback still works */
    });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [stream, confirmed]);

  async function onPickPhoto(file: File | null) {
    if (!file || confirmed) return;
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

  return (
    <div className="flex flex-col gap-3">
      {stream ? (
        <div className="barcode-preview">
          <video
            ref={videoRef}
            className="barcode-video"
            playsInline
            muted
            autoPlay
          />
          {confirmed && (
            <div className="barcode-hit">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M7.5 12.5 10.4 15.5 16.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("scanHit")}
            </div>
          )}
        </div>
      ) : confirmed ? (
        <div className="barcode-preview barcode-preview-still">
          <div className="barcode-hit">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M7.5 12.5 10.4 15.5 16.5 8.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("scanHit")}
          </div>
        </div>
      ) : null}
      {cameraError && (
        <p className="text-sm text-[var(--ink-muted)]">{t("cameraDenied")}</p>
      )}
      <div className="flex gap-2">
        <label className="btn btn-secondary flex-1 cursor-pointer text-sm">
          {decodingPhoto ? t("scanningBarcode") : t("scanPhoto")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={decodingPhoto || confirmed}
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost flex-1"
          disabled={confirmed}
          onClick={onStop}
        >
          {t("stopScan")}
        </button>
      </div>
      {photoError && <p className="text-sm text-[var(--red)]">{photoError}</p>}
    </div>
  );
}
