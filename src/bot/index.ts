import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { prisma } from "@/lib/prisma";
import { verifyTicket } from "@/lib/verify";
import { confirmBookings, rejectBookings } from "@/lib/confirmBooking";
import { resolveLocale, tr, type Locale } from "./i18n";
import { getMyTickets } from "@/lib/myTickets";
import { sendTicketToChat } from "@/lib/telegram";
import { nanoid } from "nanoid";
import { cancelBooking } from "@/lib/cancelBooking";
import { sendBotMessage } from "@/lib/telegram";

import { buildKeyboardMarkup } from "./keyboard";


const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");


const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const STAFF_SECRET = process.env.STAFF_SECRET;
const STAFF_GROUP_ID = process.env.STAFF_GROUP_ID;

// Launch with the locale already in the path so next-intl's middleware never
// has to issue a redirect on the very first request. That redirect happens
// before any client JS runs, and relies on the WebView correctly reapplying
// the #tgWebAppData hash Telegram appended - not guaranteed on every engine.
export function appUrlFor(locale: Locale): string {
  return `${APP_URL.replace(/\/$/, "")}/${locale}`;
}

export const bot = new Bot(token);

const LOCALES: Locale[] = ["uz", "ru", "en"];

// Ticket cancellation helpers

type Ticket = Awaited<ReturnType<typeof getMyTickets>>[number];

function ticketStatusLabel(locale: Locale, status: string): string {
  const map: Record<string, string> = {
    AWAITING_PAYMENT: tr(locale, "bot.statusAwaiting"),
    PAID: tr(locale, "bot.statusPaid"),
    USED: tr(locale, "bot.statusUsed"),
  };
  return map[status] ?? status;
}

function ticketLine(locale: Locale, tk: Ticket, n?: number): string {
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "long", year: "numeric",
  }).format(tk.date);
  const head = n ? `${n}. ` : "";
  return `${head}${ticketStatusLabel(locale, tk.status)}\n🎬 ${tk.movieTitle}\n📅 ${dateStr} · ${tk.time}\n🏛 ${tk.hall}\n💺 ${tr(locale, "booking.row")} ${tk.row}, ${tr(locale, "booking.seat")} ${tk.number}`;
}

async function renderTicketList(telegramId: string, locale: Locale) {
  const tickets = await getMyTickets(telegramId);
  const kb = new InlineKeyboard();

  if (tickets.length === 0) {
    return { text: tr(locale, "bot.noTickets"), keyboard: kb };
  }

  const lines = tickets.map((tk, i) => ticketLine(locale, tk, i + 1));
  const text = `${tr(locale, "bot.myTicketsTitle")}\n\n${lines.join("\n\n")}`;

  if (tickets.some((t) => t.status === "PAID")) {
    kb.text(tr(locale, "tickets.sendAllQr"), "tkt_all").row();
  }
  tickets.forEach((tk, i) => {
    kb.text(`#${i + 1} · R${tk.row}·${tk.number}`, `tkt_v:${tk.token}`);
    if (i % 2 === 1) kb.row();
  });

  return { text, keyboard: kb };
}

async function renderTicketDetail(token: string, telegramId: string, locale: Locale) {
  const tickets = await getMyTickets(telegramId);
  const idx = tickets.findIndex((t) => t.token === token);
  if (idx === -1) return renderTicketList(telegramId, locale);

  const tk = tickets[idx];
  const text = `${tr(locale, "bot.myTicketsTitle")} - #${idx + 1}\n\n${ticketLine(locale, tk)}`;

  const kb = new InlineKeyboard();
  if (tk.status === "USED") {
    kb.text(tr(locale, "tickets.back"), "tkt_b");
  } else {
    kb.text(tr(locale, "tickets.cancel"), `tkt_c:${tk.token}`).text(tr(locale, "tickets.back"), "tkt_b");
  }
  return { text, keyboard: kb };
}







bot.command("start", async (ctx) => {
  const locale = await resolveLocale(ctx.from!.id.toString(), ctx.from?.language_code);

  if (ctx.chat.type === "private") {
    // await ctx.reply(tr(locale, "bot.welcome"), { reply_markup: buildReplyKeyboard(locale) });
    await ctx.reply(tr(locale, "bot.welcome"), { reply_markup: buildKeyboardMarkup(locale) });
  } else {
    const inline = new InlineKeyboard().url(tr(locale, "bot.bookButton"), `https://t.me/${ctx.me.username}`);
    await ctx.reply(tr(locale, "bot.welcome"), { reply_markup: inline });
  }
});

