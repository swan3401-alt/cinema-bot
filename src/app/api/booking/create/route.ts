import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sweepExpiredBookings, getTakenSeatIds } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, movieId, telegramId, locale } = await req.json();

    if (
      !/^\d+$/.test(String(telegramId)) &&
      process.env.NODE_ENV === "production"
    ) {
      return NextResponse.json(
        { error: "Invalid Telegram user" },
        { status: 400 },
      );
    }

    if (!seatIds?.length || !movieId || !telegramId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Expire abandoned PENDING bookings on these seats first
    await sweepExpiredBookings(seatIds);

    // Check what's still taken
    const taken = await getTakenSeatIds(seatIds);
    if (taken.size > 0) {
      return NextResponse.json(
        { error: "Seats already booked", seatIds: [...taken] },
        { status: 409 },
      );
    }

    const movie = await prisma.movie.findFirst({
      where: { id: movieId, date: { gte: activeMovieCutoff() } },
    });
    if (!movie) {
      return NextResponse.json(
        { error: "This movie is no longer available" },
        { status: 410 },
      );
    }

    const bookings = await prisma.$transaction(
      seatIds.map((seatId: string) =>
        prisma.booking.create({
          data: {
            movieId,
            seatId,
            telegramId,
            locale: locale ?? "uz",
            token: nanoid(12),
            status: "PENDING",
          },
        }),
      ),
    );

    return NextResponse.json({
      bookings,
      bookingIds: bookings.map((b) => b.id).join(","),
      totalAmount: movie.price * bookings.length,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
