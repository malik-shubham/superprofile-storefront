// Shapes of the data the app works with, defined once with Zod.
// Zod checks data at runtime: if the AI (or a browser) sends something with
// the wrong shape, we catch it instead of showing a broken page.
import { z } from "zod";
import { AUDIENCES, FORMATS } from "./pricing";

export const LANGUAGES = ["english", "hinglish", "hindi"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABELS: Record<Language, string> = {
  english: "English",
  hinglish: "Hinglish",
  hindi: "हिंदी",
};

export const THEMES = ["minimal", "warm", "bold"] as const;
export type Theme = (typeof THEMES)[number];

export const LIMITS = {
  description: 600,
  handle: 30,
  name: 60,
  tagline: 120,
  bio: 600,
  title: 80,
  shortLine: 160,
  description_long: 1200,
  included: 120,
  rationale: 300,
  instruction: 200,
};

// ---------- What the creator types in ----------
export const HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/;

export const CreatorInput = z.object({
  description: z.string().trim().max(LIMITS.description).default(""),
  handle: z
    .string()
    .trim()
    .transform((s) => s.replace(/^@/, ""))
    .refine((s) => s === "" || HANDLE_RE.test(s), "Instagram handles use only letters, numbers, dots and underscores.")
    .default(""),
  audience: z.enum(AUDIENCES),
  language: z.enum(LANGUAGES),
});
export type CreatorInput = z.infer<typeof CreatorInput>;

// ---------- What the AI must return (sent to the model as a JSON schema) ----------
// Kept simple on purpose: business rules (2–4 products, price bands, banned
// claims) are checked in code afterwards, so they can be enforced exactly.
export const AIProduct = z.object({
  title: z.string(),
  format: z.enum(FORMATS),
  price_inr: z.number(),
  short_line: z.string(),
  description: z.string(),
  whats_included: z.array(z.string()),
  price_rationale: z.string(),
});

export const AIStore = z.object({
  status: z.enum(["ok", "need_more_info"]),
  follow_up_question: z.string(),
  niche: z.string(),
  display_name: z.string(),
  tagline: z.string(),
  bio: z.string(),
  products: z.array(AIProduct),
});
export type AIStore = z.infer<typeof AIStore>;

export const AIBio = z.object({ tagline: z.string(), bio: z.string() });
export const AIOneProduct = z.object({ product: AIProduct });

// ---------- The store the app saves and renders ----------
export const Product = z.object({
  id: z.string().max(20),
  title: z.string().trim().min(1).max(LIMITS.title),
  format: z.enum(FORMATS),
  price_inr: z.number().int().min(0).max(100000),
  short_line: z.string().trim().max(LIMITS.shortLine),
  description: z.string().trim().max(LIMITS.description_long),
  whats_included: z.array(z.string().trim().max(LIMITS.included)).max(8),
  price_rationale: z.string().trim().max(LIMITS.rationale),
});
export type Product = z.infer<typeof Product>;

export const Store = z.object({
  display_name: z.string().trim().min(1).max(LIMITS.name),
  handle: z.string().max(LIMITS.handle).default(""),
  niche: z.string().max(60).default(""),
  tagline: z.string().trim().max(LIMITS.tagline),
  bio: z.string().trim().min(1).max(LIMITS.bio),
  products: z.array(Product).min(1).max(4),
  theme: z.enum(THEMES),
  language: z.enum(LANGUAGES),
  audience: z.enum(AUDIENCES),
});
export type Store = z.infer<typeof Store>;

export type Warning = { field: string; message: string };
