import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import MovieManager from "@/components/admin/MovieManager";

export const dynamic = "force-dynamic";

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  if (!isAdmin(secret)) notFound();

  return (
    <main className="max-w-4xl mx-auto px-5 py-8">
      <AdminHeader secret={secret!} title="Movies" />
      <MovieManager secret={secret!} />
    </main>
  );
}