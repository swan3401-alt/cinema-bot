import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Ticket Scanner",
  description: "Staff ticket verification",
};

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}