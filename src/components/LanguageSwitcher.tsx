// "use client";

// import { useLocale } from "next-intl";
// import { useRouter, usePathname, useSearchParams } from "next/navigation";
// import { useTelegram } from "@/hooks/useTelegram";
// import { useEffect, useState, useTransition } from "react";

// const locales = [
//   { code: "uz", label: "UZ" },
//   { code: "ru", label: "RU" },
//   { code: "en", label: "EN" },
// ];

// export default function LanguageSwitcher() {
//   const locale = useLocale();
//   const router = useRouter();
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   const { user } = useTelegram();
//   const [, startTransition] = useTransition();
//   const [optimistic, setOptimistic] = useState<string | null>(null);

//   // Once the real locale catches up, clear the optimistic highlight
//   useEffect(() => { setOptimistic(null); }, [locale]);

//   // Warm the sibling-locale routes so switching is near-instant
//   useEffect(() => {
//     for (const { code } of locales) {
//       if (code === locale) continue;
//       const segs = pathname.split("/");
//       segs[1] = code;
//       router.prefetch(segs.join("/"));
//     }
//   }, [pathname, locale, router]);

//   function switchLocale(next: string) {
//     if (next === locale) return;
//     setOptimistic(next);

//     if (user?.id) {
//       fetch("/api/user/locale", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ telegramId: user.id.toString(), locale: next, notify: true }),
//       }).catch(() => {});
//     }

//     const segments = pathname.split("/");
//     segments[1] = next;
//     const query = searchParams.toString();
//     const path = segments.join("/") + (query ? `?${query}` : "");
//     startTransition(() => router.replace(path));
//   }

//   const active = optimistic ?? locale;

//   return (
//     <div className="flex gap-1">
//       {locales.map(({ code, label }) => (
//         <button
//           key={code}
//           onClick={() => switchLocale(code)}
//           className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${
//             active === code
//               ? "bg-blue-600 text-white"
//               : "bg-gray-800 text-gray-400 hover:text-white"
//           }`}
//         >
//           {label}
//         </button>
//       ))}
//     </div>
//   );
// }

"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect, useState, useTransition, useRef } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLocale = optimistic ?? locale;
  const currentLabel = locales.find((l) => l.code === activeLocale)?.label || "EN";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear optimistic state when real locale updates
  useEffect(() => {
    setOptimistic(null);
  }, [locale]);

  // Warm sibling routes
  useEffect(() => {
    for (const { code } of locales) {
      if (code === locale) continue;
      const segs = pathname.split("/");
      segs[1] = code;
      router.prefetch(segs.join("/"));
    }
  }, [pathname, locale, router]);

  function switchLocale(next: string) {
    if (next === locale) {
      setIsOpen(false);
      return;
    }

    setOptimistic(next);
    setIsOpen(false);

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-base font-semibold 
                   bg-gray-800/50 text-gray-400 hover:bg-gray-700 transition-colors"
      >
        {currentLabel}
        <span className="text-xs opacity-70">▼</span>
        {/* <span className="text-xs opacity-70">⌄</span> */}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-28 bg-gray-900/80 backdrop-blur-md border border-gray-700/70 rounded-xl py-0 shadow-xl z-50">
          {locales.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              className={`w-full px-4 py-2 text-left text-base font-semibold transition-colors rounded-xl
                ${activeLocale === code
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }
                `}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}