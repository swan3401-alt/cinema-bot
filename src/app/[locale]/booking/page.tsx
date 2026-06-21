import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { buildSeatLayout } from "@/lib/seatLayout";
import { activeBookingFilter } from "@/lib/availability";
import SeatMap from "@/components/SeatMap";
import { getTranslations} from "next-intl/server";
import BackButton from "@/components/BackButton";
import { useLocale } from "next-intl";

export const dynamic = "force-dynamic";


export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;


  const t = await getTranslations();
  // const locale = useLocale();


  const movie = await prisma.movie.findFirst({
    orderBy: { date: "asc" },
    include: {
      seats: {
        orderBy: [{ row: "asc" }, { number: "asc" }],
        include: {
          bookings: { where: activeBookingFilter(), select: { id: true } },
        },
      },
    },
  });

  if (!movie) return notFound();

  // A seat is booked if it has any active booking
  const seatsWithStatus = movie.seats.map((seat) => ({
    id: seat.id,
    row: seat.row,
    number: seat.number,
    type: seat.type,
    isBooked: seat.bookings.length > 0,
  }));

  const rows = buildSeatLayout(seatsWithStatus);

  return (
    
    <main className="min-h-screen bg-gray-950 pb-28">
      <div className="max-w-md mx-auto pt-4 pb-4 px-4">
        <BackButton href={`/${locale}`} />
        <h1 className="text-white text-xl font-bold">{t("seats.title")}</h1>
        <p className="text-gray-400 text-sm mt-1">{movie.title}</p>
      </div>
      <SeatMap rows={rows} price={movie.price} movieId={movie.id} />
    </main>
  );
}