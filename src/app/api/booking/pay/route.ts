import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGlobalPayPayment } from "@/lib/globalpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // const { bookingIds } = await req.json();
    const { bookingIds, locale } = await req.json();

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

    // Ensure all bookings are still pending
    const notPending = bookings.filter((b) => b.status !== "PENDING");
    if (notPending.length > 0) {
      return NextResponse.json({ error: "Some bookings are no longer pending" }, { status: 409 });
    }

    const movie = bookings[0].movie;
    const totalAmount = movie.price * bookings.length;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const seatLabels = bookings
      .map((b) => `R${b.seat.row}·${b.seat.number}`)
      .join(", ");

    const lang = locale ?? "uz";

    const payment = await createGlobalPayPayment({
      amount: totalAmount,
      orderId: bookingIds,
      description: `${movie.title} — ${seatLabels}`,
      returnUrl: `${appUrl}/${lang}/booking/success?bookingIds=${bookingIds}`,
      webhookUrl: `${appUrl}/api/booking/webhook`,
    });
    // const payment = await createGlobalPayPayment({
    //   amount: totalAmount,
    //   orderId: bookingIds,
    //   description: `${movie.title} — ${seatLabels}`,
    //   returnUrl: `${appUrl}/uz/booking/success?bookingIds=${bookingIds}`,
    //   webhookUrl: `${appUrl}/api/booking/webhook`,
    // });  

    if (!payment.success || !payment.paymentUrl) {
      return NextResponse.json({ error: "Failed to create payment" }, { status: 502 });
    }

    // Store the GlobalPay transaction reference on each booking
    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data: { paymentRef: payment.transactionId },
    });

    return NextResponse.json({ paymentUrl: payment.paymentUrl });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}