bot.command("scan", async (ctx) => {
  const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];

  if (parts.length < 2) {
    await ctx.reply("Usage: /scan <secret> <token>");
    return;
  }

  const [secret, ticketToken] = parts;

  if (secret !== STAFF_SECRET) {
    await ctx.reply("⛔ Unauthorized.");
    return;
  }

  try {
    const result = await verifyTicket(ticketToken);

    if (result.ok) {
      const b = result.booking;
      await ctx.reply(
        `✅ VALID - Admit\n\n🎬 ${b.movieTitle}\n🏛 ${b.hall}\n💺 Row ${b.row}, Seat ${b.number}`
      );
    } else {
      const labels: Record<string, string> = {
        ALREADY_USED: "⚠️ ALREADY USED",
        NOT_PAID: "❌ NOT PAID",
        NOT_FOUND: "❌ INVALID TICKET",
        CANCELLED: "❌ CANCELLED",
      };
      await ctx.reply(labels[result.reason] ?? "❌ INVALID");
    }
  } catch (e) {
    console.error("scan verify failed:", e);
    await ctx.reply("⚠️ Verification timed out - please try again in a moment.");
  }
});


bot.command("help", async (ctx) => {
  const locale = await resolveLocale(ctx.from!.id.toString(), ctx.from?.language_code);
  await ctx.reply(tr(locale, "bot.help"));
});

bot.command("language", async (ctx) => {
  const locale = await resolveLocale(ctx.from!.id.toString(), ctx.from?.language_code);
  await ctx.reply(tr(locale, "bot.languagePrompt"), { reply_markup: languagePickerKeyboard() });
});

bot.callbackQuery(/^setlang:(uz|ru|en)$/, async (ctx) => {
  const newLocale = ctx.match[1] as Locale;
  const telegramId = ctx.from.id.toString();
  await prisma.userPref.upsert({
    where: { telegramId },
    create: { telegramId, locale: newLocale },
    update: { locale: newLocale },
  });
  await ctx.answerCallbackQuery();
  await ctx.editMessageReplyMarkup(); // drop the inline picker buttons
  // resend with the keyboard now relabeled in the new language
  // await ctx.reply(tr(newLocale, "bot.languageSet"), { reply_markup: buildReplyKeyboard(newLocale) });
  await ctx.reply(tr(newLocale, "bot.languageSet"), { reply_markup: buildKeyboardMarkup(newLocale) });
});






bot.command("mytickets", async (ctx) => {
  const telegramId = ctx.from!.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from?.language_code);
  const { text, keyboard } = await renderTicketList(telegramId, locale);
  await ctx.reply(text, { reply_markup: keyboard });
});

// Send all QR codes (PAID tickets only)
bot.callbackQuery("tkt_all", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);
  const tickets = await getMyTickets(telegramId);
  const paid = tickets.filter((t) => t.status === "PAID");
  await ctx.answerCallbackQuery(paid.length ? tr(locale, "tickets.sendingQr") : tr(locale, "tickets.noPaidQr"));
  for (const tk of paid) {
    await sendTicketToChat({
      token: tk.token, telegramId, locale,
      seat: { row: tk.row, number: tk.number },
      movie: { title: tk.movieTitle, date: tk.date, time: tk.time, hall: tk.hall },
    });
  }
});

// View one ticket
bot.callbackQuery(/^tkt_v:(.+)$/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);
  const { text, keyboard } = await renderTicketDetail(ctx.match[1], telegramId, locale);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

// Back to list
bot.callbackQuery("tkt_b", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);
  const { text, keyboard } = await renderTicketList(telegramId, locale);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, { reply_markup: keyboard });
});

// Cancel pressed -> confirmation step (text/buttons depend on status)
bot.callbackQuery(/^tkt_c:(.+)$/, async (ctx) => {
  const token = ctx.match[1];
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);
  await ctx.answerCallbackQuery();

  const tk = (await getMyTickets(telegramId)).find((t) => t.token === token);
  if (!tk) {
    const { text, keyboard } = await renderTicketList(telegramId, locale);
    await ctx.editMessageText(text, { reply_markup: keyboard });
    return;
  }

  const isPaid = tk.status === "PAID";
  const kb = new InlineKeyboard()
    .text(tr(locale, isPaid ? "tickets.confirmNotifyBtn" : "tickets.confirmCancelBtn"), `tkt_cc:${token}`)
    .text(tr(locale, "tickets.back"), `tkt_v:${token}`);
  const prompt = tr(locale, isPaid ? "tickets.paidConfirmPrompt" : "tickets.cancelConfirmPrompt");
  await ctx.editMessageText(prompt, { reply_markup: kb });
});

