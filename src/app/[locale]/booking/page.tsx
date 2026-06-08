import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { buildSeatLayout } from "@/lib/seatLayout";
import SeatMap from "@/components/SeatMap";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const t = await getTranslations();

  const movie = await prisma.movie.findFirst({
    orderBy: { date: "asc" },
    include: {
      seats: {
        orderBy: [{ row: "asc" }, { number: "asc" }],
      },
    },
  });

  if (!movie) return notFound();

  const rows = buildSeatLayout(movie.seats);

  return (
    <main className="min-h-screen bg-gray-950 pb-28">
      <div className="max-w-md mx-auto pt-4 pb-4 px-4">
        <h1 className="text-white text-xl font-bold">{t("seats.title")}</h1>
        <p className="text-gray-400 text-sm mt-1">{movie.title}</p>
      </div>
      <SeatMap rows={rows} price={movie.price} movieId={movie.id} />
    </main>
  );
}