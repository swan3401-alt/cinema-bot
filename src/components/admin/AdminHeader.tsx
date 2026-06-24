import Link from "next/link";

export default function AdminHeader({ secret, title }: { secret: string; title: string }) {
  const s = `?secret=${encodeURIComponent(secret)}`;
  return (
    <header className="mb-6 flex items-center gap-3">
      <Link
        href={`/admin${s}`}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Admin
      </Link>
      <span className="text-gray-600">/</span>
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}