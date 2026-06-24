import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const BLOB_HOST = ".public.blob.vercel-storage.com";

export async function GET(req: NextRequest) {
  if (!isAdmin(req.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const movies = await prisma.movie.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });
  return NextResponse.json({ movies });
}

export async function POST(req: NextRequest) {
  try {
    const { secret, id, title, description, posterUrl } = await req.json();
    if (!isAdmin(secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!title?.trim() || !posterUrl?.trim()) {
      return NextResponse.json({ error: "Title and poster are required" }, { status: 400 });
    }

    if (id) {
      const existing = await prisma.movie.findUnique({ where: { id } });
      await prisma.movie.update({
        where: { id },
        data: { title: title.trim(), description: description ?? "", posterUrl: posterUrl.trim() },
      });
      // Clean up the replaced poster if it was a Blob we own
      if (existing && existing.posterUrl !== posterUrl && existing.posterUrl.includes(BLOB_HOST)) {
        del(existing.posterUrl).catch(() => {});
      }
      return NextResponse.json({ id });
    }

    const movie = await prisma.movie.create({
      data: { title: title.trim(), description: description ?? "", posterUrl: posterUrl.trim() },
    });
    return NextResponse.json({ id: movie.id });
  } catch (e) {
    console.error("movie save error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { secret, id } = await req.json();
    if (!isAdmin(secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Block deletion if any session of this movie has bookings
    const bookingCount = await prisma.booking.count({ where: { session: { movieId: id } } });
    if (bookingCount > 0) {
      return NextResponse.json(
        { error: "This movie has sessions with bookings and can't be deleted." },
        { status: 409 }
      );
    }

    const movie = await prisma.movie.findUnique({ where: { id } });
    await prisma.movie.delete({ where: { id } }); // cascades to its (booking-free) sessions
    if (movie?.posterUrl.includes(BLOB_HOST)) del(movie.posterUrl).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("movie delete error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}