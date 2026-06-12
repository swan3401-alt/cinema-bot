"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

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

  function switchLocale(next: string) {
    // Persist to the shared preference so the bot uses it too (fire-and-forget)
    if (user?.id) {
      fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: user.id.toString(), locale: next }),
      }).catch(() => {});
    }

    const segments = pathname.split("/");
    segments[1] = next;
    const query = searchParams.toString();
    router.replace(segments.join("/") + (query ? `?${query}` : ""));
  }

  return (
    <div className="flex gap-1">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
            locale === code
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