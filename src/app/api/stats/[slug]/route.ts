// GET /api/stats/:slug?token=… — views and clicks, visible only to the creator.
import { getStore, stats } from "@/lib/db";
import { fail } from "@/lib/http";

export async function GET(req: Request, ctx: RouteContext<"/api/stats/[slug]">) {
  const { slug } = await ctx.params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const saved = await getStore(slug);
  if (!saved) return fail("Store not found.", 404);
  if (saved.editToken !== token) return fail("Not allowed.", 403);
  return Response.json({ ok: true, ...(await stats(slug, saved.store.products.map((p) => p.id))) });
}
