"use client";

import { Seat, SeatStatus } from "@/types";

interface Props {
  seat: Seat;
  status: SeatStatus;
  onSelect: (seat: Seat) => void;
}

const statusStyles: Record<SeatStatus, string> = {
  available: "bg-gray-700 hover:bg-blue-500 cursor-pointer border border-gray-600",
  selected:  "bg-blue-600 cursor-pointer border border-blue-400",
  booked:    "bg-gray-800 cursor-not-allowed border border-gray-700 opacity-40",
};

export default function SeatButton({ seat, status, onSelect }: Props) {
  const isWide = seat.type === "WIDE";

  return (
    <button
      disabled={status === "booked"}
      onClick={() => onSelect(seat)}
      title={`Row ${seat.row}, Seat ${seat.number}`}
      className={`
        rounded-md transition-colors duration-150
        ${isWide ? "w-10 h-8" : "w-8 h-7"}
        ${statusStyles[status]}
      `}
    />
  );
}