// Confirmed -> perform cancellation
bot.callbackQuery(/^tkt_cc:(.+)$/, async (ctx) => {
  const token = ctx.match[1];
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);
  const actor = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  const result = await cancelBooking(token, telegramId, actor);
  const back = new InlineKeyboard().text(tr(locale, "tickets.back"), "tkt_b");

  if (result.ok) {
    await ctx.answerCallbackQuery(tr(locale, "tickets.cancelledToast"));
    await ctx.editMessageText(
      tr(locale, "tickets.cancelledMsg", { seat: `R${result.freed.row}·${result.freed.number}` }),
      { reply_markup: back }
    );
  } else if (result.reason === "paid") {
    await ctx.answerCallbackQuery();
    const contact = process.env.STAFF_CONTACT;
    await ctx.editMessageText(
      contact ? tr(locale, "tickets.paidNotifiedContact", { contact }) : tr(locale, "tickets.paidNotified"),
      { reply_markup: back }
    );
  } else {
    await ctx.answerCallbackQuery(tr(locale, "tickets.cancelFailed"));
    const { text, keyboard } = await renderTicketList(telegramId, locale);
    await ctx.editMessageText(text, { reply_markup: keyboard });
  }
});



bot.callbackQuery(/^cxl_ok:(.+)$/, async (ctx) => {
  const token = ctx.match[1];

  const booking = await prisma.booking.findUnique({
    where: { token },
    include: 
    { seat: true,
      session: { include: { movie: true, hall: true } },
    },
  });
  if (!booking) {
    await ctx.answerCallbackQuery("Booking not found");
    return;
  }

  // Only cancel if it's still PAID (guards double-taps / races)
  const result = await prisma.booking.updateMany({
    where: { token, status: "PAID" },
    data: { status: "CANCELLED" },
  });

  const original = ctx.callbackQuery.message?.text ?? "";

  if (result.count === 0) {
    await ctx.answerCallbackQuery("Already handled");
    await ctx
      .editMessageText(`${original}\n\n☑️ Already handled`, { reply_markup: { inline_keyboard: [] } })
      .catch(() => {});
    return;
  }

  await ctx.answerCallbackQuery("Cancellation approved");

  // Tell the customer (in their language)
  const locale = await resolveLocale(booking.telegramId);
  await sendBotMessage(
    booking.telegramId,
    tr(locale, "tickets.paidCancelApproved", { seat: `R${booking.seat.row}·${booking.seat.number}` })
  );

  // Update the staff message and drop the button
  await ctx
    .editMessageText(
      `${original}\n\n✅ Cancellation approved by ${ctx.from.first_name} - seat R${booking.seat.row}·${booking.seat.number} freed`,
      { reply_markup: { inline_keyboard: [] } }
    )
    .catch(() => {});
});







