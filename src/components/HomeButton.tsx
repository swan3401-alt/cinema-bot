"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { withTgHash } from "@/lib/telegramNav";

export default function HomeButton() {
  const locale = useLocale();
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(withTgHash(`/${locale}`))}
      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-lg font-medium"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
      Home
    </button>
  );
}