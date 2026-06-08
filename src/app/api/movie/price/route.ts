import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const movieId = req.nextUrl.searchParams.get("movieId");

  if (!movieId) {
    return NextResponse.json({ error: "Missing movieId" }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { price: true },
  });

  if (!movie) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  return NextResponse.json({ price: movie.price });
}