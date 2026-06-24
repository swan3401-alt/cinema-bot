import { prisma } from "@/lib/prisma";
import { PENDING_TTL_MINUTES } from "@/lib/constants";
import { BookingStatus } from '@prisma/client';
import {AWAITING_PAYMENT_TTL_MINUTES } from "@/lib/constants"

function pendingCutoff() {
  return new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000);
}
function awaitingCutoff() {
  return new Date(Date.now() - AWAITING_PAYMENT_TTL_MINUTES * 60 * 1000);
}

/** A seat is taken if it has a PAID/USED booking, or a PENDING booking within the TTL. */
export function activeBookingFilter() {
  return {
    OR: [
      { status: { in: [BookingStatus.PAID, BookingStatus.USED] } },
      { status: BookingStatus.PENDING, createdAt: { gte: pendingCutoff() } },
      { status: BookingStatus.AWAITING_PAYMENT, createdAt: { gte: awaitingCutoff() } },
    ],
  };
}

/** Mark abandoned PENDING bookings (older than TTL) as EXPIRED. Returns count. */
export async function sweepExpiredBookings(seatIds?: string[]): Promise<number> {
  const seatFilter = seatIds ? { seatId: { in: seatIds } } : {};
  const [pending, awaiting] = await prisma.$transaction([
    prisma.booking.updateMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: pendingCutoff() }, ...seatFilter },
      data: { status: BookingStatus.EXPIRED },
    }),
    prisma.booking.updateMany({
      where: { status: BookingStatus.AWAITING_PAYMENT, createdAt: { lt: awaitingCutoff() }, ...seatFilter },
      data: { status: BookingStatus.EXPIRED },
    }),
  ]);
  return pending.count + awaiting.count;
}

/** Returns the set of seat IDs that are currently taken, from a given list. */
export async function getTakenSeatIds(seatIds: string[], sessionId: string): Promise<Set<string>> {
  const active = await prisma.booking.findMany({
    where: { seatId: { in: seatIds }, sessionId, ...activeBookingFilter() },
    select: { seatId: true },
  });
  return new Set(active.map((b) => b.seatId));
}