import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { PENDING_TTL_MINUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, movieId, telegramId } = await req.json();

    if (!seatIds?.length || !movieId || !telegramId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000);

    // Clean up expired PENDING bookings for these seats first
    const expired = await prisma.booking.findMany({
      where: {
        seatId: { in: seatIds },
        status: "PENDING",
        createdAt: { lt: cutoff },
      },
    });

    if (expired.length > 0) {
      const expiredIds = expired.map((b) => b.id);
      await prisma.$transaction([
        prisma.booking.updateMany({
          where: { id: { in: expiredIds } },
          data: { status: "CANCELLED" },
        }),
        prisma.seat.updateMany({
          where: { id: { in: expired.map((b) => b.seatId) } },
          data: { isBooked: false },
        }),
      ]);
    }

    // Check for ACTIVE bookings (PAID, or PENDING within the TTL window)
    const activeBookings = await prisma.booking.findMany({
      where: {
        seatId: { in: seatIds },
        OR: [
          { status: "PAID" },
          { status: "PENDING", createdAt: { gte: cutoff } },
        ],
      },
    });

    if (activeBookings.length > 0) {
      return NextResponse.json(
        { error: "One or more seats are already booked", seatIds: activeBookings.map((b) => b.seatId) },
        { status: 409 }
      );
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    // Create new PENDING bookings
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