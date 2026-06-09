import { prisma } from "@/lib/prisma";
import { PENDING_TTL_MINUTES } from "@/lib/constants";
import { BookingStatus } from '@prisma/client';

/** A seat is taken if it has a PAID/USED booking, or a PENDING booking within the TTL. */
export function activeBookingFilter() {
  const cutoff = new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000);
  return {
    OR: [
      // { status: { in: ["PAID", "USED"] as const } },
      // { status: { in: ["PAID", "USED"] as BookingStatus[] } },
      { status: { in: [BookingStatus.PAID, BookingStatus.USED] } },
      { status: "PENDING" as const, createdAt: { gte: cutoff } },
    ],
  };
}

/** Mark abandoned PENDING bookings (older than TTL) as EXPIRED. Returns count. */
export async function sweepExpiredBookings(seatIds?: string[]): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000);
  const result = await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      ...(seatIds ? { seatId: { in: seatIds } } : {}),
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

/** Returns the set of seat IDs that are currently taken, from a given list. */
export async function getTakenSeatIds(seatIds: string[]): Promise<Set<string>> {
  const active = await prisma.booking.findMany({
    where: { seatId: { in: seatIds }, ...activeBookingFilter() },
    select: { seatId: true },
  });
  return new Set(active.map((b) => b.seatId));
}