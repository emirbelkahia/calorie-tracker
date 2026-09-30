import { useEffect } from "react";

/** Stop the page behind a modal from scrolling (iOS PWA included). */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const scroller = document.querySelector<HTMLElement>(".app-scroll");
    const prevScrollerOverflow = scroller?.style.overflow ?? "";
    if (scroller) scroller.style.overflow = "hidden";
    const html = document.documentElement;
    const { body } = document;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
      width: body.style.width,
    };
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      if (scroller) scroller.style.overflow = prevScrollerOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
