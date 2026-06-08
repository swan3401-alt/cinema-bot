import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HomeButton from "@/components/HomeButton";
import TelegramLocaleSync from "@/components/TelegramLocaleSync";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cinema Booking",
  description: "Book your cinema tickets",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-gray-950 text-white min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <TelegramLocaleSync />
          <div className="flex justify-between items-center px-4 py-3 max-w-md mx-auto">
            <HomeButton />
            <LanguageSwitcher />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}