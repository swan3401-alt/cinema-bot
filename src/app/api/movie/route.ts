import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const movie = await prisma.movie.findFirst({
      where: { date: { gte: activeMovieCutoff() } },
      orderBy: { date: "asc" },
      include: {
        seats: {
          orderBy: [{ row: "asc" }, { number: "asc" }],
          include: {
            bookings: { where: activeBookingFilter(), select: { id: true } },
          },
        },
      },
    });

    if (!movie) {
      return NextResponse.json({ error: "No upcoming movie found" }, { status: 404 });
    }

    const seats = movie.seats.map((seat) => ({
      id: seat.id,
      row: seat.row,
      number: seat.number,
      type: seat.type,
      isBooked: seat.bookings.length > 0,
    }));

    return NextResponse.json({ ...movie, seats });
  } catch (error) {
    console.error("Failed to fetch movie:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}