"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

/** The page scroller. Each route starts at its top, like a document would. */
export function AppScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div ref={ref} className="app-scroll">
      {children}
    </div>
  );
}
