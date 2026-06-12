import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildKeyboardMarkup } from "@/bot/keyboard";
import { tr } from "@/bot/i18n";

export const dynamic = "force-dynamic";

const SUPPORTED = ["uz", "ru", "en"];

export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get("telegramId");
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ locale: null });
  }
  const pref = await prisma.userPref.findUnique({ where: { telegramId } });
  return NextResponse.json({ locale: pref?.locale ?? null });
}

export async function POST(req: NextRequest) {
  try {
    const { telegramId, locale, notify } = await req.json();
    if (!/^\d+$/.test(String(telegramId)) || !SUPPORTED.includes(locale)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await prisma.userPref.upsert({
      where: { telegramId: String(telegramId) },
      create: { telegramId: String(telegramId), locale },
      update: { locale },
    });

    // Push a relabeled keyboard so the bot reflects the change immediately
    const token = process.env.BOT_TOKEN;
    if (notify && token) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(telegramId),
          text: tr(locale, "bot.languageSet"),
          reply_markup: buildKeyboardMarkup(locale),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("locale save error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}