// Storage for published stores, rate limits and page analytics.
// Production: Upstash Redis (added through Vercel → Storage). Its env vars are
// read automatically. Local dev without those vars: an in-memory store that
// resets when the dev server restarts (stores only, never AI output).
import { Redis } from "@upstash/redis";
import type { Store } from "./schema";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const hasDatabase = () => redis !== null;

// In-memory fallback (kept on globalThis so hot reloads don't wipe it).
type Mem = { kv: Map<string, unknown>; exp: Map<string, number> };
const g = globalThis as unknown as { __mem?: Mem };
const mem: Mem = (g.__mem ??= { kv: new Map(), exp: new Map() });

function memAlive(key: string) {
  const e = mem.exp.get(key);
  if (e && e < Date.now()) {
    mem.kv.delete(key);
    mem.exp.delete(key);
  }
  return mem.kv.has(key);
}

async function get<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  return memAlive(key) ? (mem.kv.get(key) as T) : null;
}
async function set(key: string, value: unknown): Promise<void> {
  if (redis) {
    await redis.set(key, value);
    return;
  }
  mem.kv.set(key, value);
}
async function incr(key: string, ttlSeconds?: number): Promise<number> {
  if (redis) {
    const n = await redis.incr(key);
    if (ttlSeconds && n === 1) await redis.expire(key, ttlSeconds);
    return n;
  }
  const n = ((memAlive(key) ? (mem.kv.get(key) as number) : 0) || 0) + 1;
  mem.kv.set(key, n);
  if (ttlSeconds && n === 1) mem.exp.set(key, Date.now() + ttlSeconds * 1000);
  return n;
}
async function exists(key: string): Promise<boolean> {
  if (redis) return (await redis.exists(key)) === 1;
  return memAlive(key);
}

// ---------- published stores ----------
export type SavedStore = { store: Store; editToken: string; createdAt: number; updatedAt: number };

const storeKey = (slug: string) => `store:${slug}`;

export async function getStore(slug: string): Promise<SavedStore | null> {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  return get<SavedStore>(storeKey(slug));
}
export async function saveStore(slug: string, saved: SavedStore) {
  await set(storeKey(slug), saved);
}
export async function slugTaken(slug: string) {
  return exists(storeKey(slug));
}

// ---------- rate limiting ----------
/** Fixed window limiter. Returns true if the call is allowed. */
export async function rateLimit(bucket: string, id: string, limit: number, windowSeconds: number) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const n = await incr(`rl:${bucket}:${id}:${window}`, windowSeconds);
  return n <= limit;
}

// ---------- analytics ----------
export async function track(slug: string, event: "view" | "click", productId?: string) {
  await incr(`stat:${slug}:${event}`);
  if (event === "click" && productId) await incr(`stat:${slug}:click:${productId}`);
}
export async function stats(slug: string, productIds: string[]) {
  const [views, clicks, ...per] = await Promise.all([
    get<number>(`stat:${slug}:view`),
    get<number>(`stat:${slug}:click`),
    ...productIds.map((id) => get<number>(`stat:${slug}:click:${id}`)),
  ]);
  return {
    views: Number(views) || 0,
    clicks: Number(clicks) || 0,
    byProduct: Object.fromEntries(productIds.map((id, i) => [id, Number(per[i]) || 0])),
  };
}
