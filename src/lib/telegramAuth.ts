import crypto from "crypto";

// Telegram Mini Apps: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret_key = HMAC_SHA256(botToken, key="WebAppData")
// expected_hash = HMAC_SHA256(dataCheckString, key=secret_key)
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

interface VerifiedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): { user: VerifiedTelegramUser } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const providedHash = Buffer.from(hash, "hex");

  if (
    computedHash.length !== providedHash.length ||
    !crypto.timingSafeEqual(computedHash, providedHash)
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (typeof user.id !== "number") return null;
    return { user };
  } catch {
    return null;
  }
}
