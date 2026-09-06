import { useEffect, useState } from "react";

/** Local clock that refreshes when the PWA comes back to the foreground. */
export function useAppClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(id);
    };
  }, []);

  return now;
}
