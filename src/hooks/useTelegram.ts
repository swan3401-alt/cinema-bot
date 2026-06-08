"use client";

import { useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface UseTelegramReturn {
  user: TelegramUser | null;
  isTelegram: boolean;
  isReady: boolean;
}

interface TelegramWebApp {
  ready: () => void;
  expand?: () => void;
  initDataUnsafe?: { user?: TelegramUser };
}

interface WindowWithTelegram extends Window {
  Telegram?: { WebApp?: TelegramWebApp };
}

export function useTelegram(): UseTelegramReturn {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = (window as WindowWithTelegram).Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand?.();

      const telegramUser = tg.initDataUnsafe?.user;
      Promise.resolve().then(() => {
        setIsTelegram(true);

        if (telegramUser) {
          setUser(telegramUser);
        }

        setIsReady(true);
      });
    } else {
      Promise.resolve().then(() => setIsReady(true));
    }
  }, []);

  return { user, isTelegram, isReady };
}