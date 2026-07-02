"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

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

const USER_CACHE_KEY = "tg_user";
const INIT_DATA_CACHE_KEY = "tg_init_data";

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

interface TelegramState {
  user: TelegramUser | null;
  initData: string | null;
  isReady: boolean;
  isTelegram: boolean;
  close: () => void;
}

function useTelegramState(): TelegramState {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const close = useCallback(() => {
    (window as unknown as { Telegram?: { WebApp?: { close?: () => void } } })
      .Telegram?.WebApp?.close?.();
  }, []);

  useEffect(() => {
    // 1) Reuse a user captured earlier - localStorage (not sessionStorage) so
    // this survives a WebView being fully torn down and recreated
    // (backgrounding/low memory), not just a hard reload within the same
    // WebView session, including cases where the address bar lost the
    // #tgWebAppData hash - see src/lib/telegramNav.ts
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) setUser(JSON.parse(cached));
      const cachedInitData = localStorage.getItem(INIT_DATA_CACHE_KEY);
      if (cachedInitData) setInitData(cachedInitData);
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
          try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u)); } catch {}
          if (tg.initData) {
            setInitData(tg.initData);
            try { localStorage.setItem(INIT_DATA_CACHE_KEY, tg.initData); } catch {}
            // Convert this one-time initData into a persistent server-side
            // session (fire-and-forget) so identity survives later requests
            // even if a fresh, valid initData isn't available on them.
            fetch("/api/auth/telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ initData: tg.initData }),
            }).catch(() => {});
          }
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

  return { user, initData, isReady, isTelegram: user !== null, close };
}

const TelegramContext = createContext<TelegramState | null>(null);

// Mounted once in the root layout so every page shares a single polling
// instance instead of each page re-running its own ~10s discovery loop.
export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const state = useTelegramState();
  return (
    <TelegramContext.Provider value={state}>{children}</TelegramContext.Provider>
  );
}

export function useTelegram(): TelegramState {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    throw new Error("useTelegram must be used within a TelegramProvider");
  }
  return ctx;
}
