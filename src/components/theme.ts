// Three page styles a creator can pick. Each is a set of Tailwind classes.
import type { Theme } from "@/lib/schema";

export type ThemeTokens = {
  label: string;
  page: string; // page background + text
  card: string; // product card
  muted: string; // secondary text
  accent: string; // buttons, price chip
  accentSoft: string; // soft highlight
  border: string;
  avatar: string;
  swatch: string; // tiny preview in the picker
};

export const THEME: Record<Theme, ThemeTokens> = {
  minimal: {
    label: "Clean",
    page: "bg-white text-zinc-900",
    card: "bg-white border border-zinc-200 shadow-sm",
    muted: "text-zinc-600",
    accent: "bg-violet-600 text-white",
    accentSoft: "bg-violet-50 text-violet-800",
    border: "border-zinc-200",
    avatar: "bg-violet-100 text-violet-700",
    swatch: "bg-white border-violet-600",
  },
  warm: {
    label: "Warm",
    page: "bg-[#FFF7EE] text-stone-900",
    card: "bg-white border border-orange-100 shadow-sm",
    muted: "text-stone-600",
    accent: "bg-orange-600 text-white",
    accentSoft: "bg-orange-100 text-orange-900",
    border: "border-orange-200",
    avatar: "bg-orange-200 text-orange-900",
    swatch: "bg-[#FFF7EE] border-orange-600",
  },
  bold: {
    label: "Bold",
    page: "bg-zinc-950 text-zinc-50",
    card: "bg-zinc-900 border border-zinc-800",
    muted: "text-zinc-400",
    accent: "bg-lime-400 text-zinc-950",
    accentSoft: "bg-lime-400/15 text-lime-300",
    border: "border-zinc-800",
    avatar: "bg-lime-400 text-zinc-950",
    swatch: "bg-zinc-950 border-lime-400",
  },
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const s = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? ""));
  return s.toUpperCase() || "★";
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
