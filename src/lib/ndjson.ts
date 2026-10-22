import { streamEventSchema, type StreamEvent } from "@/lib/schema";

/**
 * Accumulates text chunks and yields complete lines. Model output and network
 * chunks both split mid-line, so a line is only emitted once its newline arrives.
 */
export class LineBuffer {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const parts = this.buffer.split("\n");
    this.buffer = parts.pop() ?? "";
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  flush(): string[] {
    const rest = this.buffer.trim();
    this.buffer = "";
    return rest ? [rest] : [];
  }
}

/** Parses one line into a validated event, or null if it is not a valid event. */
export function parseEventLine(line: string): StreamEvent | null {
  // Models occasionally wrap output in code fences; those lines are noise.
  if (line.startsWith("```")) return null;
  for (const candidate of [line, ...repairCandidates(line)]) {
    try {
      const result = streamEventSchema.safeParse(JSON.parse(candidate));
      if (result.success) return result.data;
    } catch {
      // Try the next repair.
    }
  }
  return null;
}

const MERGED_TYPE = /^\{\s*"type"\s*:\s*"(\w+)"\s*:\s*\{/;

/**
 * Smaller models make a few predictable JSON slips. Fixing them here keeps a whole
 * line (e.g. budget + packing + tips) from being thrown away over one misplaced brace.
 */
export function repairCandidates(line: string): string[] {
  const candidates: string[] = [];
  // {"type":"extras":{...}}  →  {"type":"extras",...}
  const merged = line.match(MERGED_TYPE);
  if (merged) {
    const body = line.slice(merged[0].length).replace(/\}\s*$/, "");
    candidates.push(`{"type":"${merged[1]}",${body}`);
  }
  // Trailing commas before a closing bracket.
  const noTrailingCommas = line.replace(/,\s*([}\]])/g, "$1");
  if (noTrailingCommas !== line) candidates.push(noTrailingCommas);
  return candidates;
}

export function encodeEvent(event: StreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Reads an NDJSON fetch response and calls onEvent for every valid event. */
export async function readEventStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("Empty response from server");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const lines = new LineBuffer();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of lines.push(decoder.decode(value, { stream: true }))) {
      const event = parseEventLine(line);
      if (event) onEvent(event);
    }
  }
  for (const line of lines.flush()) {
    const event = parseEventLine(line);
    if (event) onEvent(event);
  }
}
