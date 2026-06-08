import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, movieId, telegramId } = await req.json();

    if (!seatIds?.length || !movieId || !telegramId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check all seats are still available
    const seats = await prisma.seat.findMany({
      where: { id: { in: seatIds }, movieId },
    });

    if (seats.length !== seatIds.length) {
      return NextResponse.json({ error: "One or more seats not found" }, { status: 404 });
    }

    const alreadyBooked = seats.filter((s) => s.isBooked);
    if (alreadyBooked.length > 0) {
      return NextResponse.json(
        { error: "One or more seats are already booked", seatIds: alreadyBooked.map((s) => s.id) },
        { status: 409 }
      );
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Create bookings in a transaction - all or nothing
    const bookings = await prisma.$transaction(
      seatIds.map((seatId: string) =>
        prisma.booking.create({
          data: {
            movieId,
            seatId,
            telegramId,
            token: nanoid(12),
            status: "PENDING",
          },
        })
      )
    );

    const totalAmount = movie.price * bookings.length;
    const bookingIds = bookings.map((b) => b.id).join(",");

    return NextResponse.json({ bookings, bookingIds, totalAmount });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}