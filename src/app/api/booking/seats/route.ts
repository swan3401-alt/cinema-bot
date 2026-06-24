import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const session = await prisma.session.findFirst({
    where: { id: sessionId, date: { gte: activeMovieCutoff() } },
    include: {
      movie: true,
      hall: {
        include: {
          seats: {
            orderBy: [{ row: "asc" }, { number: "asc" }],
            include: { bookings: { where: { sessionId, ...activeBookingFilter() }, select: { id: true } } },
          },
        },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const seats = session.hall.seats.map((s) => ({
    id: s.id, row: s.row, number: s.number, type: s.type, isBooked: s.bookings.length > 0,
  }));

  return NextResponse.json({
    sessionId: session.id,
    movieTitle: session.movie.title,
    date: session.date,
    time: session.time,
    hall: session.hall.name,
    price: session.price,
    seats,
  });
}