import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  if (!isAdmin(secret)) notFound(); // wrong/missing secret -> 404, reveals nothing

  // Light stats so the dashboard is useful at a glance
  const [halls, movies, sessions] = await Promise.all([
    prisma.hall.count(),
    prisma.movie.count(),
    prisma.session.count(),
  ]);

  const s = `?secret=${encodeURIComponent(secret!)}`;
  const scanHref = process.env.STAFF_SECRET
    ? `/scan?secret=${encodeURIComponent(process.env.STAFF_SECRET)}`
    : null;

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-bold mb-1">Cinema Admin</h1>
      <p className="text-gray-400 text-sm mb-8">Manage halls, movies, and showtimes.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard
          href={`/admin/halls${s}`}
          title="Halls"
          desc="Build and save seat layouts"
          count={halls}
          countLabel="halls"
        />
        <SectionCard
          href={`/admin/movies${s}`}
          title="Movies"
          desc="Add films and posters"
          count={movies}
          countLabel="movies"
        />
        <SectionCard
          href={`/admin/sessions${s}`}
          title="Sessions"
          desc="Schedule showtimes"
          count={sessions}
          countLabel="sessions"
        />
        
        {scanHref && (
          <a
            href={scanHref}
            className="block rounded-2xl border border-white/10 bg-gray-900/60 p-5 transition-colors hover:bg-gray-900"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Scanner</h2>
              <span className="text-sm text-gray-400">tickets</span>
            </div>
            <p className="mt-1 text-sm text-gray-400">Open the entrance QR scanner</p>
          </a>
        )}

      </div>
    </main>
  );
}

function SectionCard({
  href, title, desc, count, countLabel,
}: {
  href: string; title: string; desc: string; count: number; countLabel: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-gray-900/60 p-5 transition-colors hover:bg-gray-900"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-gray-400">{count} {countLabel}</span>
      </div>
      <p className="mt-1 text-sm text-gray-400">{desc}</p>
    </Link>
  );
}