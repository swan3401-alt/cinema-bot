import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegramAuth";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export const dynamic = "force-dynamic";

// Called once as soon as the client resolves Telegram's initData (see
// useTelegram.tsx). Converts that one-time, HMAC-signed initData into a
// persistent session cookie so later pages/requests don't depend on
// Telegram re-supplying a valid hash/initData every time.
export async function POST(req: NextRequest) {
  const { initData } = await req.json();
  const botToken = process.env.BOT_TOKEN;

  if (!botToken || !initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const verified = verifyTelegramInitData(initData, botToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid Telegram user" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, createSessionToken(String(verified.user.id)), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
