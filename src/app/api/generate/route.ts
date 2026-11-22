// POST /api/generate — creator input → full AI store (or a follow-up question).
import { generateStore } from "@/lib/ai";
import { checkAiLimit, fail, handleError, readJson } from "@/lib/http";
import { CreatorInput } from "@/lib/schema";

export async function POST(req: Request) {
  const body = await readJson(req);
  const parsed = CreatorInput.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Please check your details and try again.");
  }
  const input = parsed.data;

  // Handle only (we don't read Instagram) or nothing at all → ask, don't guess.
  if (input.description.replace(/\s+/g, "").length < 2) {
    return Response.json({
      ok: true,
      status: "need_more_info",
      question: input.handle
        ? `We don't read Instagram profiles, so tell us in one line: what do you post about as @${input.handle}, and who follows you?`
        : "Tell us in one line: what do you teach or post about, and who follows you?",
    });
  }

  const limited = await checkAiLimit();
  if (limited) return limited;

  try {
    const result = await generateStore(input);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return handleError(err);
  }
}
