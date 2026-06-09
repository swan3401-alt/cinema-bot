import { webhookCallback } from "grammy";
import { bot } from "@/bot";

export const dynamic = "force-dynamic";

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  return handleUpdate(req);
}