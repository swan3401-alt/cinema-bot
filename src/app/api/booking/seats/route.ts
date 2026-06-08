import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "No movie found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}