import type { Itinerary } from "@/lib/schema";

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Floating local times (no TZ suffix) so events show at the destination's local hour. */
function stamp(date: string, time: string, addMinutes = 0): string {
  const d = new Date(`${date}T${time}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + addMinutes);
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

export function buildIcs(itinerary: Itinerary): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events = itinerary.days.flatMap((day) =>
    day.activities.map((a) =>
      [
        "BEGIN:VEVENT",
        `UID:${a.id}-${day.date}@wanderly`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(day.date, a.time)}`,
        `DTEND:${stamp(day.date, a.time, Math.max(15, a.durationMin))}`,
        `SUMMARY:${escape(a.title)}`,
        `DESCRIPTION:${escape([a.description, a.tip].filter(Boolean).join("\n\n"))}`,
        `LOCATION:${escape(a.address || a.title)}`,
        `GEO:${a.lat};${a.lng}`,
        "END:VEVENT",
      ].join("\r\n"),
    ),
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wanderly//AI Travel Planner//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(itinerary.title)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "trip";
}
