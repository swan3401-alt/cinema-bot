import { Bot, InlineKeyboard } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp(
    "🎬 Book Tickets",
    APP_URL
  );

  await ctx.reply(
    `Welcome! Tap the button below to book your cinema tickets.`,
    { reply_markup: keyboard }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Use /start to open the cinema booking app."
  );
});

bot.on("message", async (ctx) => {
  await ctx.reply("Tap /start to book tickets 🎬");
});