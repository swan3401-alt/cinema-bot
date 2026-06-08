import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGlobalPayWebhook } from "@/lib/globalpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-globalpay-signature") ?? "";
    const payload = await req.json();

    if (!verifyGlobalPayWebhook(payload, signature)) {
      console.warn("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { order_id, status, transaction_id } = payload;

    if (status !== "SUCCESS") {
      // Payment failed or cancelled - mark bookings as cancelled
      const ids: string[] = order_id.split(",");
      await prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: "CANCELLED" },
      });

      // Free up the seats
      const bookings = await prisma.booking.findMany({
        where: { id: { in: ids } },
      });
      await prisma.seat.updateMany({
        where: { id: { in: bookings.map((b) => b.seatId) } },
        data: { isBooked: false },
      });

      return NextResponse.json({ received: true });
    }

    // Payment succeeded - confirm bookings and lock seats
    const ids: string[] = order_id.split(",");

    const bookings = await prisma.booking.findMany({
      where: { id: { in: ids } },
    });

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: "PAID", paymentRef: transaction_id },
      }),
      prisma.seat.updateMany({
        where: { id: { in: bookings.map((b) => b.seatId) } },
        data: { isBooked: true },
      }),
    ]);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}