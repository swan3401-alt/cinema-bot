import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_CARD_NUMBER, PAYMENT_CARD_HOLDER } from "@/lib/constants";
import { sendPaymentInstructions } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { bookingIds } = await req.json();
    if (!bookingIds?.length) {
      return NextResponse.json({ error: "Missing bookingIds" }, { status: 400 });
    }

    const ids: string[] = bookingIds.split(",");
    const bookings = await prisma.booking.findMany({
      where: { id: { in: ids } },
      include: { session: { include: { movie: true } }, seat: true },
    });
    if (bookings.length !== ids.length) {
      return NextResponse.json({ error: "Some bookings not found" }, { status: 404 });
    }

    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: "AWAITING_PAYMENT" },
    });

    const totalAmount = bookings[0].session.price * bookings.length;

    const sent = await sendPaymentInstructions({
      telegramId: bookings[0].telegramId,
      locale: bookings[0].locale,
      amount: totalAmount,
      cardNumber: PAYMENT_CARD_NUMBER,
      cardHolder: PAYMENT_CARD_HOLDER,
    });
    if (!sent) console.warn("Payment instructions not delivered to chat:", bookings[0].telegramId);

    return NextResponse.json({
      cardNumber: PAYMENT_CARD_NUMBER,
      cardHolder: PAYMENT_CARD_HOLDER,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Pay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}