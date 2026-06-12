"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect, useState, useTransition } from "react";

const locales = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useTelegram();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<string | null>(null);

  // Once the real locale catches up, clear the optimistic highlight
  useEffect(() => { setOptimistic(null); }, [locale]);

  // Warm the sibling-locale routes so switching is near-instant
  useEffect(() => {
    for (const { code } of locales) {
      if (code === locale) continue;
      const segs = pathname.split("/");
      segs[1] = code;
      router.prefetch(segs.join("/"));
    }
  }, [pathname, locale, router]);

  function switchLocale(next: string) {
    if (next === locale) return;
    setOptimistic(next);

    if (user?.id) {
      fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: user.id.toString(), locale: next, notify: true }),
      }).catch(() => {});
    }

    const segments = pathname.split("/");
    segments[1] = next;
    const query = searchParams.toString();
    const path = segments.join("/") + (query ? `?${query}` : "");
    startTransition(() => router.replace(path));
  }

  const active = optimistic ?? locale;

  return (
    <div className="flex gap-1">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            active === code
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}