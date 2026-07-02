import { tr, type Locale } from "./i18n";

export function buildKeyboardMarkup(locale: Locale) {
  // Locale already in the path so next-intl's middleware never needs to
  // redirect the very first request - that redirect happens before any
  // client JS runs and risks losing Telegram's #tgWebAppData hash.
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "")}/${locale}`;
  return {
    keyboard: [
      [{ text: tr(locale, "bot.bookButton"), web_app: { url: appUrl } }],
      [{ text: tr(locale, "bot.kbTickets") }, { text: tr(locale, "bot.kbLanguage") }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}