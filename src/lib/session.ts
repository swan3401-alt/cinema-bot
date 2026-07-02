import crypto from "crypto";
import type { NextRequest } from "next/server";

// Converts a one-time verified Telegram initData into a persistent, signed
// session so identity survives cases where Telegram's #tgWebAppData hash (or
// a fresh initData string) isn't available on a later request - e.g. the
// WebView gets reconstructed after backgrounding and the hash is lost.
export const SESSION_COOKIE_NAME = "tg_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.BOT_TOKEN || "";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(telegramId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${telegramId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [telegramId, expStr, sig] = parts;
  if (!/^\d+$/.test(telegramId)) return null;

  const expected = sign(`${telegramId}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const exp = Number(expStr);
  if (!exp || Date.now() / 1000 > exp) return null;

  return telegramId;
}

export function getSessionTelegramId(req: NextRequest): string | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}
