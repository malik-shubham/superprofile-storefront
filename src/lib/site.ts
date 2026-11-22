// The public address of the site, used for every link a creator shares.
// Deployment-specific Vercel URLs (previews, "Visit" links) sit behind Vercel's
// login, so shared links must never be built from them.
// Order: PUBLIC_SITE_URL (manual override) → Vercel's production domain → none.
export function publicOrigin(): string | undefined {
  const explicit = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return prod ? `https://${prod}` : undefined;
}
