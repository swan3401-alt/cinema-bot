import "dotenv/config";
import { bot } from "./index";
import { GrammyError, HttpError } from "grammy";

bot.catch((err) => {
  const e = err.error;
  console.error(`Error handling update ${err.ctx.update.update_id}:`);
  if (e instanceof GrammyError) {
    console.error("Telegram request error:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not reach Telegram:", e);
  } else {
    console.error("Unexpected error:", e);
  }
});

console.log("🤖 Bot is starting...");

bot.start({
  onStart: (info) => console.log(`✅ Bot @${info.username} is running`),
});