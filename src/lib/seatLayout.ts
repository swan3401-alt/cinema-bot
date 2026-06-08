import { Seat } from "@/types";

export interface SeatRow {
  row: number;
  seats: (Seat | null)[];  // null = intentional gap
}

export function buildSeatLayout(seats: Seat[]): SeatRow[] {
  const rowMap = new Map<number, Map<number, Seat>>();

  for (const seat of seats) {
    if (!rowMap.has(seat.row)) rowMap.set(seat.row, new Map());
    rowMap.get(seat.row)!.set(seat.number, seat);
  }

  const rows: SeatRow[] = [];
  const sortedRowNums = Array.from(rowMap.keys()).sort((a, b) => a - b);

  for (const rowNum of sortedRowNums) {
    const seatMap = rowMap.get(rowNum)!;

    // Find the max column number to determine row width
    const maxCol = Math.max(...Array.from(seatMap.keys()));

    const seats: (Seat | null)[] = [];
    for (let col = 1; col <= maxCol; col++) {
      seats.push(seatMap.get(col) ?? null); // null = gap
    }

    rows.push({ row: rowNum, seats });
  }

  return rows;
}