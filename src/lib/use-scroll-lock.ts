import { useEffect } from "react";

/** Stop the page behind a modal from scrolling (iOS PWA included). */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const scroller = document.querySelector<HTMLElement>(".app-scroll");
    if (!scroller) return;
    const prevOverflow = scroller.style.overflow;
    scroller.style.overflow = "hidden";
    return () => {
      scroller.style.overflow = prevOverflow;
    };
  }, [locked]);
}
