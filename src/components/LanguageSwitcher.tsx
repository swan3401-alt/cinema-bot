"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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

  function switchLocale(next: string) {
    const segments = pathname.split("/");
    segments[1] = next;

    // Preserve query string (seatIds, movieId, bookingIds, etc.)
    const query = searchParams.toString();
    const newPath = segments.join("/") + (query ? `?${query}` : "");

    router.replace(newPath);
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