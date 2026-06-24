import { prisma } from "@/lib/prisma";
import { sendTicketToChat } from "@/lib/telegram";

export async function confirmBookings(
  bookingIds: string[],
  paymentRef: string
): Promise<{ confirmed: number; delivered: number }> {
  const toConfirm = await prisma.booking.findMany({
    where: { id: { in: bookingIds }, status: { in: ["AWAITING_PAYMENT", "PENDING"] } },
    include: { seat: true, session: { include: { movie: true, hall: true } } },
  });

  if (toConfirm.length === 0) return { confirmed: 0, delivered: 0 };

  await prisma.booking.updateMany({
    where: { id: { in: toConfirm.map((b) => b.id) } },
    data: { status: "PAID", paymentRef, paidAt: new Date() },
  });

  let delivered = 0;
  for (const b of toConfirm) {
    const ok = await sendTicketToChat({
      token: b.token,
      telegramId: b.telegramId,
      locale: b.locale,
      seat: { row: b.seat.row, number: b.seat.number },
      movie: {
        title: b.session.movie.title,
        date: b.session.date,
        time: b.session.time,
        hall: b.session.hall.name,
      },
    });
    if (ok) delivered++;
  }

  return { confirmed: toConfirm.length, delivered };
}

export async function rejectBookings(bookingIds: string[]): Promise<void> {
  await prisma.booking.updateMany({
    where: { id: { in: bookingIds }, status: { in: ["AWAITING_PAYMENT", "PENDING"] } },
    data: { status: "CANCELLED" },
  });
}