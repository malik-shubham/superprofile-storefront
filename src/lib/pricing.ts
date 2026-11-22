// INR price bands by product format and audience size.
// The AI picks a price inside the band; code then clamps it and rounds to a
// "charm" price (ending in 9) so prices never drift outside the band.
//
// Bands are ESTIMATES informed by public listings (Topmate call prices and
// category medians, Indian ebook listings at ₹99–₹499). See PLAN.md → Pricing.

export const FORMATS = [
  "ebook",
  "template_pack",
  "recorded_course",
  "cohort_course",
  "one_on_one_call",
  "workshop",
  "community",
] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  ebook: "Ebook / Guide",
  template_pack: "Template pack",
  recorded_course: "Recorded course",
  cohort_course: "Live cohort course",
  one_on_one_call: "1:1 call",
  workshop: "Live workshop",
  community: "Community (monthly)",
};

export const AUDIENCES = ["starting", "small", "mid", "large"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  starting: "Just starting (under 1K)",
  small: "1K – 10K followers",
  mid: "10K – 50K followers",
  large: "50K+ followers",
};

type Band = [min: number, max: number];

export const PRICE_BANDS: Record<Format, Record<Audience, Band>> = {
  ebook: { starting: [99, 299], small: [149, 399], mid: [199, 499], large: [249, 699] },
  template_pack: { starting: [149, 399], small: [199, 499], mid: [249, 799], large: [299, 999] },
  recorded_course: { starting: [499, 1499], small: [699, 1999], mid: [999, 2999], large: [1499, 4999] },
  cohort_course: { starting: [999, 2999], small: [1499, 3999], mid: [1999, 4999], large: [2999, 7999] },
  one_on_one_call: { starting: [299, 799], small: [499, 999], mid: [699, 1499], large: [999, 2499] },
  workshop: { starting: [99, 299], small: [149, 499], mid: [199, 699], large: [299, 999] },
  community: { starting: [99, 299], small: [149, 399], mid: [199, 499], large: [249, 799] },
};

export function bandFor(format: Format, audience: Audience): Band {
  return PRICE_BANDS[format][audience];
}

/** Round to a familiar Indian price point: …49 or …99 (or 99/149/199 at the low end). */
export function charmPrice(n: number): number {
  if (n <= 99) return 99;
  const hundreds = Math.floor(n / 100);
  const candidates = [hundreds * 100 - 1, hundreds * 100 + 49, hundreds * 100 + 99];
  return candidates.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best));
}

/** Clamp into band, then charm-round, staying inside the band. */
export function fixPrice(price: number, format: Format, audience: Audience): { price: number; adjusted: boolean } {
  const [min, max] = bandFor(format, audience);
  const raw = Number.isFinite(price) ? Math.round(price) : min;
  let p = charmPrice(Math.min(Math.max(raw, min), max));
  if (p < min) p = min;
  if (p > max) p = max;
  return { price: p, adjusted: p !== raw };
}

/** Text table of bands for the AI prompt. */
export function bandsForPrompt(audience: Audience): string {
  return FORMATS.map((f) => {
    const [min, max] = bandFor(f, audience);
    return `- ${f} (${FORMAT_LABELS[f]}): ₹${min}–₹${max}`;
  }).join("\n");
}
