"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Movie } from "@/types";

interface Props {
  movie: Movie;
  availableSeats: number;
  formattedDate: string;
}

export default function MovieCard({ movie, availableSeats, formattedDate }: Props) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();

  const formattedPrice = movie.price.toLocaleString("en-US").replace(/,/g, " ");

  return (
    <div className="flex flex-col max-w-md mx-auto">
      <div className="relative w-full aspect-[2/3]">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
      </div>

      <div className="px-5 -mt-6 relative z-10 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white">{movie.title}</h1>
        <p className="text-gray-400 text-sm leading-relaxed">{movie.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <DetailCard label={t("movie.date")} value={formattedDate} />
          <DetailCard label={t("movie.time")} value={movie.time} />
          <DetailCard label={t("movie.hall")} value={movie.hall} />
          <DetailCard label={t("movie.available")} value={`${availableSeats}`} />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">
              {t("movie.pricePerSeat")}
            </p>
            <p className="text-white text-xl font-bold">{formattedPrice} UZS</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/booking`)}
            disabled={availableSeats === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500
                       text-white font-semibold px-6 py-3 rounded-xl transition-colors"
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
    <div className="bg-gray-900 rounded-xl p-3">
      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  );
}