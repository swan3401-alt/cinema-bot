import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    const session = await prisma.session.findFirst({
      where: {
        date: { gte: activeMovieCutoff() },
        ...(sessionId ? { id: sessionId } : {}),
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: {
        movie: true,
        hall: {
          include: {
            seats: {
              orderBy: [{ row: "asc" }, { number: "asc" }],
              include: {
                bookings: { where: { sessionId: sessionId ?? undefined, ...activeBookingFilter() }, select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "No upcoming session found" }, { status: 404 });
    }

    const seats = session.hall.seats.map((seat) => ({
      id: seat.id,
      row: seat.row,
      number: seat.number,
      type: seat.type,
      isBooked: seat.bookings.length > 0,
    }));

    return NextResponse.json({
      sessionId: session.id,
      movieTitle: session.movie.title,
      description: session.movie.description,
      posterUrl: session.movie.posterUrl,
      date: session.date,
      time: session.time,
      hall: session.hall.name,
      price: session.price,
      seats,
    });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}