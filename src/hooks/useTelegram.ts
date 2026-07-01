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
  initDataUnsafe?: { user?: TelegramUser };
}

const CACHE_KEY = "tg_user";


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
    const maxAttempts = 1000; // ~100s, for slow networks/devices

    const interval = setInterval(() => {
      const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
        .Telegram?.WebApp;
      attempts++;

      if (tg) {
        tg.ready();
        tg.expand();
        const u = tg.initDataUnsafe?.user;
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