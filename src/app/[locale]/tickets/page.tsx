"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTelegram } from "@/hooks/useTelegram";

interface Ticket {
  token: string;
  status: "AWAITING_PAYMENT" | "PAID" | "USED";
  movieTitle: string;
  date: string;
  time: string;
  hall: string;
  row: number;
  number: number;
}

export default function TicketsPage() {
  const t = useTranslations();
  const { user, isReady } = useTelegram();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/my-tickets?telegramId=${user.id}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      setTickets([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isReady && user?.id) load();
  }, [isReady, user?.id, load]);

  async function cancel(token: string) {
    if (!user?.id) return;
    setBusy(token);
    setError(null);
    try {
      const res = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: user.id.toString(), token }),
      });
      const result = await res.json();
      if (result.ok) {
        setTickets((prev) => prev?.filter((x) => x.token !== token) ?? null);
      } else if (result.reason === "paid") {
        setNotified((prev) => new Set(prev).add(token));
      } else {
        setError(t("tickets.cancelError"));
        await load();
      }
    } catch {
      setError(t("tickets.cancelError"));
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const statusText: Record<string, string> = {
    AWAITING_PAYMENT: t("tickets.awaiting"),
    PAID: t("tickets.confirmed"),
    USED: t("tickets.used"),
  };

  if (!isReady || tickets === null) {
    return <main className="min-h-screen bg-gray-950 px-5 py-6 text-gray-300">{t("common.loading")}</main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 px-5 py-6">
      <h1 className="mb-5 text-2xl font-bold text-white">{t("tickets.title")}</h1>

      {tickets.length === 0 && <p className="text-gray-400">{t("tickets.empty")}</p>}

      <div className="flex flex-col gap-4">
        {tickets.map((tk) => {
          const dateStr = new Intl.DateTimeFormat(undefined, {
            day: "numeric", month: "long", year: "numeric",
          }).format(new Date(tk.date));

          return (
            <div key={tk.token} className="rounded-2xl border border-white/10 bg-gray-900/60 p-4">
              <span className="text-xs uppercase tracking-wide text-gray-400">{statusText[tk.status]}</span>
              <p className="mt-1 font-semibold text-white">{tk.movieTitle}</p>
              <p className="text-sm text-gray-300">{dateStr} · {tk.time}</p>
              <p className="text-sm text-gray-300">{tk.hall}</p>
              <p className="mb-3 text-sm text-gray-300">
                {t("booking.row")} {tk.row}, {t("booking.seat")} {tk.number}
              </p>

              {tk.status === "AWAITING_PAYMENT" &&
                (confirming === tk.token ? (
                  <button
                    onClick={() => cancel(tk.token)}
                    disabled={busy === tk.token}
                    className="w-full rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                  >
                    {busy === tk.token ? t("tickets.cancelling") : t("tickets.confirmCancel")}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirming(tk.token)}
                    className="w-full rounded-xl border border-red-500/40 py-2.5 font-medium text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    {t("tickets.cancel")}
                  </button>
                ))}

              {tk.status === "PAID" &&
                (notified.has(tk.token) ? (
                  <p className="text-sm text-yellow-300">{t("tickets.staffNotified")}</p>
                ) : (
                  <button
                    onClick={() => cancel(tk.token)}
                    disabled={busy === tk.token}
                    className="w-full rounded-xl border border-white/15 py-2.5 font-medium text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    {busy === tk.token ? t("tickets.cancelling") : t("tickets.requestCancel")}
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}