import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// List all halls (for the load dropdown)
export async function GET(req: NextRequest) {
  if (!isAdmin(req.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const halls = await prisma.hall.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { seats: true, sessions: true } } },
  });
  return NextResponse.json({ halls });
}

// Create or update a hall + its seat layout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, id, name, seats } = body as {
      secret?: string;
      id?: string;
      name?: string;
      seats?: { row: number; number: number; type: "WIDE" | "STANDARD" }[];
    };

    if (!isAdmin(secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!name?.trim() || !seats?.length) {
      return NextResponse.json({ error: "Name and at least one seat are required" }, { status: 400 });
    }

    // UPDATE path
    if (id) {
      // Block layout changes if any booking references this hall's seats
      const bookingCount = await prisma.booking.count({
        where: { session: { hallId: id } },
      });
      if (bookingCount > 0) {
        return NextResponse.json(
          { error: "This hall has bookings; its layout can't be changed. Duplicate it instead." },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.hall.update({ where: { id }, data: { name: name.trim() } }),
        prisma.seat.deleteMany({ where: { hallId: id } }),
        prisma.seat.createMany({
          data: seats.map((s) => ({ hallId: id, row: s.row, number: s.number, type: s.type })),
        }),
      ]);
      return NextResponse.json({ id });
    }

    // CREATE path
    const hall = await prisma.hall.create({ data: { name: name.trim() } });
    await prisma.seat.createMany({
      data: seats.map((s) => ({ hallId: hall.id, row: s.row, number: s.number, type: s.type })),
    });
    return NextResponse.json({ id: hall.id });
  } catch (e) {
    console.error("hall save error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { secret, id } = await req.json();
    if (!isAdmin(secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const bookingCount = await prisma.booking.count({ where: { session: { hallId: id } } });
    if (bookingCount > 0) {
      return NextResponse.json(
        { error: "This hall has sessions with bookings and can't be deleted." },
        { status: 409 }
      );
    }
    const sessionCount = await prisma.session.count({ where: { hallId: id } });
    if (sessionCount > 0) {
      return NextResponse.json(
        { error: "This hall is used by scheduled sessions. Delete those first." },
        { status: 409 }
      );
    }

    await prisma.hall.delete({ where: { id } }); // cascades to seats
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("hall delete error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}