// Telegram only appends `#tgWebAppData=...` to the URL that launched the Mini
// App. Client-side navigation (`router.push`/`replace`) rewrites the address
// bar via `history.pushState`, which drops any hash not explicitly included.
// If Telegram later reconstructs the WebView (backgrounding, low memory) it
// reloads from the *current* address-bar URL, so losing the hash here means
// `telegram-web-app.js` has nothing left to parse `initDataUnsafe` from.
// Always carry the hash forward on internal navigation to avoid that.
export function withTgHash(path: string): string {
  if (typeof window === "undefined") return path;
  return window.location.hash ? path + window.location.hash : path;
}
