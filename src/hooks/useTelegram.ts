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

export function useTelegram(): UseTelegramReturn {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // ~2 seconds at 100ms intervals

    const interval = setInterval(() => {
      const tg = (window as unknown as { Telegram?: { WebApp?: any } }).Telegram?.WebApp;
      attempts++;

      if (tg) {
        clearInterval(interval);
        tg.ready();
        tg.expand();
        setIsTelegram(true);

        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) setUser(telegramUser);

        setIsReady(true);
      } else if (attempts >= maxAttempts) {
        // Script never loaded — we're not inside Telegram
        clearInterval(interval);
        setIsReady(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return { user, isTelegram, isReady };
}