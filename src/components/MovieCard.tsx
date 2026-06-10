"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Movie } from "@/types";

interface Props {
  movie: Omit<Movie, "seats">;
  availableSeats: number;
  formattedDate: string;
}

export default function MovieCard({ movie, availableSeats, formattedDate }: Props) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();

  const formattedPrice = movie.price.toLocaleString("en-US").replace(/,/g, " ");

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* POSTER - sticky, fills the screen, stays pinned while content scrolls over it */}
      <div className="sticky top-0 h-[calc(100svh-60px)] w-full overflow-hidden">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
      </div>

      {/* CONTENT - the next sibling, so it starts one full screen down (below the fold)
          and rises over the pinned poster as you scroll. One frosted sheet = "blurred". */}
      <div className="relative z-10 -mt-6 flex flex-col gap-4 rounded-t-3xl border-t border-white/10
                      bg-gray-950/30 backdrop-blur-xs px-5 pt-6 pb-10">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">{movie.title}</h1>

        {movie.description && (
          <p className="text-gray-100 text-sm leading-relaxed drop-shadow">{movie.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailCard label={t("movie.date")} value={formattedDate} />
          <DetailCard label={t("movie.time")} value={movie.time} />
          <DetailCard label={t("movie.hall")} value={movie.hall} />
          <DetailCard label={t("movie.available")} value={`${availableSeats}`} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-gray-300 text-xs uppercase tracking-wide">{t("movie.pricePerSeat")}</p>
            <p className="text-white text-xl font-bold">{formattedPrice} UZS</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/booking`)}
            disabled={availableSeats === 0}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors
                       hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
          >
            {availableSeats === 0 ? t("movie.soldOut") : t("movie.selectSeat")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-gray-300 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  );
}