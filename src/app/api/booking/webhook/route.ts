import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGlobalPayWebhook } from "@/lib/globalpay";
import { sendTicketToChat } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-globalpay-signature") ?? "";
    const payload = await req.json();

    if (!verifyGlobalPayWebhook(payload, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { order_id, status, transaction_id } = payload;
    const ids: string[] = order_id.split(",");

    if (status !== "SUCCESS") {
      await prisma.booking.updateMany({
        where: { id: { in: ids }, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ received: true });
    }

    // Grab only the bookings that are about to be confirmed (idempotency: a repeat
    // webhook finds nothing PENDING and sends no duplicate tickets)
    const toConfirm = await prisma.booking.findMany({
      where: { id: { in: ids }, status: "PENDING" },
      include: { seat: true, movie: true },
    });

    await prisma.booking.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: { status: "PAID", paymentRef: transaction_id, paidAt: new Date() },
    });

    // Send one QR ticket per seat
    for (const b of toConfirm) {
      await sendTicketToChat({
        token: b.token,
        telegramId: b.telegramId,
        locale: b.locale,
        seat: { row: b.seat.row, number: b.seat.number },
        movie: {
          title: b.movie.title,
          date: b.movie.date,
          time: b.movie.time,
          hall: b.movie.hall,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}