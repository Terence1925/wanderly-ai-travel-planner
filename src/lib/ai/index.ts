import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { StreamEvent } from "@/lib/schema";
import { streamClaudeEvents } from "./claude";
import { GeminiError, streamGeminiEvents } from "./gemini";

type Provider = "anthropic" | "gemini";

/**
 * AI_PROVIDER picks the model vendor explicitly; otherwise whichever key is present wins.
 * The rest of the app only sees validated NDJSON events, so providers are interchangeable.
 */
function activeProvider(): Provider | null {
  const choice = process.env.AI_PROVIDER?.toLowerCase();
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  if (choice === "gemini") return hasGemini ? "gemini" : null;
  if (choice === "anthropic" || choice === "claude") return hasClaude ? "anthropic" : null;
  if (hasClaude) return "anthropic";
  if (hasGemini) return "gemini";
  return null;
}

export function isAiConfigured(): boolean {
  return activeProvider() !== null;
}

export function streamAiEvents(options: {
  system: string;
  prompt: string;
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  return activeProvider() === "gemini" ? streamGeminiEvents(options) : streamClaudeEvents(options);
}

export function describeAiError(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "The AI is busy right now. Try again in a minute.";
  if (error instanceof Anthropic.AuthenticationError) return "The AI key is invalid. Check ANTHROPIC_API_KEY.";
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach the AI service. Check your connection.";
  if (error instanceof Anthropic.APIError) return "The AI service returned an error. Please try again.";
  if (error instanceof GeminiError) {
    if (error.status === 429) return "The free AI quota is used up for now. Try again later.";
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return "The AI key or model is invalid. Check GEMINI_API_KEY and GEMINI_MODEL.";
    }
    if (error.status === 404) return "That Gemini model wasn't found. Check GEMINI_MODEL.";
    return "The AI service returned an error. Please try again.";
  }
  return "Something went wrong while planning. Please try again.";
}
