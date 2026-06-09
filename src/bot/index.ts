import { Bot, InlineKeyboard } from "grammy";
import { verifyTicket } from "@/lib/verify";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const STAFF_SECRET = process.env.STAFF_SECRET;

export const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp("🎬 Book Tickets", APP_URL);
  await ctx.reply("Welcome! Tap the button below to book your cinema tickets.", {
    reply_markup: keyboard,
  });
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
    await ctx.reply("⚠️ Verification timed out — please try again in a moment.");
  }
});

bot.command("help", async (ctx) => {
  await ctx.reply("Use /start to open the cinema booking app.");
});