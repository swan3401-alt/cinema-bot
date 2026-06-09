"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const SUPPORTED_LOCALES = ["uz", "ru", "en"];
const SYNC_KEY = "tg_locale_synced";

export default function TelegramLocaleSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only ever sync once per session
    if (sessionStorage.getItem(SYNC_KEY)) return;

    const tg = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } };
    }).Telegram?.WebApp;

    const langCode = tg?.initDataUnsafe?.user?.language_code;

    // Mark synced regardless, so manual switching is never overridden again
    sessionStorage.setItem(SYNC_KEY, "1");

    if (!langCode) return;

    const matched = SUPPORTED_LOCALES.includes(langCode) ? langCode : "uz";
    const segments = pathname.split("/");

    if (segments[1] !== matched) {
      segments[1] = matched;
      router.replace(segments.join("/"));
    }
  }, [pathname, router]);

  return null;
}