// Customer sends a photo (receipt) -> forward to staff group
bot.on("message:photo", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);

  const awaiting = await prisma.booking.findMany({
    where: { telegramId, status: "AWAITING_PAYMENT" },
    include: { seat: true, session: { include: { movie: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (awaiting.length === 0) {
    await ctx.reply(tr(locale, "bot.noReservation"));
    return;
  }
  if (!STAFF_GROUP_ID) {
    console.error("STAFF_GROUP_ID not set");
    return;
  }

  // Short reference fits Telegram's 64-byte callback_data limit, any seat count
  const reviewRef = nanoid(10);
  await prisma.booking.updateMany({
    where: { id: { in: awaiting.map((b) => b.id) } },
    data: { reviewMsgId: reviewRef },
  });

  const seatList = awaiting.map((b) => `R${b.seat.row}·${b.seat.number}`).join(", ");
  const total = (awaiting[0].session.price * awaiting.length).toLocaleString("en-US").replace(/,/g, " ");
  const customer = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${reviewRef}`)
    .text("❌ Reject", `reject:${reviewRef}`);

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  await ctx.api.sendPhoto(STAFF_GROUP_ID, photo.file_id, {
    caption:
      `🧾 Payment receipt\n\n` +
      `👤 ${customer} (id ${telegramId})\n` +
      `🎬 ${awaiting[0].session.movie.title}\n` +
      `💺 ${seatList}\n` +
      `💰 ${total} UZS`,
    reply_markup: keyboard,
  });

  await ctx.reply(tr(locale, "bot.receiptReceived"));
});

bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
  const reviewRef = ctx.match[1];
  const bookings = await prisma.booking.findMany({
    where: { reviewMsgId: reviewRef, status: "AWAITING_PAYMENT" },
    select: { id: true },
  });

  const { confirmed, delivered } = await confirmBookings(
    bookings.map((b) => b.id),
    `manual_${Date.now()}`
  );

  await ctx.answerCallbackQuery(confirmed > 0 ? "Approved" : "Already handled");

  const original = ctx.callbackQuery.message?.caption ?? "";
  let note = `\n\n✅ APPROVED by ${ctx.from.first_name}`;
  if (confirmed > 0 && delivered < confirmed) {
    note += `\n⚠️ Only ${delivered}/${confirmed} tickets delivered - tell the customer to tap "🎟 My Tickets" in the bot.`;
  }
  await ctx.editMessageCaption({ caption: `${original}${note}` }).catch(() => {});
});


bot.callbackQuery(/^reject:(.+)$/, async (ctx) => {
  const reviewRef = ctx.match[1];
  const bookings = await prisma.booking.findMany({
    where: { reviewMsgId: reviewRef, status: "AWAITING_PAYMENT" },
  });

  if (bookings.length > 0) {
    await rejectBookings(bookings.map((b) => b.id));
    await ctx.api
      .sendMessage(bookings[0].telegramId, tr(bookings[0].locale as "uz" | "ru" | "en", "bot.rejected"))
      .catch(() => {});
  }

  await ctx.answerCallbackQuery("Rejected — seats freed");
  const original = ctx.callbackQuery.message?.caption ?? "";
  await ctx.editMessageCaption({
    caption: `${original}\n\n❌ REJECTED by ${ctx.from.first_name}`,
  }).catch(() => {});
});


// Build the persistent reply keyboard in the user's language
function buildReplyKeyboard(locale: Locale) {
  return new Keyboard()
    .webApp(tr(locale, "bot.bookButton"), appUrlFor(locale))
    .row()
    .text(tr(locale, "bot.kbTickets"))
    .text(tr(locale, "bot.kbLanguage"))
    .resized()
    .persistent();
}

// Match a tapped keyboard button by its label in ANY language
const TICKETS_LABELS = new Set(LOCALES.map((l) => tr(l, "bot.kbTickets")));
const LANGUAGE_LABELS = new Set(LOCALES.map((l) => tr(l, "bot.kbLanguage")));

async function sendMyTickets(
  ctx: { reply: (t: string) => Promise<unknown> },
  telegramId: string,
  locale: Locale
) {
  const tickets = await getMyTickets(telegramId);

  if (tickets.length === 0) {
    await ctx.reply(tr(locale, "bot.noTickets"));
    return;
  }

  const statusLabel: Record<string, string> = {
    AWAITING_PAYMENT: tr(locale, "bot.statusAwaiting"),
    PAID: tr(locale, "bot.statusPaid"),
    USED: tr(locale, "bot.statusUsed"),
  };

  const lines = tickets.map((tk) => {
    const dateStr = new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "long", year: "numeric",
    }).format(tk.date);
    return `${statusLabel[tk.status] ?? tk.status}\n🎬 ${tk.movieTitle}\n📅 ${dateStr} · ${tk.time}\n💺 ${tr(locale, "booking.row")} ${tk.row}, ${tr(locale, "booking.seat")} ${tk.number}`;
  });

  await ctx.reply(`${tr(locale, "bot.myTicketsTitle")}\n\n${lines.join("\n\n")}`);

  const paid = tickets.filter((tk) => tk.status === "PAID");
  for (const tk of paid) {
    await sendTicketToChat({
      token: tk.token,
      telegramId,
      locale,
      seat: { row: tk.row, number: tk.number },
      movie: { title: tk.movieTitle, date: tk.date, time: tk.time, hall: tk.hall },
    });
  }
}

function languagePickerKeyboard() {
  return new InlineKeyboard()
    .text("O'zbekcha", "setlang:uz")
    .text("Русский", "setlang:ru")
    .text("English", "setlang:en");
}


bot.on("message:text", async (ctx, next) => {
  // Only the user's private chat; ignore commands and the staff group
  if (ctx.chat.type !== "private" || ctx.message.text.startsWith("/")) {
    return next();
  }

  const text = ctx.message.text;
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);

  if (TICKETS_LABELS.has(text)) {
    const { text: listText, keyboard } = await renderTicketList(telegramId, locale);
    await ctx.reply(listText, { reply_markup: keyboard });
    return;
  }
  if (LANGUAGE_LABELS.has(text)) {
    await ctx.reply(tr(locale, "bot.languagePrompt"), { reply_markup: languagePickerKeyboard() });
    return;
  }

  return next(); // anything else falls through
});

