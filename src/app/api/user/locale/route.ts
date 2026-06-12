import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { telegramId, locale } = await req.json();
    if (!/^\d+$/.test(String(telegramId)) || !SUPPORTED.includes(locale)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await prisma.userPref.upsert({
      where: { telegramId: String(telegramId) },
      create: { telegramId: String(telegramId), locale },
      update: { locale },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("locale save error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}