import { describe, expect, it } from "vitest";
import { LineBuffer, encodeEvent, parseEventLine, readEventStream } from "@/lib/ndjson";
import { buildIcs } from "@/lib/export/ics";
import { SAMPLE_TRIPS } from "@/lib/demo/samples";
import type { StreamEvent } from "@/lib/schema";

describe("LineBuffer", () => {
  it("only emits complete lines across arbitrary chunk boundaries", () => {
    const buf = new LineBuffer();
    expect(buf.push('{"a":')).toEqual([]);
    expect(buf.push('1}\n{"b"')).toEqual(['{"a":1}']);
    expect(buf.push(":2}\n\n")).toEqual(['{"b":2}']);
    expect(buf.flush()).toEqual([]);
  });

  it("flushes a trailing line with no newline", () => {
    const buf = new LineBuffer();
    buf.push('{"done":true}');
    expect(buf.flush()).toEqual(['{"done":true}']);
  });
});

describe("parseEventLine", () => {
  it("accepts valid events", () => {
    expect(parseEventLine('{"type":"done"}')).toEqual({ type: "done" });
  });

  it.each([
    ["code fences", "```json"],
    ["invalid JSON", "{nope"],
    ["unknown types", '{"type":"hack"}'],
    ["out-of-range coordinates", '{"type":"meta","title":"t","summary":"s","destination":{"name":"n","country":"c","lat":999,"lng":0},"currency":"USD"}'],
  ])("rejects %s", (_label, line) => {
    expect(parseEventLine(line)).toBeNull();
  });
});

describe("repairing common model JSON slips", () => {
  const extrasBody =
    '"budget":{"accommodationPerNight":6500,"foodPerDay":400,"transportPerDay":300},' +
    '"packing":[{"item":"Reef-safe sunscreen","reason":"Protects coral"}],' +
    '"localTips":{"language":"Filipino","phrases":[{"phrase":"Salamat","meaning":"Thank you"}],' +
    '"etiquette":["Remove shoes indoors"],"tipping":"10% appreciated","plugType":"Type A","emergencyNumber":"911"}';

  it("recovers a merged type key, as written by Gemini Flash-Lite", () => {
    const event = parseEventLine(`{"type":"extras":{${extrasBody}}}`);
    expect(event?.type).toBe("extras");
    if (event?.type !== "extras") return;
    expect(event.budget.accommodationPerNight).toBe(6500);
    expect(event.packing[0]?.item).toBe("Reef-safe sunscreen");
    expect(event.localTips.language).toBe("Filipino");
  });

  it("recovers trailing commas", () => {
    expect(parseEventLine('{"type":"reply","text":"Hi",}')).toEqual({ type: "reply", text: "Hi" });
  });

  it("still rejects lines it can't safely repair", () => {
    expect(parseEventLine('{"type":"extras":{"budget":')).toBeNull();
  });
});

describe("readEventStream", () => {
  it("parses an NDJSON response split into tiny chunks and skips bad lines", async () => {
    const events: StreamEvent[] = [
      { type: "reply", text: "Hi" },
      { type: "done" },
    ];
    const payload = encodeEvent(events[0]!) + "garbage line\n" + encodeEvent(events[1]!);
    const bytes = new TextEncoder().encode(payload);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 5) controller.enqueue(bytes.slice(i, i + 5));
        controller.close();
      },
    });
    const received: StreamEvent[] = [];
    await readEventStream(new Response(stream), (e) => received.push(e));
    expect(received).toEqual(events);
  });
});

describe("buildIcs", () => {
  it("creates one event per activity with escaped text", () => {
    const it = SAMPLE_TRIPS[0].itinerary;
    const ics = buildIcs({ ...it, title: "Trip, with; specials" });
    const count = it.days.reduce((n, d) => n + d.activities.length, 0);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(count);
    expect(ics).toContain("X-WR-CALNAME:Trip\\, with\\; specials");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });
});
