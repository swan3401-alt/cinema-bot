"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type ScanState = "idle" | "scanning" | "result";

interface VerifyResponse {
  ok: boolean;
  reason?: string;
  booking?: {
    movieTitle: string;
    row: number;
    number: number;
    hall: string;
    time: string;
  };
}

export default function ScanPage() {
  const params = useSearchParams();
  const secret = params.get("secret") ?? "";

  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<any>(null);
  const lastTokenRef = useRef<string>("");

  const handleToken = useCallback(
    async (token: string) => {
      if (busy || token === lastTokenRef.current) return;
      lastTokenRef.current = token;
      setBusy(true);

      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, secret }),
        });
        const data: VerifyResponse = await res.json();
        setResult(data);
        setState("result");

        // Stop the camera while showing the result
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => {});
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, secret]
  );

  async function startScanner() {
    setState("scanning");
    setResult(null);

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText: string) => handleToken(decodedText),
      () => {} // ignore per-frame decode errors
    );
  }

  function scanAgain() {
    lastTokenRef.current = "";
    startScanner();
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  if (!secret) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <p className="text-gray-400 text-center">
          Access denied. A valid staff link is required.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold text-center pt-2">Ticket Scanner</h1>

      {state === "idle" && (
        <button
          onClick={startScanner}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl mt-6"
        >
          Start scanning
        </button>
      )}

      {state === "scanning" && (
        <div className="flex flex-col gap-3">
          <div id="qr-reader" className="rounded-xl overflow-hidden" />
          <p className="text-gray-400 text-sm text-center">Point the camera at the ticket QR</p>
        </div>
      )}

      {state === "result" && result && (
        <div className="flex flex-col gap-4 pt-4">
          <ResultCard result={result} />
          <button
            onClick={scanAgain}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl"
          >
            Scan next ticket
          </button>
        </div>
      )}
    </main>
  );
}

function ResultCard({ result }: { result: VerifyResponse }) {
  const messages: Record<string, { title: string; color: string }> = {
    OK: { title: "✓ VALID — Admit", color: "bg-green-600" },
    ALREADY_USED: { title: "✕ ALREADY USED", color: "bg-orange-600" },
    NOT_PAID: { title: "✕ NOT PAID", color: "bg-red-600" },
    NOT_FOUND: { title: "✕ INVALID TICKET", color: "bg-red-600" },
    CANCELLED: { title: "✕ CANCELLED", color: "bg-red-600" },
  };

  const key = result.ok ? "OK" : result.reason ?? "NOT_FOUND";
  const m = messages[key] ?? messages.NOT_FOUND;

  return (
    <div className="rounded-2xl overflow-hidden">
      <div className={`${m.color} px-5 py-6 text-center`}>
        <p className="text-2xl font-bold">{m.title}</p>
      </div>
      {result.booking && (
        <div className="bg-gray-900 px-5 py-4 flex flex-col gap-2 text-sm">
          <Row label="Movie" value={result.booking.movieTitle} />
          <Row label="Hall" value={result.booking.hall} />
          <Row label="Time" value={result.booking.time} />
          <Row label="Seat" value={`Row ${result.booking.row}, Seat ${result.booking.number}`} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}