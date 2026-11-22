// GET /api/store/:slug?token=… — load a published store back into the editor.
import { getStore } from "@/lib/db";
import { fail } from "@/lib/http";

export async function GET(req: Request, ctx: RouteContext<"/api/store/[slug]">) {
  const { slug } = await ctx.params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const saved = await getStore(slug);
  if (!saved) return fail("We couldn't find this store.", 404);
  if (saved.editToken !== token) return fail("This edit link isn't valid.", 403);
  return Response.json({ ok: true, store: saved.store });
}
