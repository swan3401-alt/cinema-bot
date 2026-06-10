import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "@/lib/prisma";
import { verifyTicket } from "@/lib/verify";
import { confirmBookings, rejectBookings } from "@/lib/confirmBooking";
import { resolveLocale, tr } from "./i18n";
import { getMyTickets } from "@/lib/myTickets";
import { sendTicketToChat } from "@/lib/telegram";


const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");


const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const STAFF_SECRET = process.env.STAFF_SECRET;
const STAFF_GROUP_ID = process.env.STAFF_GROUP_ID;

export const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const locale = await resolveLocale(ctx.from!.id.toString(), ctx.from?.language_code);

  if (ctx.chat.type === "private") {
    // web_app buttons are only valid in private chats
    const keyboard = new InlineKeyboard().webApp(tr(locale, "bot.bookButton"), APP_URL);
    await ctx.reply(tr(locale, "bot.welcome"), { reply_markup: keyboard });
  } else {
    // In groups, link to the bot's private chat instead
    const keyboard = new InlineKeyboard().url(
      tr(locale, "bot.bookButton"),
      `https://t.me/${ctx.me.username}`
    );
    await ctx.reply(tr(locale, "bot.welcome"), { reply_markup: keyboard });
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
        `✅ VALID — Admit\n\n🎬 ${b.movieTitle}\n🏛 ${b.hall}\n💺 Row ${b.row}, Seat ${b.number}`
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
  const keyboard = new InlineKeyboard()
    .text("O'zbekcha", "setlang:uz")
    .text("Русский", "setlang:ru")
    .text("English", "setlang:en");
  const locale = await resolveLocale(ctx.from!.id.toString(), ctx.from?.language_code);
  await ctx.reply(tr(locale, "bot.languagePrompt"), { reply_markup: keyboard });
});



bot.callbackQuery(/^setlang:(uz|ru|en)$/, async (ctx) => {
  const newLocale = ctx.match[1];
  const telegramId = ctx.from.id.toString();
  await prisma.userPref.upsert({
    where: { telegramId },
    create: { telegramId, locale: newLocale },
    update: { locale: newLocale },
  });
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(tr(newLocale as "uz" | "ru" | "en", "bot.languageSet"));
});





bot.command("mytickets", async (ctx) => {
  const telegramId = ctx.from!.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from?.language_code);
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

  // Re-send QR codes for confirmed (PAID) tickets only
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
});




// Customer sends a photo (receipt) → forward to staff group
bot.on("message:photo", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const locale = await resolveLocale(telegramId, ctx.from.language_code);

  const awaiting = await prisma.booking.findMany({
    where: { telegramId, status: "AWAITING_PAYMENT" },
    include: { seat: true, movie: true },
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

  const bookingIds = awaiting.map((b) => b.id).join(",");
  const seatList = awaiting.map((b) => `R${b.seat.row}·${b.seat.number}`).join(", ");
  const total = (awaiting[0].movie.price * awaiting.length)
    .toLocaleString("en-US").replace(/,/g, " ");
  const customer = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

  const keyboard = new InlineKeyboard()
    .text("✅ Approve", `approve:${bookingIds}`)
    .text("❌ Reject", `reject:${bookingIds}`);

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  await ctx.api.sendPhoto(STAFF_GROUP_ID, photo.file_id, {
    caption:
      `🧾 Payment receipt\n\n` +
      `👤 ${customer} (id ${telegramId})\n` +
      `🎬 ${awaiting[0].movie.title}\n` +
      `💺 ${seatList}\n` +
      `💰 ${total} UZS`,
    reply_markup: keyboard,
  });

  await ctx.reply(tr(locale, "bot.receiptReceived"));
});



// Staff taps Approve / Reject
bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
  const bookingIds = ctx.match[1].split(",");
  const { confirmed } = await confirmBookings(bookingIds, `manual_${Date.now()}`);

  await ctx.answerCallbackQuery(
    confirmed > 0 ? "Approved - ticket sent" : "Already handled"
  );
  // Strip the buttons and mark the outcome on the staff message
  const original = ctx.callbackQuery.message?.caption ?? "";
  await ctx.editMessageCaption({
    caption: `${original}\n\n✅ APPROVED by ${ctx.from.first_name}`,
  }).catch(() => {});
});

bot.callbackQuery(/^reject:(.+)$/, async (ctx) => {
  const bookingIds = ctx.match[1].split(",");
  await rejectBookings(bookingIds);

  const booking = await prisma.booking.findFirst({ where: { id: { in: bookingIds } } });
  if (booking) {
    await ctx.api
      .sendMessage(booking.telegramId, tr(booking.locale as "uz" | "ru" | "en", "bot.rejected"))
      .catch(() => {});
  }

  await ctx.answerCallbackQuery("Rejected - seats freed");
  const original = ctx.callbackQuery.message?.caption ?? "";
  await ctx.editMessageCaption({ caption: `${original}\n\n❌ REJECTED by ${ctx.from.first_name}` }).catch(() => {});
});