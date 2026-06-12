"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

const SUPPORTED = ["uz", "ru", "en"];
const SYNC_KEY = "tg_locale_synced";

export default function TelegramLocaleSync() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isReady } = useTelegram();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !isReady) return;
    if (sessionStorage.getItem(SYNC_KEY)) { done.current = true; return; }
    if (!user?.id) return; // wait until the Telegram user is actually available

    done.current = true;
    sessionStorage.setItem(SYNC_KEY, "1");

    const telegramId = user.id.toString();
    const fallback = SUPPORTED.includes(user.language_code ?? "")
      ? (user.language_code as string)
      : "uz";

    (async () => {
      let target = fallback;
      try {
        const res = await fetch(`/api/user/locale?telegramId=${telegramId}`);
        const data = await res.json();
        if (data.locale && SUPPORTED.includes(data.locale)) {
          target = data.locale; // stored preference wins
        } else {
          // first time ever — seed the preference from Telegram's language
          fetch("/api/user/locale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId, locale: fallback }),
          }).catch(() => {});
        }
      } catch {}

      const segments = pathname.split("/");
      if (segments[1] !== target) {
        segments[1] = target;
        router.replace(segments.join("/"));
      }
    })();
  }, [isReady, user, pathname, router]);

  return null;
}