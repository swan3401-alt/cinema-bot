import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sweepExpiredBookings, getTakenSeatIds } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";
import { verifyTelegramInitData } from "@/lib/telegramAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, sessionId, telegramId, initData, locale } = await req.json();

    // In production, don't trust a client-supplied telegramId at face value -
    // re-derive it from Telegram's HMAC-signed initData so a tampered/stale
    // id (or a failed client-side identification) can't create a booking.
    let verifiedTelegramId = telegramId;
    if (process.env.NODE_ENV === "production") {
      const botToken = process.env.BOT_TOKEN;
      const verified = botToken && initData ? verifyTelegramInitData(initData, botToken) : null;
      if (!verified) {
        return NextResponse.json({ error: "Invalid Telegram user" }, { status: 400 });
      }
      verifiedTelegramId = String(verified.user.id);
    }

    if (!seatIds?.length || !sessionId || !verifiedTelegramId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^\d+$/.test(String(verifiedTelegramId))) {
      return NextResponse.json({ error: "Invalid Telegram user" }, { status: 400 });
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, date: { gte: activeMovieCutoff() } },
    });
    if (!session) {
      return NextResponse.json({ error: "This session is no longer available" }, { status: 410 });
    }

    await sweepExpiredBookings(seatIds);
    const taken = await getTakenSeatIds(seatIds, sessionId);
    if (taken.size > 0) {
      return NextResponse.json({ error: "Seats already booked", seatIds: [...taken] }, { status: 409 });
    }

    const bookings = await prisma.$transaction(
      seatIds.map((seatId: string) =>
        prisma.booking.create({
          data: { sessionId, seatId, telegramId: String(verifiedTelegramId), locale: locale ?? "uz", token: nanoid(12), status: "PENDING" },
        })
      )
    );

    return NextResponse.json({
      bookings,
      bookingIds: bookings.map((b) => b.id).join(","),
      totalAmount: session.price * bookings.length,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}