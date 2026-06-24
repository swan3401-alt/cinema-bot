import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminHeader from "@/components/admin/AdminHeader";
import HallBuilder from "@/components/admin/HallBuilder";

export const dynamic = "force-dynamic";

export default async function HallsPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  if (!isAdmin(secret)) notFound();

  return (
    <main className="max-w-4xl mx-auto px-5 py-8">
      <AdminHeader secret={secret!} title="Halls" />
      <HallBuilder secret={secret!} />
    </main>
  );
}