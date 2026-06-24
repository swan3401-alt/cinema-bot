import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildSeatLayout } from "@/lib/seatLayout";
import { activeBookingFilter } from "@/lib/availability";
import { activeMovieCutoff } from "@/lib/movieAccess";
import SeatMap from "@/components/SeatMap";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { locale } = await params;
  const { sessionId } = await searchParams;
  const t = await getTranslations();
  if (!sessionId) return notFound();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, date: { gte: activeMovieCutoff() } },
    include: {
      movie: true,
      hall: {
        include: {
          seats: {
            orderBy: [{ row: "asc" }, { number: "asc" }],
            include: { bookings: { where: { sessionId, ...activeBookingFilter() }, select: { id: true } } },
          },
        },
      },
    },
  });
  if (!session) return notFound();

  const seatsWithStatus = session.hall.seats.map((seat) => ({
    id: seat.id, row: seat.row, number: seat.number, type: seat.type, isBooked: seat.bookings.length > 0,
  }));
  const rows = buildSeatLayout(seatsWithStatus);

  return (
    <main className="min-h-screen bg-gray-950 pb-28">
      <div className="max-w-md mx-auto pt-4 pb-4 px-4">
        <BackButton href={`/${locale}`} />
        <h1 className="text-white text-xl font-bold">{t("seats.title")}</h1>
        <p className="text-gray-400 text-sm mt-1">{session.movie.title} · {session.time}</p>
      </div>
      <SeatMap rows={rows} price={session.price} sessionId={session.id} />
    </main>
  );
}