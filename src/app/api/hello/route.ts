// Layer 0 smoke test: one real Claude call made on the server.
// The API key is read from the ANTHROPIC_API_KEY environment variable
// and never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";

export async function GET() {
  await connection(); // run on every request, never pre-built or cached
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { ok: false, error: "ANTHROPIC_API_KEY is not set on this server." },
      { status: 500 },
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content:
            "Write one warm, short line (max 20 words) welcoming an Indian creator who is about to build their first online store.",
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return Response.json({ ok: true, model: response.model, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
