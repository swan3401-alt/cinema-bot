"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import QRTicket from "@/components/QRTicket";

interface BookingInfo {
  id: string;
  token: string;
  status: string;
  seat: { row: number; number: number; type: string };
  movie: { title: string; date: string; time: string; hall: string };
}

type PageStatus = "verifying" | "paid" | "pending" | "error";

export default function SuccessPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const bookingIds = params.get("bookingIds") ?? "";

  const [pageStatus, setPageStatus] = useState<PageStatus>("verifying");
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [pollCount, setPollCount] = useState(0);

  const MAX_POLLS = 10;
  const POLL_INTERVAL = 3000;

  const checkStatus = useCallback(async () => {
    if (!bookingIds) return;

    try {
      const res = await fetch(`/api/booking/status?bookingIds=${bookingIds}`);
      const data = await res.json();

      if (!res.ok) {
        setPageStatus("error");
        return;
      }

      if (data.status === "PAID") {
        setBookings(data.bookings);
        setPageStatus("paid");
      } else if (data.status === "CANCELLED") {
        setPageStatus("error");
      } else {
        setPageStatus("pending");
      }
    } catch {
      setPageStatus("error");
    }
  }, [bookingIds]);

  // Poll until paid or max attempts reached
  // useEffect(() => {
  //   if (pageStatus === "paid" || pageStatus === "error") return;
  //   if (pollCount >= MAX_POLLS) {
  //     setPageStatus("pending");
  //     return;
  //   }

  //   const timer = setTimeout(async () => {
  //     await checkStatus();
  //     setPollCount((c) => c + 1);
  //   }, pollCount === 0 ? 0 : POLL_INTERVAL);

  //   return () => clearTimeout(timer);
  // }, [pollCount, pageStatus, checkStatus]);

  const maxPollsReached = useRef(false);

  // Poll until paid or max attempts reached
  useEffect(() => {
    if (pageStatus === "paid" || pageStatus === "error") return;
    if (maxPollsReached.current) return;

    const timer = setTimeout(async () => {
      await checkStatus();
      setPollCount((c) => {
        const nextCount = c + 1;
        if (nextCount >= MAX_POLLS) {
          maxPollsReached.current = true;
          setPageStatus("pending");
        }
        return nextCount;
      });
    }, pollCount === 0 ? 0 : POLL_INTERVAL);

  return () => clearTimeout(timer);
}, [pollCount, pageStatus, checkStatus]);

  if (!bookingIds) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">{t("common.error")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 pt-6 pb-10 max-w-md mx-auto">

      {/* Verifying state */}
      {(pageStatus === "verifying" || pageStatus === "pending") && (
        <div className="flex flex-col items-center gap-4 pt-20">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent
                          rounded-full animate-spin" />
          <p className="text-white font-medium">
            {pageStatus === "verifying"
              ? t("success.verifying")
              : t("success.paymentPending")}
          </p>
          {pageStatus === "pending" && (
            <button
              onClick={() => router.push(`/${locale}`)}
              className="mt-4 text-gray-400 hover:text-white text-sm transition-colors"
            >
              {t("success.backHome")}
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {pageStatus === "error" && (
        <div className="flex flex-col items-center gap-4 pt-20">
          <div className="w-12 h-12 bg-red-900/40 rounded-full flex items-center justify-center">
            <span className="text-red-400 text-2xl">✕</span>
          </div>
          <p className="text-white font-medium">{t("common.error")}</p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="mt-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {t("success.backHome")}
          </button>
        </div>
      )}

      {/* Paid state */}
      {pageStatus === "paid" && bookings.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Success header */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-14 h-14 bg-green-900/40 rounded-full flex items-center justify-center">
              <span className="text-green-400 text-3xl">✓</span>
            </div>
            <h1 className="text-white text-xl font-bold">{t("success.title")}</h1>
            <p className="text-gray-400 text-sm text-center">{t("success.subtitle")}</p>
          </div>

          {/* One QR ticket per booking */}
          {bookings.map((booking) => (
            <QRTicket key={booking.id} booking={booking} locale={locale} />
          ))}

          <button
            onClick={() => router.push(`/${locale}`)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-gray-300
                       font-medium py-3 rounded-xl transition-colors"
          >
            {t("success.backHome")}
          </button>
        </div>
      )}

    </main>
  );
}