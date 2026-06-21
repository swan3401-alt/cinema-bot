import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/MovieCard";
import { notFound } from "next/navigation";
import { activeBookingFilter } from "@/lib/availability";
import { getTranslations } from "next-intl/server";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const movie = await prisma.movie.findFirst({
    where: { date: { gte: activeMovieCutoff() } },
    orderBy: { date: "asc" },
    include: { _count: { select: { bookings: { where: activeBookingFilter() } } } },
  });


  if (!movie) {
    const t = await getTranslations({ locale, namespace: "home" });
    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-xl px-8 py-10">
          <div className="mb-4 text-5xl">🎬</div>
          <h1 className="mb-2 text-xl font-bold text-white">{t("noMovies")}</h1>
          <p className="text-sm text-gray-400">{t("noMoviesHint")}</p>
        </div>
      </main>
    );
  }

  const availableSeats = movie.totalSeats - movie._count.bookings;
  const formattedDate = movie.date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="bg-gray-950">
      <MovieCard movie={movie} availableSeats={availableSeats} formattedDate={formattedDate} />
    </main>
  );
}
