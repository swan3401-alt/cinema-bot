import { tr, type Locale } from "./i18n";

export function buildKeyboardMarkup(locale: Locale) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  return {
    keyboard: [
      [{ text: tr(locale, "bot.bookButton"), web_app: { url: appUrl } }],
      [{ text: tr(locale, "bot.kbTickets") }, { text: tr(locale, "bot.kbLanguage") }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}