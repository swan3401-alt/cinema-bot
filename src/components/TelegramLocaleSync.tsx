"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const SUPPORTED_LOCALES = ["uz", "ru", "en"];

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: {
      language_code?: string;
    };
  };
};

export default function TelegramLocaleSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tg = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    if (!tg) return;

    const langCode = tg.initDataUnsafe?.user?.language_code ?? "uz";
    const matched = SUPPORTED_LOCALES.includes(langCode) ? langCode : "uz";

    const segments = pathname.split("/");
    const currentLocale = segments[1];

    if (currentLocale !== matched) {
      segments[1] = matched;
      router.replace(segments.join("/"));
    }
  }, [pathname, router]);

  return null;
}