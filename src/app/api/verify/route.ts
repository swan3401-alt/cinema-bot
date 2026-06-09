import { NextRequest, NextResponse } from "next/server";
import { verifyTicket } from "@/lib/verify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, secret } = await req.json();

    if (secret !== process.env.STAFF_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const result = await verifyTicket(token.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}