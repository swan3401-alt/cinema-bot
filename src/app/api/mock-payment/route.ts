import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simulate the webhook that GlobalPay would send after real payment
async function simulateWebhook(orderId: string, transactionId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
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
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  const returnUrl = req.nextUrl.searchParams.get("returnUrl") ?? "/";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Mock Payment — GlobalPay</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; background: #0f172a; color: white;
               display: flex; align-items: center; justify-content: center;
               min-height: 100vh; padding: 1rem; }
        .card { background: #1e293b; border-radius: 16px; padding: 2rem;
                width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 1.5rem; }
        .badge { background: #f59e0b22; color: #f59e0b; font-size: 12px;
                 font-weight: 600; padding: 4px 10px; border-radius: 99px;
                 display: inline-block; letter-spacing: 0.05em; }
        h2 { font-size: 20px; font-weight: 700; }
        .detail { background: #0f172a; border-radius: 10px; padding: 1rem;
                  display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
        .detail span { color: #94a3b8; }
        .detail strong { color: white; font-size: 15px; }
        input { width: 100%; background: #0f172a; border: 1px solid #334155;
                border-radius: 10px; padding: 12px; color: white; font-size: 15px;
                outline: none; letter-spacing: 0.1em; }
        input::placeholder { color: #475569; letter-spacing: normal; }
        .btn { width: 100%; padding: 14px; border-radius: 12px; border: none;
               font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
        .btn-pay { background: #3b82f6; color: white; }
        .btn-pay:hover { opacity: 0.9; }
        .btn-cancel { background: #1e293b; color: #64748b;
                      border: 1px solid #334155; margin-top: 4px; }
        .btn-cancel:hover { color: #94a3b8; }
        .note { font-size: 12px; color: #475569; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div>
          <div class="badge">🧪 TEST MODE</div>
          <h2 style="margin-top:12px">Mock Payment Page</h2>
          <p style="color:#94a3b8; font-size:14px; margin-top:6px">
            This simulates the GlobalPay checkout. No real payment is made.
          </p>
        </div>

        <div class="detail">
          <span>Order ID</span>
          <strong style="font-size:13px; word-break:break-all">${orderId}</strong>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px">
          <input placeholder="Card number: 8600 0000 0000 0000" maxlength="19" />
          <div style="display:flex; gap:10px">
            <input placeholder="MM/YY" />
            <input placeholder="CVV" maxlength="3" />
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px">
          <button class="btn btn-pay" onclick="handlePay()">✓ Pay (simulate success)</button>
          <button class="btn btn-cancel" onclick="handleCancel()">✕ Cancel payment</button>
        </div>

        <p class="note">Clicking "Pay" fires a mock webhook and redirects you back to the app.</p>
      </div>

      <script>
        async function handlePay() {
          await fetch('/api/mock-payment/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: '${orderId}' })
          });
          window.location.href = decodeURIComponent('${encodeURIComponent(returnUrl)}');
        }
        function handleCancel() {
          window.location.href = '/';
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}