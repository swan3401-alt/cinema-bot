import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      movie: true,
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
      movie: { title: b.movie.title, date: b.movie.date, time: b.movie.time, hall: b.movie.hall },
    })),
  });
}