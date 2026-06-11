"use client";

import { usePathname } from "next/navigation";
import HomeButton from "./HomeButton";
import TicketsButton from "./TicketsButton";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const pathname = usePathname();

  const isHome = pathname.split("/").filter(Boolean).length === 1;

  const base = "flex justify-between items-center px-4 py-3 max-w-md mx-auto";
  const onHome =
    "fixed top-0 inset-x-0 z-50 bg-gray-950/30 backdrop-blur-xs border-b border-white/10";
  const elsewhere = "relative z-20";

  return (
    <div className={`${base} ${isHome ? onHome : elsewhere}`}>
      <div className="flex items-center gap-4">
        <HomeButton />
        <TicketsButton />
      </div>
      <LanguageSwitcher />
    </div>
  );
}