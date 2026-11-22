# AI Storefront Generator

Build a working web product that turns a creator's Instagram handle or short description into a ready-to-publish, shareable storefront, with clear reasoning behind every decision.

**Live:** https://superprofile-storefront-ten.vercel.app

## What it does
1. A creator describes what they do (English, Hindi or Hinglish), with an optional Instagram handle, follower range and page language.
2. Claude writes a bio and 2–4 product ideas, each with a format, an INR price inside researched bands, a description, what's included, and a "why this price" note.
3. The creator edits any text in place, rewrites the bio or any product with AI (optionally with an instruction), adds or removes products, picks a page style, and can undo AI changes.
4. Publish gives a public link (`/s/your-name`) with product detail pages, WhatsApp link previews, share buttons, and view/tap counts. A private edit link replaces login.

## Run it locally
1. Install [Node.js](https://nodejs.org) 20 or newer.
2. `npm install`
3. Create `.env.local`:
   ```
   ANTHROPIC_API_KEY=your-key-here
   # Optional locally (without these, published stores are kept in memory until restart):
   KV_REST_API_URL=...
   KV_REST_API_TOKEN=...
   ```
4. `npm run dev` and open http://localhost:3000

## Deploy
Vercel → import this repo → add `ANTHROPIC_API_KEY` → Storage → add **Upstash Redis** and connect it to the project (adds the KV env vars) → redeploy.

## How it's built
- **Next.js 16 + Tailwind 4** on Vercel.
- **AI:** Anthropic `claude-haiku-5-5` with structured outputs (Zod schema). Code then checks product count, unique titles, banned claims (income/return/medical guarantees), clamps prices into INR bands and rounds to charm prices. One retry with specific feedback; then a friendly error that keeps the creator's input.
- **Storage:** Upstash Redis for published stores, rate limits and page analytics.
- **No scraping:** the Instagram handle is used only as a name/link.

Key files: `src/lib/ai.ts` (prompt + checks), `src/lib/pricing.ts` (INR bands), `src/components/Builder.tsx` (creator flow).
