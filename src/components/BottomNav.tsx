"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const homeActive = pathname === "/" || pathname.startsWith("/day");
  const settingsActive = pathname.startsWith("/settings");

  return (
    <nav className="bottom-nav" aria-label="Navigation">
      <Link href="/" data-active={homeActive}>
        {t("navCalendar")}
      </Link>
      <Link href="/settings" data-active={settingsActive}>
        {t("navSettings")}
      </Link>
    </nav>
  );
}
