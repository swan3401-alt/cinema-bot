import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";

const TELEGRAM_API = "https://api.telegram.org";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls a Telegram Bot API method, retrying recoverable failures:
 *  - 429 (honors retry_after), 5xx, and network errors -> retried up to 3x
 *  - 403/400 and other permanent errors → logged, not retried
 * `buildBody` is a factory so FormData is rebuilt fresh for each attempt.
 * Returns true only if Telegram accepted the request.
 */
async function telegramApi(
  method: string,
  buildBody: () => FormData | Record<string, unknown>,
  attempt = 0
): Promise<boolean> {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set");

  const body = buildBody();
  const init: RequestInit =
    body instanceof FormData
      ? { method: "POST", body }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, init);
    if (res.ok) return true;

    const data = (await res.json().catch(() => ({}))) as {
      description?: string;
      parameters?: { retry_after?: number };
    };

    // Rate limited: wait the amount Telegram asks for, then retry
    if (res.status === 429 && attempt < 3) {
      await delay(((data.parameters?.retry_after ?? 1) + 0.5) * 1000);
      return telegramApi(method, buildBody, attempt + 1);
    }
    // Transient server error: short backoff
    if (res.status >= 500 && attempt < 3) {
      await delay(500 * (attempt + 1));
      return telegramApi(method, buildBody, attempt + 1);
    }
    // Permanent (403 not-started/blocked, 400 bad request, etc.): no point retrying
    console.error(`Telegram ${method} failed (${res.status}): ${data.description ?? "unknown"}`);
    return false;
  } catch (e) {
    if (attempt < 3) {
      await delay(500 * (attempt + 1));
      return telegramApi(method, buildBody, attempt + 1);
    }
    console.error(`Telegram ${method} network error:`, e);
    return false;
  }
}

interface TicketBooking {
  token: string;
  telegramId: string;
  locale: string;
  seat: { row: number; number: number };
  movie: { title: string; date: Date; time: string; hall: string };
}

export async function sendTicketToChat(booking: TicketBooking): Promise<boolean> {
  if (!/^\d+$/.test(booking.telegramId)) {
    console.log("Skipping ticket send - non-numeric telegramId:", booking.telegramId);
    return false;
  }

  const t = await getTranslations({ locale: booking.locale, namespace: "ticket" });

  const qrBuffer = await QRCode.toBuffer(booking.token, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
  });

  const dateStr = new Intl.DateTimeFormat(booking.locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(booking.movie.date);

  const caption = [
    t("confirmed"),
    "",
    `🎬 ${booking.movie.title}`,
    `📅 ${dateStr} · ${booking.movie.time}`,
    `🏛 ${booking.movie.hall}`,
    `💺 ${t("row")} ${booking.seat.row}, ${t("seat")} ${booking.seat.number}`,
    "",
    t("showAtEntrance"),
  ].join("\n");

  // Buffer generated once; the factory rebuilds only the FormData wrapper per attempt
  return telegramApi("sendPhoto", () => {
    const fd = new FormData();
    fd.append("chat_id", booking.telegramId);
    fd.append("caption", caption);
    fd.append("photo", new Blob([new Uint8Array(qrBuffer)], { type: "image/png" }), "ticket.png");
    return fd;
  });
}

export async function sendPaymentInstructions(params: {
  telegramId: string;
  locale: string;
  amount: number;
  cardNumber: string;
  cardHolder: string;
}): Promise<boolean> {
  if (!/^\d+$/.test(params.telegramId)) return false;

  const t = await getTranslations({ locale: params.locale, namespace: "payment" });
  const amountStr = params.amount.toLocaleString("en-US").replace(/,/g, " ");

  const text = [
    `💳 ${t("title")}`,
    "",
    t("transferInstruction", { amount: amountStr }),
    "",
    `${t("cardNumber")}: ${params.cardNumber}`,
    `${t("cardHolder")}: ${params.cardHolder}`,
    "",
    t("sendReceipt"),
  ].join("\n");

  return telegramApi("sendMessage", () => ({ chat_id: params.telegramId, text }));
}

/** Generic text message with optional reply markup, routed through the retry wrapper. */
export async function sendBotMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  if (!/^-?\d+$/.test(chatId)) return false;
  return telegramApi("sendMessage", () => ({
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  }));
}