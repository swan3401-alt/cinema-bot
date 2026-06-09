import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/MovieCard";
import { notFound } from "next/navigation";
import { activeBookingFilter } from "@/lib/availability";

export const dynamic = "force-dynamic";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const movie = await prisma.movie.findFirst({
    orderBy: { date: "asc" },
    include: {
      seats: {
        include: {
          bookings: { where: activeBookingFilter(), select: { id: true } },
        },
      },
    },
  });

  if (!movie) return notFound();

  // A seat is available if it has no active bookings
  const availableSeats = movie.seats.filter((s) => s.bookings.length === 0).length;

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