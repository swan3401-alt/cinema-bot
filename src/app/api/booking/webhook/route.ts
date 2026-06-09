import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyGlobalPayWebhook } from "@/lib/globalpay";

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

    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: "PAID", paymentRef: transaction_id, paidAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}