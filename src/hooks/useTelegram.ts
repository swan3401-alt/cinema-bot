"use client";

import { useCallback, useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: { user?: TelegramUser };
}

const CACHE_KEY = "tg_user";

// initDataUnsafe.user is occasionally empty even though the raw initData
// string is populated (seen on some Android WebView versions) - parse the
// raw query string as a fallback instead of relying solely on the SDK's parsing.
function extractUser(tg: TelegramWebApp): TelegramUser | undefined {
  if (tg.initDataUnsafe?.user) return tg.initDataUnsafe.user;
  if (!tg.initData) return undefined;
  try {
    const raw = new URLSearchParams(tg.initData).get("user");
    return raw ? (JSON.parse(raw) as TelegramUser) : undefined;
  } catch {
    return undefined;
  }
}


export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const close = useCallback(() => {
    (window as unknown as { Telegram?: { WebApp?: { close?: () => void } } })
      .Telegram?.WebApp?.close?.();
  }, []);

  useEffect(() => {
    // 1) Reuse a user captured earlier this session (survives hard reloads)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) setUser(JSON.parse(cached));
    } catch {}

    let attempts = 0;
    const maxAttempts = 100; // ~10s, for slow networks/devices

    const interval = setInterval(() => {
      const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
        .Telegram?.WebApp;
      attempts++;

      if (tg) {
        tg.ready();
        tg.expand();
        const u = extractUser(tg);
        if (u) {
          setUser(u);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(u)); } catch {}
          clearInterval(interval);
          setIsReady(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsReady(true); // gave up; user stays whatever the cache gave (maybe null)
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsReady(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return { user, isReady, isTelegram: user !== null, close };
}