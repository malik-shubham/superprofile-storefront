# AI Storefront Generator

Build a working web product that turns a creator's Instagram handle or short description into a ready-to-publish, shareable storefront, with clear reasoning behind every decision.

> Work in progress. Live link and full docs coming soon.

## Run it locally

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Clone this repo and install packages:
   ```bash
   npm install
   ```
3. Create a file named `.env.local` in the project folder with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your-key-here
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000

## Stack
Next.js 16 + Tailwind CSS, deployed on Vercel. AI: Anthropic API (`claude-haiku-5-5`), called only from the server.
