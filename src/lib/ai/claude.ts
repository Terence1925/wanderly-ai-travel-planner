import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LineBuffer, parseEventLine } from "@/lib/ndjson";
import type { StreamEvent } from "@/lib/schema";

export const DEFAULT_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

interface StreamOptions {
  system: string;
  prompt: string;
  signal?: AbortSignal;
}

/**
 * Streams Claude's NDJSON output and yields each line that validates against the
 * event schema. Invalid lines are dropped rather than failing the whole request.
 */
export async function* streamClaudeEvents({
  system,
  prompt,
  signal,
}: StreamOptions): AsyncGenerator<StreamEvent> {
  const stream = getClient().beta.messages.stream(
    {
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 32000,
      // Itinerary writing is breadth over depth; low effort keeps time-to-first-card short.
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: prompt }],
      // If a safety classifier declines, the API retries on a fallback model in-call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal },
  );

  const lines = new LineBuffer();
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      for (const line of lines.push(event.delta.text)) {
        const parsed = parseEventLine(line);
        if (parsed) yield parsed;
      }
    }
  }
  for (const line of lines.flush()) {
    const parsed = parseEventLine(line);
    if (parsed) yield parsed;
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield { type: "error", message: "The AI declined this request. Try rephrasing your notes." };
  } else if (final.stop_reason === "max_tokens") {
    yield { type: "error", message: "The plan was cut short. Try fewer days or a slower pace." };
  }
}

