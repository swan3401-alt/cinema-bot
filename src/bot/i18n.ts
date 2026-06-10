import { prisma } from "@/lib/prisma";
import en from "../messages/en.json";
import ru from "../messages/ru.json";
import uz from "../messages/uz.json";

const SUPPORTED = ["uz", "ru", "en"] as const;
type Locale = (typeof SUPPORTED)[number];

const messages: Record<Locale, Record<string, unknown>> = { uz, ru, en };

/** Resolve a dotted key like "bot.welcome" from the locale's message tree. */
function resolve(tree: Record<string, unknown>, key: string): string | undefined {
  return key.split(".").reduce<unknown>(
    (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
    tree
  ) as string | undefined;
}

/** Pick the locale: stored /language preference -> Telegram language_code -> uz. */
export async function resolveLocale(
  telegramId: string,
  languageCode?: string
): Promise<Locale> {
  const pref = await prisma.userPref.findUnique({ where: { telegramId } });
  if (pref && SUPPORTED.includes(pref.locale as Locale)) return pref.locale as Locale;
  if (languageCode && SUPPORTED.includes(languageCode as Locale)) return languageCode as Locale;
  return "uz";
}

/** Translate with simple {placeholder} interpolation. */
export function tr(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const raw = resolve(messages[locale], key) ?? resolve(messages.en, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}