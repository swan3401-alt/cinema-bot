import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import MovieCarousel, { type SessionView } from "@/components/MovieCarousel";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const sessions = await prisma.session.findMany({
    where: { date: { gte: activeMovieCutoff() } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      movie: true,
      hall: { include: { _count: { select: { seats: true } } } },
      _count: { select: { bookings: { where: activeBookingFilter() } } },
    },
  });

  if (sessions.length === 0) {
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

  // Build view-models; format the date server-side (avoids hydration mismatch)
  const views: SessionView[] = sessions.map((s) => ({
    sessionId: s.id,
    title: s.movie.title,
    description: s.movie.description,
    posterUrl: s.movie.posterUrl,
    time: s.time,
    hall: s.hall.name,
    price: s.price,
    availableSeats: s.hall._count.seats - s._count.bookings,
    dateLabel: s.date.toLocaleDateString(locale, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "Asia/Tashkent",
    }),
  }));

  return (
    <main className="bg-gray-950">
      <MovieCarousel sessions={views} />
    </main>
  );
}