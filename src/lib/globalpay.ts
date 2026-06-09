const GLOBALPAY_API_URL = "https://api.globalpay.uz/v1";
const IS_MOCK = !process.env.GLOBALPAY_API_KEY || process.env.GLOBALPAY_MOCK === "true";

interface CreatePaymentParams {
  amount: number;
  orderId: string;
  description: string;
  returnUrl: string;
  webhookUrl: string;
}

interface GlobalPayResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export async function createGlobalPayPayment(
  params: CreatePaymentParams
): Promise<GlobalPayResponse> {
  if (IS_MOCK) {
    console.log("💳 [MOCK] GlobalPay payment created:", params);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    return {
      success: true,
      paymentUrl: `${appUrl}/api/mock-payment?orderId=${params.orderId}&returnUrl=${encodeURIComponent(params.returnUrl)}`,
      transactionId: `mock_txn_${Date.now()}`,
    };
  }

  const response = await fetch(`${GLOBALPAY_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GLOBALPAY_API_KEY}`,
    },
    body: JSON.stringify({
      merchant_id: process.env.GLOBALPAY_MERCHANT_ID,
      amount: params.amount * 100,
      currency: "UZS",
      order_id: params.orderId,
      description: params.description,
      return_url: params.returnUrl,
      webhook_url: params.webhookUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("GlobalPay error:", error);
    return { success: false, error };
  }

  const data = await response.json();
  return {
    success: true,
    paymentUrl: data.payment_url,
    transactionId: data.transaction_id,
  };
}

export function verifyGlobalPayWebhook(
  payload: Record<string, unknown>,
  signature: string
): boolean {
  if (IS_MOCK) return true; // skip signature check in mock mode

  const crypto = require("crypto");
  const secret = process.env.GLOBALPAY_WEBHOOK_SECRET!;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return expected === signature;
}