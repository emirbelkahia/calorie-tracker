const STORAGE_KEY = "calorie-tracker-mistral-api-key";

export function getMistralApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  return value.length > 0 ? value : null;
}

export function setMistralApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearMistralApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasMistralApiKey(): boolean {
  return getMistralApiKey() !== null;
}
