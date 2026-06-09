import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";

interface TicketBooking {
  token: string;
  telegramId: string;
  locale: string;
  seat: { row: number; number: number };
  movie: { title: string; date: Date; time: string; hall: string };
}

export async function sendTicketToChat(booking: TicketBooking): Promise<void> {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set");

  // Skip non-Telegram bookings (such as browser preview with "preview_user")
  if (!/^\d+$/.test(booking.telegramId)) {
    console.log("Skipping ticket send — non-numeric telegramId:", booking.telegramId);
    return;
  }

  const t = await getTranslations({ locale: booking.locale, namespace: "ticket" });

  // Generate QR as PNG buffer
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

  const formData = new FormData();
  formData.append("chat_id", booking.telegramId);
  formData.append("caption", caption);
  // formData.append("photo", new Blob([qrBuffer], { type: "image/png" }), "ticket.png");
  // formData.append("photo", new Blob([qrBuffer as Buffer<ArrayBuffer>], { type: "image/png" }), "ticket.png");
  formData.append("photo", new Blob([new Uint8Array(qrBuffer)], { type: "image/png" }), "ticket.png");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to send ticket to Telegram:", err);
  }
}