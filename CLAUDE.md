@AGENTS.md

# AI Storefront Generator — project memory

Take-home for a PM (AI-native, 0→1) role at SuperProfile. Turns a creator's short
self-description (handle optional) into a ready-to-share storefront: AI bio, 2–4
products with format + INR price, descriptions, edit + regenerate (whole page or one
part), and a public shareable page. Mobile-first.

Private inputs (brief, JD, build prompt) live in the folder but are gitignored.

## Decisions
- Stack: Next.js 16 (App Router, Turbopack) + Tailwind 4, on Vercel from GitHub.
  - `cacheComponents` is OFF on purpose (simpler dynamic pages). `export const dynamic` is not used.
- AI: Anthropic API, `claude-haiku-5-5`, effort `low`, structured outputs via `messages.parse` + `zodOutputFormat`. Server-side only. Key in `ANTHROPIC_API_KEY`.
- Storage: Upstash Redis (Vercel → Storage). Env: `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`_TOKEN`. Local dev without them uses in-memory (resets on restart). On Vercel without Redis, publish returns a friendly 503.
- Instagram handle: optional; name/link only. NOT scraped. Handle-only → ask one line.
- No login: publish returns a secret edit token → private edit link `/edit/:slug?token=`.
- Real AI only, no pre-written fallback. Fail → friendly error, input kept; failed rewrite keeps previous version; Undo after AI changes.
- Prices: AI picks inside bands (src/lib/pricing.ts); code clamps + charm-rounds. Editor shows "typical range" hint.
- Guardrails: banned-claim regex → retry once with feedback → else show a review warning to the creator.
- Abuse: input limits (Zod), AI rate limit 40/h + 120/day per IP, publish 30/h, track 60/h per store per IP.

## Map
- `src/lib/ai.ts` prompts, model call, checks, retries
- `src/lib/pricing.ts` formats, audience tiers, INR bands, charm pricing
- `src/lib/schema.ts` Zod schemas + limits
- `src/lib/db.ts` Redis/in-memory: stores, rate limits, analytics
- `src/components/Builder.tsx` creator flow (input → follow-up → generating → editor → published)
- `src/components/StoreView.tsx` store rendering (public + editable)
- Pages: `/`, `/s/[slug]`, `/s/[slug]/p/[id]`, `/edit/[slug]`
- API: generate, regenerate (bio | product | add), publish, store/[slug], track, stats/[slug]

## Progress
- [x] Layer 0 — live hello world. Live: https://superprofile-storefront-ten.vercel.app
- [x] Milestone 1 (user chose one-phase build instead of layers 0.5–5): full product built; 20/20 local end-to-end checks pass + 11 input edge cases.
- [x] Upstash Redis (storefront-db, Mumbai, free) connected on Vercel; PR #1 merged; 20/20 checks pass on the live site.
- [~] PR polish-1: instant input form (no blank first paint), rewrite instructions enforced, agent notes back in repo.
- [ ] User phone test of the full checklist on the live link
- Note: preview deployments are behind Vercel login (Deployment Protection); automated checks run against production.
- Note: test script published a test store `easy-yoga-studio` on the live DB.
- [ ] Evals (EVALS.md), pricing research write-up, competitor scan, FINDINGS.md
- [ ] Decision doc, Loom, submission, interview prep
