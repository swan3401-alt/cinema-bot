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

const [instructions, setInstructions] = useState<{
    cardNumber: string;
    cardHolder: string;
    totalAmount: number;
  } | null>(null);

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

      setInstructions({
        cardNumber: payData.cardNumber,
        cardHolder: payData.cardHolder,
        totalAmount: payData.totalAmount,
      });
    } catch (err) {
      console.error(err);
      setError(t("booking.errorCreating"));
    } finally {
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



  if (instructions) {
    const amount = instructions.totalAmount.toLocaleString("en-US").replace(/,/g, " ");
    return (
      <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">
        <h1 className="text-white text-xl font-bold mb-6">{t("payment.title")}</h1>
        <div className="bg-gray-900 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-gray-300 text-sm">{t("payment.transferInstruction", { amount })}</p>
          <div className="flex flex-col gap-4">
            <div className="relative border border-gray-700 rounded-xl px-3 pt-4 pb-3">
              <span className="absolute -top-2.5 left-3 bg-gray-900 px-1 text-gray-500 text-xs">
                {t("payment.cardNumber")}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-white font-mono text-lg tracking-wider">{instructions.cardNumber}</span>
                <CopyButton text={instructions.cardNumber} />
              </div>
            </div>
            <div className="relative border border-gray-700 rounded-xl px-3 pt-4 pb-3">
              <span className="absolute -top-2.5 left-3 bg-gray-900 px-1 text-gray-500 text-xs">
                {t("payment.cardHolder")}
              </span>
              <span className="text-white">{instructions.cardHolder}</span>
            </div>
          </div>
          <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4">
            <p className="text-blue-200 text-sm">{t("payment.sendReceipt")}</p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium py-3 rounded-xl"
        >
          {t("success.backHome")}
        </button>
      </main>
    );
  }

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-gray-400 hover:text-white transition-colors"
      aria-label="Copy card number"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
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