import { prisma } from "@/lib/prisma";
import { activeMovieCutoff } from "@/lib/movieAccess";

export async function getMyTickets(telegramId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      telegramId,
      status: { in: ["AWAITING_PAYMENT", "PAID", "USED"] },
      session: { date: { gte: activeMovieCutoff() } },
    },
    include: { seat: true, session: { include: { movie: true, hall: true } } },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((b) => ({
    token: b.token,
    status: b.status,
    movieTitle: b.session.movie.title,
    date: b.session.date,
    time: b.session.time,
    hall: b.session.hall.name,
    row: b.seat.row,
    number: b.seat.number,
  }));
}