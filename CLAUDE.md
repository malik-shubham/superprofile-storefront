@AGENTS.md

# AI Storefront Generator — project memory

Take-home for a PM (AI-native, 0→1) role at SuperProfile. Turns a creator's short
self-description (handle optional) into a ready-to-share storefront: AI bio, 2–4
products with format + INR price, descriptions, edit + regenerate (whole page or one
part), and a public shareable page. Mobile-first.

Deadline: Sun 22 Nov 2026, 5:00 PM IST. Feature freeze 11 AM IST. Submit by 3 PM IST.
Private inputs (brief, JD, build prompt) live in the folder but are gitignored.

## Decisions
- Stack: Next.js 16 (App Router, Turbopack, cacheComponents on) + Tailwind 4, on Vercel from GitHub.
  - Next 16 note: `export const dynamic` is NOT allowed. Use `await connection()` from `next/server` for per-request routes.
- AI: Anthropic API, `claude-haiku-5-5`, server-side only. Key in `ANTHROPIC_API_KEY` env var (.env.local / Vercel settings). Never in code or git.
- Instagram handle: optional; used as name/link/context only. NOT scraped. Handle-only input → ask for one line.
- No login, payments, checkout, scraping.
- Real AI only: no mocked or pre-written output, not even as fallback. Fail → retry once → friendly error that keeps input. Failed regenerate keeps previous version.
- Structured JSON output validated with Zod; prices checked against INR bands in code.
- Guardrails: no income/medical/financial-return promises; match creator's language.
- Abuse/cost: input length limits, per-visitor rate limit, spending limit on API account.
- Branch + PR per layer.

## Progress
- [x] Layer 0 — setup + live hello world. Live: https://superprofile-storefront-ten.vercel.app (auto-deploys from `main`). Repo: github.com/malik-shubham/superprofile-storefront. Key set in .env.local and Vercel.
- [ ] Layer 0.5 — decode & plan
- [ ] Layer 1 — core flow
- [ ] Layer 2 — robustness
- [ ] Layer 3 — evals (EVALS.md)
- [ ] Layer 4 — stretch features
- [ ] Layer 5 — craft
- [ ] Layer 6 — evidence (competitors, FINDINGS.md)
- [ ] Layer 7 — hygiene
- [ ] Layer 8 — decision doc
- [ ] Layer 9 — Loom + submission
- [ ] Layer 10 — interview prep
