export function isAdmin(secret: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET;
  return !!expected && secret === expected;
}