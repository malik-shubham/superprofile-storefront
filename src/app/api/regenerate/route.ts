// POST /api/regenerate — rewrite one part of the store (bio or one product).
import { z } from "zod";
import { regenerateBio, regenerateProduct } from "@/lib/ai";
import { checkAiLimit, fail, handleError, readJson } from "@/lib/http";
import { LIMITS, Store } from "@/lib/schema";

const Body = z.object({
  store: Store,
  part: z.enum(["bio", "product"]),
  index: z.number().int().min(0).max(3).optional(),
  instruction: z.string().max(LIMITS.instruction).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Some fields look wrong. Please check your edits and try again.");
  const { store, part, index, instruction } = parsed.data;

  const limited = await checkAiLimit();
  if (limited) return limited;

  try {
    if (part === "bio") {
      return Response.json({ ok: true, ...(await regenerateBio(store, instruction)) });
    }
    // index === products.length means "add a new product" (max 4).
    if (index === undefined || index > store.products.length || index > 3) return fail("Which product should we rewrite?");
    return Response.json({ ok: true, ...(await regenerateProduct(store, index, instruction)) });
  } catch (err) {
    return handleError(err);
  }
}
