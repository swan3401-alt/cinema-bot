"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const SUPPORTED_LOCALES = ["uz", "ru", "en"];

export default function TelegramLocaleSync() {
  const router = useRouter();
  const pathname = usePathname();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;

    const tg = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } };
    }).Telegram?.WebApp;

    // Only sync if there's a REAL Telegram user with a language code
    const langCode = tg?.initDataUnsafe?.user?.language_code;
    if (!langCode) {
      hasSynced.current = true; // mark done so manual switching works freely
      return;
    }

    const matched = SUPPORTED_LOCALES.includes(langCode) ? langCode : "uz";
    const segments = pathname.split("/");
    const currentLocale = segments[1];

    hasSynced.current = true;

    if (currentLocale !== matched) {
      segments[1] = matched;
      router.replace(segments.join("/"));
    }
  }, [pathname, router]);

  return null;
}