import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const bookingIds = req.nextUrl.searchParams.get("bookingIds");

  if (!bookingIds) {
    return NextResponse.json({ error: "Missing bookingIds" }, { status: 400 });
  }

  const ids = bookingIds.split(",");

  const bookings = await prisma.booking.findMany({
    where: { id: { in: ids } },
    include: {
      seat: true,
      session: { include: { movie: true, hall: true } },
    },
  });

  if (bookings.length === 0) {
    return NextResponse.json({ error: "Bookings not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: bookings[0].status,
    bookings: bookings.map((b) => ({
      id: b.id,
      token: b.token,
      status: b.status,
      seat: { row: b.seat.row, number: b.seat.number, type: b.seat.type },
      movie: {
        title: b.session.movie.title,
        date: b.session.date,
        time: b.session.time,
        hall: b.session.hall.name,
      },
    })),
  });
}