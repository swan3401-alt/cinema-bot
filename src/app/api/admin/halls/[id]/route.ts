import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const hall = await prisma.hall.findUnique({
    where: { id },
    include: {
      seats: { orderBy: [{ row: "asc" }, { number: "asc" }] },
      _count: { select: { sessions: true } },
    },
  });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookingCount = await prisma.booking.count({ where: { session: { hallId: id } } });
  return NextResponse.json({ hall, locked: bookingCount > 0 });
}