import { prisma } from "@/lib/prisma";
import { sendTicketToChat } from "@/lib/telegram";

/**
 * Confirms a set of bookings: marks them PAID and sends QR tickets.
 * Used by manual staff approval now, and by the Click webhook later.
 * Idempotent: only acts on bookings not already PAID.
 */
export async function confirmBookings(
  bookingIds: string[],
  paymentRef: string
): Promise<{ confirmed: number }> {
  const toConfirm = await prisma.booking.findMany({
    where: { id: { in: bookingIds }, status: { in: ["AWAITING_PAYMENT", "PENDING"] } },
    include: { seat: true, movie: true },
  });

  if (toConfirm.length === 0) return { confirmed: 0 };

  await prisma.booking.updateMany({
    where: { id: { in: toConfirm.map((b) => b.id) } },
    data: { status: "PAID", paymentRef, paidAt: new Date() },
  });

  for (const b of toConfirm) {
    await sendTicketToChat({
      token: b.token,
      telegramId: b.telegramId,
      locale: b.locale,
      seat: { row: b.seat.row, number: b.seat.number },
      movie: {
        title: b.movie.title,
        date: b.movie.date,
        time: b.movie.time,
        hall: b.movie.hall,
      },
    });
  }

  return { confirmed: toConfirm.length };
}

/** Rejects/cancels bookings and frees the seats. */
export async function rejectBookings(bookingIds: string[]): Promise<void> {
  await prisma.booking.updateMany({
    where: { id: { in: bookingIds }, status: { in: ["AWAITING_PAYMENT", "PENDING"] } },
    data: { status: "CANCELLED" },
  });
}