"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function BackButton({ href }: { href: string }) {
  const router = useRouter();
  const t = useTranslations();

  return (
    <button
      onClick={() => router.push(href)}
      className="mb-4 flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-base font-medium text-lg"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {t("common.back")}
    </button>
  );
}