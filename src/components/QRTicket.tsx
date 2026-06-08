"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { generateQRCodeDataURL } from "@/lib/qrcode";

interface Seat {
  row: number;
  number: number;
  type: string;
}

interface BookingInfo {
  id: string;
  token: string;
  seat: Seat;
  movie: {
    title: string;
    date: string;
    time: string;
    hall: string;
  };
}

interface Props {
  booking: BookingInfo;
  locale: string;
}

export default function QRTicket({ booking, locale }: Props) {
  const t = useTranslations();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateQRCodeDataURL(booking.token).then(setQrDataUrl);
  }, [booking.token]);

  const formattedDate = new Date(booking.movie.date).toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleDownload() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `ticket-${booking.id}.png`;
    link.click();
  }

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Ticket header */}
      <div className="bg-blue-600 px-5 py-4">
        <p className="text-white font-bold text-lg">{booking.movie.title}</p>
        <p className="text-blue-200 text-sm mt-0.5">{formattedDate} · {booking.movie.time}</p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center py-6 bg-white">
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt="QR ticket"
            width={200}
            height={200}
          />
        ) : (
          <div className="w-[200px] h-[200px] bg-gray-100 animate-pulse rounded-lg" />
        )}
      </div>

      {/* Ticket details */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <TicketRow label={t("booking.hall")} value={booking.movie.hall} />
        <TicketRow
          label={t("booking.row")}
          value={`${booking.seat.row}`}
        />
        <TicketRow
          label={t("booking.seat")}
          value={`${booking.seat.number}${booking.seat.type === "WIDE" ? ` · ${t("seats.wide")}` : ""}`}
        />
        <div className="border-t border-gray-800 pt-3">
          <p className="text-gray-600 text-xs text-center font-mono">{booking.token}</p>
        </div>
      </div>

      {/* Download button */}
      <div className="px-5 pb-5">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50
                     text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {t("success.downloadTicket")}
        </button>
      </div>
    </div>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}