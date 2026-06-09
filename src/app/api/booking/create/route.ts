import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sweepExpiredBookings, getTakenSeatIds } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, movieId, telegramId } = await req.json();

    if (!seatIds?.length || !movieId || !telegramId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Expire abandoned PENDING bookings on these seats first
    await sweepExpiredBookings(seatIds);

    // Check what's still taken
    const taken = await getTakenSeatIds(seatIds);
    if (taken.size > 0) {
      return NextResponse.json(
        { error: "Seats already booked", seatIds: [...taken] },
        { status: 409 }
      );
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const bookings = await prisma.$transaction(
      seatIds.map((seatId: string) =>
        prisma.booking.create({
          data: { movieId, seatId, telegramId, token: nanoid(12), status: "PENDING" },
        })
      )
    );

    return NextResponse.json({
      bookings,
      bookingIds: bookings.map((b) => b.id).join(","),
      totalAmount: movie.price * bookings.length,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}