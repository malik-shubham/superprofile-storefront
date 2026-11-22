// POST /api/track — count a page view or a product click on a public store.
import { z } from "zod";
import { getStore, rateLimit, track } from "@/lib/db";
import { clientIp, readJson } from "@/lib/http";

const Body = z.object({
  slug: z.string().max(60),
  event: z.enum(["view", "click"]),
  productId: z.string().max(20).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return new Response(null, { status: 204 });
  const { slug, event, productId } = parsed.data;
  try {
    // Light dedupe/abuse guard: max 60 events per visitor per store per hour.
    if (!(await rateLimit(`track:${slug}`, await clientIp(), 60, 3600))) return new Response(null, { status: 204 });
    if (!(await getStore(slug))) return new Response(null, { status: 204 });
    await track(slug, event, productId);
  } catch (err) {
    console.error("track failed", err); // analytics must never break the page
  }
  return new Response(null, { status: 204 });
}
