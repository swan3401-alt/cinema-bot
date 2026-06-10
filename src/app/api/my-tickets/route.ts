import { NextRequest, NextResponse } from "next/server";
import { getMyTickets } from "@/lib/myTickets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get("telegramId");
  if (!telegramId) {
    return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
  }
  const tickets = await getMyTickets(telegramId);
  return NextResponse.json({ tickets });
}