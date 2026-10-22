import "server-only";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { getSupabaseServer } from "@/lib/supabase/server";

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

/**
 * The site owner (OWNER_EMAILS, comma-separated) isn't rate limited. The email comes from
 * Supabase's server-side getUser(), which verifies the session token, so it can't be spoofed.
 */
async function isOwner(): Promise<boolean> {
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (owners.length === 0) return false;
  const supabase = await getSupabaseServer();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  return Boolean(email && data.user?.email_confirmed_at && owners.includes(email));
}

export type AiAction = "generate" | "chat";
export type LimitResult = { ok: true } | { ok: false; message: string };

const LIMITS: Record<AiAction, { hourly: () => number; daily: () => number; noun: string }> = {
  generate: {
    hourly: () => Number(process.env.AI_HOURLY_LIMIT_PER_IP ?? 5),
    daily: () => Number(process.env.AI_DAILY_LIMIT ?? 50),
    noun: "trip generations",
  },
  chat: {
    hourly: () => Number(process.env.AI_CHAT_HOURLY_LIMIT_PER_IP ?? 20),
    daily: () => Number(process.env.AI_CHAT_DAILY_LIMIT ?? 300),
    noun: "assistant messages",
  },
};

/**
 * Trips and chat have separate allowances, so chatting never uses up trip generations.
 * Each checks the per-visitor hourly limit, then a site-wide daily budget.
 */
export async function checkAiLimits(headers: Headers, action: AiAction): Promise<LimitResult> {
  if (await isOwner()) return { ok: true };

  const limit = LIMITS[action];
  // IPs are hashed so the table never stores raw addresses.
  const ipHash = createHash("sha256").update(clientIp(headers)).digest("hex").slice(0, 32);
  // Trip generation keeps its original key so existing counters carry over.
  const ipKey = action === "generate" ? `ip:${ipHash}` : `ip:${ipHash}:${action}`;
  const dailyKey = action === "generate" ? "global:daily" : `global:daily:${action}`;

  if (!(await consume(ipKey, limit.hourly(), HOUR))) {
    return { ok: false, message: `You've used this hour's free ${limit.noun} for this demo. Try again later.` };
  }
  if (!(await consume(dailyKey, limit.daily(), DAY))) {
    return {
      ok: false,
      message: `Today's free ${limit.noun} for this demo are used up. Sample trips are still available.`,
    };
  }
  return { ok: true };
}
