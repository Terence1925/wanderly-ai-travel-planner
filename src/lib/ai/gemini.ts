import "server-only";
import { LineBuffer, parseEventLine } from "@/lib/ndjson";
import type { StreamEvent } from "@/lib/schema";

// Measured on the free tier (Oct 2026): full Flash models queued 75-130s before the first token,
// while Flash-Lite wrote a whole 3-day itinerary in ~5s. Override with GEMINI_MODEL.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface StreamOptions {
  system: string;
  prompt: string;
  signal?: AbortSignal;
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Streams Gemini output over the REST API's server-sent events and yields each
 * NDJSON line that validates. Plain fetch keeps this dependency-free and Node 18-compatible.
 */
export async function* streamGeminiEvents({ system, prompt, signal }: StreamOptions): AsyncGenerator<StreamEvent> {
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 32000 },
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini request failed", res.status, detail.slice(0, 500));
    throw new GeminiError(`Gemini returned ${res.status}`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const sse = new LineBuffer();
  const lines = new LineBuffer();
  let finishReason: string | undefined;

  const handleText = function* (text: string): Generator<StreamEvent> {
    for (const line of lines.push(text)) {
      const parsed = parseEventLine(line);
      if (parsed) yield parsed;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const sseLine of sse.push(decoder.decode(value, { stream: true }))) {
      if (!sseLine.startsWith("data:")) continue;
      let chunk: GeminiChunk;
      try {
        chunk = JSON.parse(sseLine.slice(5)) as GeminiChunk;
      } catch {
        continue;
      }
      if (chunk.promptFeedback?.blockReason) {
        yield { type: "error", message: "The AI declined this request. Try rephrasing your notes." };
        return;
      }
      const candidate = chunk.candidates?.[0];
      finishReason = candidate?.finishReason ?? finishReason;
      for (const part of candidate?.content?.parts ?? []) {
        // Thought summaries aren't itinerary output.
        if (part.text && !part.thought) yield* handleText(part.text);
      }
    }
  }
  for (const line of lines.flush()) {
    const parsed = parseEventLine(line);
    if (parsed) yield parsed;
  }

  if (finishReason === "MAX_TOKENS") {
    yield { type: "error", message: "The plan was cut short. Try fewer days or a slower pace." };
  } else if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
    yield { type: "error", message: "The AI declined this request. Try rephrasing your notes." };
  }
}
