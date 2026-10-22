import { z } from "zod";
import { describeAiError, isAiConfigured, streamAiEvents } from "@/lib/ai";
import { CHAT_SYSTEM, buildChatPrompt } from "@/lib/ai/prompts";
import { jsonError, ndjsonResponse } from "@/lib/api/stream-response";
import { checkAiLimits } from "@/lib/rate-limit";
import { itinerarySchema, type StreamEvent } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  itinerary: itinerarySchema,
});

async function* demoReply(): AsyncGenerator<StreamEvent> {
  yield {
    type: "reply",
    text: "I'm running in demo mode, so I can't edit trips with AI yet. Add an ANTHROPIC_API_KEY to enable chat edits. Meanwhile, you can drag activities to reorder them, move them between days, or add your own.",
  };
  yield { type: "done", demo: true };
}

async function* aiReply(prompt: string, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  yield* streamAiEvents({ system: CHAT_SYSTEM, prompt, signal });
  yield { type: "done" };
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid chat request", 400);

  if (!isAiConfigured()) return ndjsonResponse(demoReply(), describeAiError);

  const limit = await checkAiLimits(req.headers, "chat");
  if (!limit.ok) return jsonError(limit.message, 429);

  const prompt = buildChatPrompt(parsed.data.itinerary, parsed.data.message);
  return ndjsonResponse(aiReply(prompt, req.signal), describeAiError);
}
