import * as crypto from "crypto";

const GLOBALPAY_API_URL = "https://api.globalpay.uz/v1";

interface CreatePaymentParams {
  amount: number;         // in UZS (tiyin - multiply by 100)
  orderId: string;        // internal booking IDs
  description: string;
  returnUrl: string;      // where to redirect after payment
  webhookUrl: string;     // where GlobalPay sends confirmation
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
  const apiKey = process.env.GLOBALPAY_API_KEY;
  const merchantId = process.env.GLOBALPAY_MERCHANT_ID;

  if (!apiKey || !merchantId) {
    throw new Error("GlobalPay credentials are not configured");
  }

  const response = await fetch(`${GLOBALPAY_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      amount: params.amount * 100,  // convert to tiyin
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
  const secret = process.env.GLOBALPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("GLOBALPAY_WEBHOOK_SECRET is not set");

  // GlobalPay signs payloads with HMAC-SHA256
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return expected === signature;
}