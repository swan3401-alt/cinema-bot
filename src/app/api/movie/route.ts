import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const movie = await prisma.movie.findFirst({
      orderBy: { date: "asc" },
      include: {
        seats: {
          orderBy: [{ row: "asc" }, { number: "asc" }],
        },
      },
    });

    if (!movie) {
      return NextResponse.json({ error: "No upcoming movie found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("Failed to fetch movie:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}