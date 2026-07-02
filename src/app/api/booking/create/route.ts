import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sweepExpiredBookings, getTakenSeatIds } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";
import { verifyTelegramInitData } from "@/lib/telegramAuth";
import { createSessionToken, getSessionTelegramId, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { seatIds, sessionId, telegramId, initData, locale } = await req.json();

    // Don't trust a client-supplied telegramId at face value - re-derive it
    // from a previously-verified session cookie (survives cases where
    // Telegram's hash/initData isn't available on this exact request), or
    // failing that, from fresh HMAC-signed initData (which also mints a
    // session cookie for next time). Only outside production, and only when
    // neither is available, fall back to the raw client-supplied id so local
    // UI dev works without a live Telegram session.
    let verifiedTelegramId: string | null = getSessionTelegramId(req);
    let freshSessionToken: string | null = null;

    if (!verifiedTelegramId) {
      const botToken = process.env.BOT_TOKEN;
      const verified = botToken && initData ? verifyTelegramInitData(initData, botToken) : null;
      if (verified) {
        verifiedTelegramId = String(verified.user.id);
        freshSessionToken = createSessionToken(verifiedTelegramId);
      } else if (process.env.NODE_ENV !== "production") {
        verifiedTelegramId = telegramId ?? null;
      } else {
        return NextResponse.json({ error: "Invalid Telegram user" }, { status: 400 });
      }
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

    const res = NextResponse.json({
      bookings,
      bookingIds: bookings.map((b) => b.id).join(","),
      totalAmount: session.price * bookings.length,
    });
    if (freshSessionToken) {
      res.cookies.set(SESSION_COOKIE_NAME, freshSessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
      });
    }
    return res;
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}