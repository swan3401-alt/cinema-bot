import { NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/cancelBooking";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { telegramId, token } = await req.json();
    if (!/^\d+$/.test(String(telegramId)) || typeof token !== "string" || !token) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const result = await cancelBooking(token, String(telegramId));
    return NextResponse.json(result);
  } catch (e) {
    console.error("cancel error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}