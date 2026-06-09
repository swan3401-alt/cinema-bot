"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

import { useTelegram } from "@/hooks/useTelegram";

export default function ConfirmPage() {
  const { user, isTelegram, isReady } = useTelegram();

  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const seatIds = params.get("seatIds")?.split(",") ?? [];
  const movieId = params.get("movieId") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);

  const telegramId = user?.id?.toString() ?? "preview_user";

  // Fetch price from DB on mount
  useEffect(() => {
    if (!movieId) return;
    fetch(`/api/movie/price?movieId=${movieId}`)
      .then((res) => res.json())
      .then((data) => setPrice(data.price))
      .catch(() => setError(t("common.error")));
  }, [movieId, t]);


  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  async function handlePayment() {
    setLoading(true);
    setError(null);

    try {
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds, movieId, telegramId, locale }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 409) {
          setError(t("booking.seatAlreadyBooked"));
          setTimeout(() => router.push(`/${locale}/booking`), 3000);
          return;
        }
        throw new Error(createData.error);
      }

      const payRes = await fetch("/api/booking/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingIds: createData.bookingIds }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      setRedirectUrl(payData.paymentUrl);
    } catch (err) {
      console.error(err);
      setError(t("booking.errorCreating"));
      setLoading(false);
    }
  }

  if (seatIds.length === 0 || !movieId) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-400">{t("common.error")}</p>
      </main>
    );
  }

  const totalAmount = price !== null ? price * seatIds.length : null;
  const formattedTotal = totalAmount !== null
    ? `${totalAmount.toLocaleString("en-US").replace(/,/g, " ")} UZS`
    : t("common.loading");

  return (
    <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">
      <h1 className="text-white text-xl font-bold mb-6">{t("booking.orderSummary")}</h1>

      <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
        <Row label={t("booking.seats")} value={seatIds.length.toString()} />
        <div className="border-t border-gray-800" />
        <Row
          label={t("booking.totalAmount")}
          value={formattedTotal}
          bold
        />
      </div>

      {error && (
        <div className="mt-4 bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* <button
        onClick={handlePayment}
        disabled={loading || price === null}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
                   disabled:text-gray-500 text-white font-semibold py-4 rounded-xl
                   transition-colors text-lg"
      >
        {loading ? t("common.loading") : t("booking.proceedToPayment")}
      </button> */}

      <button
        onClick={handlePayment}
        disabled={loading || price === null || !isReady}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
                  disabled:text-gray-500 text-white font-semibold py-4 rounded-xl
                  transition-colors text-lg"
      >
        {loading ? t("common.loading") : t("booking.proceedToPayment")}
      </button>

    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm ${bold ? "text-white font-bold text-base" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}