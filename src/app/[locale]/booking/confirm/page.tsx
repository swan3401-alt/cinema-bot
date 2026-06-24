"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useTelegram } from "@/hooks/useTelegram";
import BackButton from "@/components/BackButton";

interface SeatInfo {
  id: string;
  row: number;
  number: number;
  type: "WIDE" | "STANDARD";
}

interface SessionSummary {
  movieTitle: string;
  date: string;
  time: string;
  hall: string;
  price: number;
  seats: SeatInfo[];
}

export default function ConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations();
  const locale = useLocale();
  const { user, isReady, isTelegram, close } = useTelegram();

  const sessionId = params.get("sessionId") ?? "";
  const seatIds = useMemo(
    () => (params.get("seatIds") ?? "").split(",").filter(Boolean),
    [params]
  );

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{
    cardNumber: string;
    cardHolder: string;
    totalAmount: number;
  } | null>(null);

  // Load session summary (price, title, seat labels) for the order overview
  useEffect(() => {
    if (!sessionId || seatIds.length === 0) return;
    (async () => {
      try {
        const res = await fetch(`/api/booking/seats?sessionId=${sessionId}`);
        if (!res.ok) {
          setError(t("booking.errorCreating"));
          return;
        }
        const data = await res.json();
        setSummary({
          movieTitle: data.movieTitle,
          date: data.date,
          time: data.time,
          hall: data.hall,
          price: data.price,
          seats: (data.seats as SeatInfo[]).filter((s) => seatIds.includes(s.id)),
        });
      } catch {
        setError(t("booking.errorCreating"));
      }
    })();
  }, [sessionId, seatIds, t]);

  async function handlePayment() {
    // Never file a booking under a placeholder - require a real Telegram user
    if (!user?.id) {
      setError(t("booking.openViaBot"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatIds,
          sessionId,
          telegramId: user.id.toString(),
          locale,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 409) {
          setError(t("booking.seatAlreadyBooked"));
          setTimeout(() => router.push(`/${locale}/booking?sessionId=${sessionId}`), 3000);
          return;
        }
        if (createRes.status === 410) {
          setError(t("booking.errorCreating"));
          setTimeout(() => router.push(`/${locale}`), 3000);
          return;
        }
        throw new Error(createData.error);
      }

      const payRes = await fetch("/api/booking/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingIds: createData.bookingIds, locale }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      setInstructions({
        cardNumber: payData.cardNumber,
        cardHolder: payData.cardHolder,
        totalAmount: payData.amount ?? payData.totalAmount,
      });
    } catch (err) {
      console.error(err);
      setError(t("booking.errorCreating"));
    } finally {
      setLoading(false);
    }
  }

  // Missing/invalid params
  if (!sessionId || seatIds.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">
        <BackButton href={`/${locale}`} />
        <p className="text-gray-400">{t("booking.errorCreating")}</p>
      </main>
    );
  }

  // ---- Payment instructions view (after "Proceed") ----
  if (instructions) {
    const amount = instructions.totalAmount.toLocaleString("en-US").replace(/,/g, " ");
    return (
      <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">
        <h1 className="text-white text-xl font-bold mb-6">{t("payment.title")}</h1>

        <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-gray-300 text-sm">
            {t("payment.transferInstruction", { amount })}
          </p>

          <div className="bg-gray-950 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">{t("payment.cardNumber")}</span>
              <span className="text-white font-mono text-lg tracking-wider">
                {instructions.cardNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">{t("payment.cardHolder")}</span>
              <span className="text-white">{instructions.cardHolder}</span>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4">
            <p className="text-blue-200 text-sm">{t("payment.sendReceipt")}</p>
          </div>
        </div>

        <button
          onClick={() => router.push(`/${locale}`)}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {t("success.backHome")}
        </button>

        {isTelegram && (
          <button
            onClick={close}
            className="mt-3 w-full rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 font-medium py-3 transition-colors"
          >
            {t("common.close")}
          </button>
        )}
      </main>
    );
  }

  // ---- Order summary view ----
  const total = summary ? summary.price * seatIds.length : 0;
  const formattedTotal = total.toLocaleString("en-US").replace(/,/g, " ");
  const formattedDate = summary
    ? new Date(summary.date).toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const seatLabels = summary
    ? summary.seats
        .slice()
        .sort((a, b) => a.row - b.row || a.number - b.number)
        .map((s) => `${s.row}·${s.number}`)
        .join(", ")
    : "";

  return (
    <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">
      <BackButton href={`/${locale}/booking?sessionId=${sessionId}`} />
      <h1 className="text-white text-xl font-bold mb-6">{t("booking.orderSummary")}</h1>

      {!summary ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
          <Row label={t("booking.movie")} value={`${summary.movieTitle} · ${summary.time}`} />
          <Row label={t("booking.date")} value={formattedDate} />
          <Row label={t("booking.hall")} value={summary.hall} />
          <Row label={t("booking.seats")} value={seatLabels} />

          <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
            <span className="text-gray-400 text-sm">{t("booking.totalAmount")}</span>
            <span className="text-white text-xl font-bold">{formattedTotal} UZS</span>
          </div>
        </div>
      )}

      {isReady && !user?.id && (
        <p className="mt-4 text-center text-sm text-yellow-300">{t("booking.openViaBot")}</p>
      )}

      {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

      <button
        onClick={handlePayment}
        disabled={loading || !summary || !user?.id}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500
                   text-white font-semibold py-4 rounded-xl transition-colors"
      >
        {loading ? t("common.loading") : t("booking.proceedToPayment")}
      </button>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  );
}