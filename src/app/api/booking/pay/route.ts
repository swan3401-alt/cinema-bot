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
      include: { movie: true, seat: true },
    });

    if (bookings.length !== ids.length) {
      return NextResponse.json({ error: "Some bookings not found" }, { status: 404 });
    }

    const notPending = bookings.filter((b) => b.status !== "PENDING");
    if (notPending.length > 0) {
      return NextResponse.json({ error: "Some bookings are no longer pending" }, { status: 409 });
    }

    const totalAmount = bookings[0].movie.price * bookings.length;

    // Move to AWAITING_PAYMENT
    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: "AWAITING_PAYMENT" },
    });

    // Send the same instructions to the customer's chat
    await sendPaymentInstructions({
      telegramId: bookings[0].telegramId,
      locale: bookings[0].locale,
      amount: totalAmount,
      cardNumber: PAYMENT_CARD_NUMBER,
      cardHolder: PAYMENT_CARD_HOLDER,
    });

    return NextResponse.json({
      mode: "manual",
      cardNumber: PAYMENT_CARD_NUMBER,
      cardHolder: PAYMENT_CARD_HOLDER,
      totalAmount,
      bookingIds,
    });
  } catch (error) {
    console.error("Pay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  
}