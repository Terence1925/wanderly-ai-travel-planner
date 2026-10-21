import "server-only";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

const HOUR = 3600;
const DAY = 86_400;

const memory = new Map<string, { start: number; count: number }>();

/**
 * Fallback for local dev or when Supabase isn't configured. Per server instance only,
 * so on serverless it is best-effort; the Supabase-backed limiter is authoritative.
 */
function consumeInMemory(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

async function consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  // Supabase's newer "secret" key replaces the legacy service_role key; either works.
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return consumeInMemory(key, limit, windowSeconds);

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return consumeInMemory(key, limit, windowSeconds);
  }
  return data === true;
}

function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export type LimitResult = { ok: true } | { ok: false; message: string };

/** Checks the per-visitor hourly limit, then the global daily budget. */
export async function checkAiLimits(headers: Headers): Promise<LimitResult> {
  const perIp = Number(process.env.AI_HOURLY_LIMIT_PER_IP ?? 5);
  const daily = Number(process.env.AI_DAILY_LIMIT ?? 50);
  // IPs are hashed so the table never stores raw addresses.
  const ipKey = `ip:${createHash("sha256").update(clientIp(headers)).digest("hex").slice(0, 32)}`;

  if (!(await consume(ipKey, perIp, HOUR))) {
    return { ok: false, message: "You've hit the hourly AI limit for this demo. Try again later." };
  }
  if (!(await consume("global:daily", daily, DAY))) {
    return {
      ok: false,
      message: "Today's AI budget for this demo is used up. Sample trips are still available.",
    };
  }
  return { ok: true };
}
