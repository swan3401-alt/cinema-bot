"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Seat, SeatStatus } from "@/types";
import { SeatRow } from "@/lib/seatLayout";
import { withTgHash } from "@/lib/telegramNav";
import SeatButton from "./SeatButton";

interface Props { rows: SeatRow[]; price: number; sessionId: string; }

export default function SeatMap({ rows, price, sessionId }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);

  function getStatus(seat: Seat): SeatStatus {
    if (seat.isBooked) return "booked";
    if (selectedSeats.some((s) => s.id === seat.id)) return "selected";
    return "available";
  }

  function handleSelect(seat: Seat) {
    setSelectedSeats((prev) => {
      const isAlreadySelected = prev.some((s) => s.id === seat.id);
      return isAlreadySelected
        ? prev.filter((s) => s.id !== seat.id)
        : [...prev, seat];
    });
  }

  function handleConfirm() {
    if (selectedSeats.length === 0) return;
    const seatIds = selectedSeats.map((s) => s.id).join(",");
    router.push(withTgHash(`/${locale}/booking/confirm?seatIds=${seatIds}&sessionId=${sessionId}`));
  }

  const totalPrice = price * selectedSeats.length;
  const formattedTotal = totalPrice.toLocaleString("en-US").replace(/,/g, " ");

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-10">

    <div className="w-full overflow-x-auto scrollbar-themed pb-2">
    <div className="flex flex-col gap-2 min-w-max mx-auto w-fit px-2">




      {/* Screen indicator */}
      <div className="w-full max-w-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full opacity-60" />
        <p className="text-center text-gray-500 text-xs mt-1 tracking-widest uppercase">
          screen
        </p>
      </div>

      {/* Seat grid - scrollable on mobile, centered on desktop */}
      <div className="w-full overflow-x-auto">
        <div className="flex flex-col gap-2 min-w-max mx-auto w-fit px-2">
          {rows.map(({ row, seats }) => (
            <div key={row} className="flex items-center gap-1.5">
              <span className="text-gray-600 text-xs w-4 text-right shrink-0">
                {row}
              </span>
              <div className="flex gap-1">
                {seats.map((seat, idx) =>
                  seat === null ? (
                    <div key={`gap-${idx}`} className="w-8 h-7" />
                  ) : (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      status={getStatus(seat)}
                      onSelect={handleSelect}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    
    </div>
    </div>



      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        {/* <LegendItem color="bg-gray-700 border border-gray-600" label={t("seats.available")} />
        <LegendItem color="bg-blue-600 border border-blue-400" label={t("seats.selected")} />
        <LegendItem color="bg-gray-800 border border-gray-700 opacity-40" label={t("seats.booked")} /> */}
        <LegendItem color="bg-indigo-700 border border-blue-400" label={t("seats.available")} />
        <LegendItem color="bg-green-500 border border-green-300" label={t("seats.selected")} />
        <LegendItem color="bg-gray-800 border border-gray-700 opacity-40" label={t("seats.booked")} />
      </div>




      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {selectedSeats.length > 0 ? (
              <>
                <p className="text-gray-400 text-xs truncate">
                  {t("seats.seatsSelected", { count: selectedSeats.length })}
                </p>
                <p className="text-white font-bold text-lg">
                  {formattedTotal} UZS
                </p>
                {/* Selected seat labels */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full"
                    >
                      R{s.row}·{s.number}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">{t("seats.noSeatSelected")}</p>
            )}
          </div>
          <button
            onClick={handleConfirm}
            disabled={selectedSeats.length === 0}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
                       disabled:text-gray-600 text-white font-semibold px-6 py-3
                       rounded-xl transition-colors"
          >
            {t("seats.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-3.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}