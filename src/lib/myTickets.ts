import { prisma } from "@/lib/prisma";

export interface MyTicket {
  token: string;
  status: string;
  movieTitle: string;
  date: Date;
  time: string;
  hall: string;
  row: number;
  number: number;
}

export async function getMyTickets(telegramId: string): Promise<MyTicket[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      telegramId,
      status: { in: ["AWAITING_PAYMENT", "PAID", "USED"] },
    },
    include: { seat: true, movie: true },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((b) => ({
    token: b.token,
    status: b.status,
    movieTitle: b.movie.title,
    date: b.movie.date,
    time: b.movie.time,
    hall: b.movie.hall,
    row: b.seat.row,
    number: b.seat.number,
  }));
}