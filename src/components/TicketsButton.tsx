"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export default function TicketsButton() {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/${locale}/tickets`)}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" />
        <path d="M13 11v2" />
        <path d="M13 17v2" />
      </svg>
      {t("tickets.nav")}
    </button>
  );
}