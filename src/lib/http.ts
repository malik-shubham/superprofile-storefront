// Small helpers shared by the API routes.
import { headers } from "next/headers";
import { FriendlyError } from "./ai";
import { rateLimit } from "./db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

/** Per-visitor limits so a public link can't burn the AI budget. */
export async function checkAiLimit(): Promise<Response | null> {
  const ip = await clientIp();
  const perHour = await rateLimit("ai-hour", ip, 40, 3600);
  const perDay = await rateLimit("ai-day", ip, 120, 86400);
  if (!perHour || !perDay) {
    return fail("You've made a lot of requests. Please wait a little and try again.", 429);
  }
  return null;
}

export function handleError(err: unknown) {
  if (err instanceof FriendlyError) return fail(err.message, err.status);
  console.error(err);
  return fail("Something went wrong on our side. Please try again.", 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    if (text.length > 30_000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
