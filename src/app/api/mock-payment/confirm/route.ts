import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const transactionId = `mock_txn_${Date.now()}`;

  // Fire the same webhook our real GlobalPay handler expects
  await fetch(`${appUrl}/api/booking/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-globalpay-signature": "mock_signature",
    },
    body: JSON.stringify({
      order_id: orderId,
      transaction_id: transactionId,
      status: "SUCCESS",
    }),
  });

  return NextResponse.json({ ok: true });
}