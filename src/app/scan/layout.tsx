import "../globals.css";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  const adminHref = process.env.ADMIN_SECRET
    ? `/admin?secret=${encodeURIComponent(process.env.ADMIN_SECRET)}`
    : null;

  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        {adminHref && (
          <a
            href={adminHref}
            className="fixed top-3 left-3 z-50 flex items-center gap-1.5 rounded-lg
                       bg-gray-900/70 backdrop-blur-md border border-white/10 px-3 py-1.5
                       text-sm text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Admin
          </a>
        )}
        {children}
      </body>
    </html>
  );
}