import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

// Movies + halls for the pickers, and the upcoming session list
export async function GET(req: NextRequest) {
  if (!isAdmin(req.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [movies, halls, sessions] = await Promise.all([
    prisma.movie.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.hall.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { seats: true } } },
    }),
    prisma.session.findMany({
      where: { date: { gte: activeMovieCutoff() } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: {
        movie: { select: { title: true } },
        hall: { select: { name: true, _count: { select: { seats: true } } } },
        _count: { select: { bookings: { where: activeBookingFilter() } } },
      },
    }),
  ]);

  const sessionList = sessions.map((s) => ({
    id: s.id,
    movieTitle: s.movie.title,
    hallName: s.hall.name,
    date: s.date,
    time: s.time,
    price: s.price,
    booked: s._count.bookings,
    capacity: s.hall._count.seats,
  }));

  return NextResponse.json({ movies, halls, sessions: sessionList });
}

export async function POST(req: NextRequest) {
  try {
    const { secret, movieId, hallId, date, time, price } = await req.json();
    if (!isAdmin(secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!movieId || !hallId || !date || !time || price == null) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    const priceInt = Math.round(Number(price));
    if (!Number.isFinite(priceInt) || priceInt < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // date arrives as "YYYY-MM-DD"; store midnight GMT+5 for that calendar day
    const day = new Date(`${date}T00:00:00+05:00`);
    if (Number.isNaN(day.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const [movie, hall] = await Promise.all([
      prisma.movie.findUnique({ where: { id: movieId } }),
      prisma.hall.findUnique({ where: { id: hallId } }),
    ]);
    if (!movie || !hall) {
      return NextResponse.json({ error: "Movie or hall not found" }, { status: 404 });
    }

    const session = await prisma.session.create({
      data: { movieId, hallId, date: day, time, price: priceInt },
    });
    return NextResponse.json({ id: session.id });
  } catch (e) {
    console.error("session create error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { secret, id } = await req.json();
    if (!isAdmin(secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const active = await prisma.booking.count({
      where: { sessionId: id, ...activeBookingFilter() },
    });
    if (active > 0) {
      return NextResponse.json(
        { error: "This session has active bookings and can't be deleted." },
        { status: 409 }
      );
    }

    await prisma.session.delete({ where: { id } }); // cascades to its (inactive) bookings
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("session delete error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}