import { Suspense } from "react";
import ScannerClient from "./ScannerClient";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 flex items-center justify-center">
          <p className="text-gray-400">Loading…</p>
        </main>
      }
    >
      <ScannerClient />
    </Suspense>
  );
}