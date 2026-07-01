"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { withTgHash } from "@/lib/telegramNav";

export interface SessionView {
  sessionId: string;
  title: string;
  description: string;
  posterUrl: string;
  time: string;
  hall: string;
  price: number;
  availableSeats: number;
  dateLabel: string;
}

export default function MovieCarousel({ sessions }: { sessions: SessionView[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = sessions.length > 1;
  const [hasSwiped, setHasSwiped] = useState(false);

  // One-time "peek" so users see the track can move sideways
useEffect(() => {
  if (!many) return;
  const el = trackRef.current;
  if (!el) return;
  const timer = setTimeout(() => {
    el.scrollTo({ left: 36, behavior: "smooth" });            // nudge right
    setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 450); // settle back
  }, 700); // after the poster has rendered
  return () => clearTimeout(timer);
}, [many]);

  // Track which slide is in view from horizontal scroll position
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      // raf = requestAnimationFrame(() => {
      //   const w = el.clientWidth || 1;
      //   setIndex(Math.round(el.scrollLeft / w));
      // });
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        setIndex(i);
        if (el.scrollLeft > 8) setHasSwiped(true); // any real horizontal movement counts
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);



  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative max-w-md mx-auto">
      {/* Horizontal pager */}
      <div
        ref={trackRef}
        className="flex h-[100svh] overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-x-contain
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {sessions.map((s) => (
          <SessionSlide key={s.sessionId} session={s} />
        ))}
      </div>

      {/* Page dots */}
      {many && (
        <div className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-40 flex gap-1.5">
          {sessions.map((s, i) => (
            <span
              key={s.sessionId}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Desktop arrows */}
      {many && (
        <>
          <ArrowButton side="left" show={index > 0} onClick={() => goTo(index - 1)} />
          <ArrowButton side="right" show={index < sessions.length - 1} onClick={() => goTo(index + 1)} />
        </>
      )}

      {/* Swipe affordance - right-edge hint until the user swipes once */}
      {many && index < sessions.length - 1 && !hasSwiped && (
        <div className="pointer-events-none fixed inset-y-0 right-0 z-30 flex items-center pr-2
                        sm:hidden transition-opacity duration-500">
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-950/50 to-transparent" />
          <svg
            className="relative w-7 h-7 text-white/90 drop-shadow-lg animate-[nudge_1.4s_ease-in-out_infinite]"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      )}
    </div>
  );
}

function ArrowButton({
  side, show, onClick,
}: { side: "left" | "right"; show: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-hidden={!show}
      className={`hidden sm:flex fixed top-1/2 -translate-y-1/2 z-40 h-10 w-10 items-center justify-center
                  rounded-full bg-gray-950/40 backdrop-blur-md border border-white/10 text-white
                  transition-opacity ${show ? "opacity-80 hover:opacity-100" : "opacity-0 pointer-events-none"}
                  ${side === "left" ? "left-2" : "right-2"}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={side === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function SessionSlide({ session }: { session: SessionView }) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const slideRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Chevron hint fades once THIS slide is scrolled vertically
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 24);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const formattedPrice = session.price.toLocaleString("en-US").replace(/,/g, " ");
  const soldOut = session.availableSeats <= 0;

  return (
    <div
      ref={slideRef}
      className="relative w-full shrink-0 basis-full snap-start h-[100svh] overflow-y-auto overscroll-y-contain
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Poster — sticky within this slide, pinned from the start */}
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <Image src={session.posterUrl} alt={session.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />

        <div
          className={`pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 z-10
                      transition-opacity duration-500 ${scrolled ? "opacity-0" : "opacity-80"}`}
        >
          <svg className="w-8 h-8 text-white animate-bounce drop-shadow-lg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 14l6-6 6 6" /><path d="M6 19l6-6 6 6" />
          </svg>
        </div>
      </div>

      {/* Content rises over the pinned poster */}
      <div className="relative z-10 -mt-6 flex flex-col gap-4 rounded-t-3xl border-t border-white/10
                      bg-gray-950/30 backdrop-blur-sm px-5 pt-6 pb-10">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">{session.title}</h1>

        {session.description && (
          <p className="text-gray-100 text-sm leading-relaxed drop-shadow">{session.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <DetailCard label={t("movie.date")} value={session.dateLabel} />
          <DetailCard label={t("movie.time")} value={session.time} />
          <DetailCard label={t("movie.hall")} value={session.hall} />
          <DetailCard label={t("movie.available")} value={`${session.availableSeats}`} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-gray-300 text-xs uppercase tracking-wide">{t("movie.pricePerSeat")}</p>
            <p className="text-white text-xl font-bold">{formattedPrice} UZS</p>
          </div>
          <button
            onClick={() => router.push(withTgHash(`/${locale}/booking?sessionId=${session.sessionId}`))}
            disabled={soldOut}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors
                       hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400"
          >
            {soldOut ? t("movie.soldOut") : t("movie.selectSeat")}
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