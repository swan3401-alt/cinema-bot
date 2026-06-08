import "dotenv/config";
import { bot } from "./index";

console.log("🤖 Bot is starting...");

bot.start({
  onStart: (info) => {
    console.log(`✅ Bot @${info.username} is running`);
  },
});