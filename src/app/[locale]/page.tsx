import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/MovieCard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const movie = await prisma.movie.findFirst({
    orderBy: { date: "asc" },
    include: { seats: true },
  });

  if (!movie) return notFound();

  const availableSeats = movie.seats.filter((s) => !s.isBooked).length;

  const formattedDate = movie.date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <MovieCard movie={movie} availableSeats={availableSeats} formattedDate={formattedDate} />
    </main>
  );
}