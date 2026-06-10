"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTelegram } from "@/hooks/useTelegram";

interface Ticket {
  token: string;
  status: string;
  movieTitle: string;
  date: string;
  time: string;
  hall: string;
  row: number;
  number: number;
}

export default function TicketsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { user, isReady } = useTelegram();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const telegramId = user?.id?.toString() ?? "preview_user";
    fetch(`/api/my-tickets?telegramId=${telegramId}`)
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets ?? []))
      .catch(() => setTickets([]));
  }, [isReady, user]);

  const statusStyles: Record<string, string> = {
    AWAITING_PAYMENT: "bg-yellow-900/40 text-yellow-300",
    PAID: "bg-green-900/40 text-green-300",
    USED: "bg-gray-800 text-gray-400",
  };
  const statusKey: Record<string, string> = {
    AWAITING_PAYMENT: "tickets.awaiting",
    PAID: "tickets.confirmed",
    USED: "tickets.used",
  };

  return (
    <main className="min-h-screen bg-gray-950 px-4 pt-4 pb-10 max-w-md mx-auto">
      <h1 className="text-white text-xl font-bold mb-4">{t("tickets.title")}</h1>

      {tickets === null ? (
        <p className="text-gray-500">{t("common.loading")}</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">{t("tickets.empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((tk) => {
            const dateStr = new Date(tk.date).toLocaleDateString(locale, {
              day: "numeric", month: "long", year: "numeric",
            });
            return (
              <div key={tk.token} className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-white font-semibold">{tk.movieTitle}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[tk.status] ?? ""}`}>
                    {t(statusKey[tk.status] ?? "tickets.confirmed")}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{dateStr} · {tk.time}</p>
                <p className="text-gray-400 text-sm">
                  {tk.hall} · {t("booking.row")} {tk.row}, {t("booking.seat")} {tk.number}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}