import { describeAiError, isAiConfigured, streamAiEvents } from "@/lib/ai";
import { GENERATE_SYSTEM, buildGeneratePrompt } from "@/lib/ai/prompts";
import { jsonError, ndjsonResponse } from "@/lib/api/stream-response";
import { demoTripEvents } from "@/lib/demo/stream";
import { checkAiLimits } from "@/lib/rate-limit";
import { tripRequestSchema, type StreamEvent, type TripRequest } from "@/lib/schema";

export const runtime = "nodejs";
// Vercel Hobby allows up to 60s; long trips need most of it.
export const maxDuration = 60;

async function* aiTripEvents(request: TripRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  yield* streamAiEvents({ system: GENERATE_SYSTEM, prompt: buildGeneratePrompt(request), signal });
  yield { type: "done" };
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = tripRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid trip details", 400);
  }

  if (!isAiConfigured()) {
    return ndjsonResponse(demoTripEvents(parsed.data), describeAiError);
  }

  const limit = await checkAiLimits(req.headers);
  if (!limit.ok) return jsonError(limit.message, 429);

  return ndjsonResponse(aiTripEvents(parsed.data, req.signal), describeAiError);
}
