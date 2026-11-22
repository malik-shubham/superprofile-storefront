// POST /api/publish — save the store and return its public link.
// First publish creates a slug + secret edit token. Sending them back updates it.
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getStore, hasDatabase, rateLimit, saveStore, slugTaken } from "@/lib/db";
import { clientIp, fail, readJson } from "@/lib/http";
import { Store } from "@/lib/schema";

const Body = z.object({
  store: Store,
  slug: z.string().max(60).optional(),
  editToken: z.string().max(64).optional(),
});

function baseSlug(store: Store) {
  const source = store.handle || store.display_name;
  const s = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return s.length >= 3 ? s : `store-${s}`.replace(/-+$/, "");
}

const rand = (n: number) => randomBytes(n).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, n);

export async function POST(req: Request) {
  if (!hasDatabase() && process.env.VERCEL) {
    return fail("Publishing isn't switched on yet. Please try again later.", 503);
  }
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path ?? [];
    const names: Record<string, string> = {
      display_name: "your name",
      bio: "your bio",
      tagline: "your tagline",
      title: "the title",
      short_line: "the one-line hook",
      description: "the description",
      price_inr: "the price",
      whats_included: "what's included",
      price_rationale: "the price note",
    };
    const productNo = path[1] === "products" && typeof path[2] === "number" ? `Product ${path[2] + 1}: ` : "";
    const field = [...path].reverse().find((p) => typeof p === "string" && names[p]) as string | undefined;
    return fail(`${productNo}Please check ${field ? names[field] : "your store"}. It's empty or too long.`);
  }
  const { store, slug, editToken } = parsed.data;

  if (!(await rateLimit("publish", await clientIp(), 30, 3600))) {
    return fail("Too many publishes in a short time. Please wait a little.", 429);
  }

  const now = Date.now();

  // Update an existing store.
  if (slug && editToken) {
    const existing = await getStore(slug);
    if (!existing || existing.editToken !== editToken) {
      return fail("We couldn't verify your edit link. Publish as a new store instead.", 403);
    }
    await saveStore(slug, { ...existing, store, updatedAt: now });
    return Response.json({ ok: true, slug, editToken });
  }

  // New store: find a free slug.
  let newSlug = baseSlug(store);
  for (let i = 0; i < 5 && (await slugTaken(newSlug)); i++) {
    newSlug = `${baseSlug(store)}-${rand(4)}`;
  }
  const token = rand(24);
  await saveStore(newSlug, { store, editToken: token, createdAt: now, updatedAt: now });
  return Response.json({ ok: true, slug: newSlug, editToken: token });
}
