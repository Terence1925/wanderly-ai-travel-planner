import { describe, expect, it } from "vitest";
import {
  addDays,
  applyEvent,
  computeBudget,
  emptyItinerary,
  moveActivity,
  removeActivity,
  reorderActivities,
} from "@/lib/itinerary";
import { SAMPLE_TRIPS } from "@/lib/demo/samples";
import { parseEventLine } from "@/lib/ndjson";
import { itinerarySchema, tripLength, tripRequestSchema, type Activity } from "@/lib/schema";

const act = (id: string, time: string, cost = 0): Activity => ({
  id,
  time,
  title: id,
  description: "",
  category: "food",
  durationMin: 60,
  cost,
  lat: 1,
  lng: 1,
  address: "",
  tip: "",
});

const base = () => {
  let it = emptyItinerary({ destination: "Testville" });
  it = applyEvent(it, { type: "day", day: 1, date: "2026-05-01", title: "One", summary: "" });
  it = applyEvent(it, { type: "day", day: 2, date: "2026-05-02", title: "Two", summary: "" });
  for (const [day, a] of [
    [1, act("a", "09:00", 10)],
    [1, act("b", "12:00", 20)],
    [1, act("c", "18:00")],
    [2, act("d", "10:00", 5)],
  ] as const) {
    it = applyEvent(it, { type: "activity", day, ...a });
  }
  return it;
};

describe("applyEvent", () => {
  it("builds days and keeps activities sorted by time", () => {
    let it = emptyItinerary({ destination: "X" });
    it = applyEvent(it, { type: "day", day: 1, date: "2026-05-01", title: "T", summary: "" });
    it = applyEvent(it, { type: "activity", day: 1, ...act("late", "20:00") });
    it = applyEvent(it, { type: "activity", day: 1, ...act("early", "08:00") });
    expect(it.days[0]?.activities.map((a) => a.id)).toEqual(["early", "late"]);
  });

  it("creates a placeholder day when an activity arrives before its header", () => {
    const it = applyEvent(base(), { type: "activity", day: 3, ...act("z", "09:00") });
    expect(it.days.map((d) => d.day)).toEqual([1, 2, 3]);
    expect(it.days[2]?.date).toBe("2026-05-03");
  });

  it("replace_day swaps a whole day without touching others", () => {
    const before = base();
    const after = applyEvent(before, {
      type: "replace_day",
      day: 1,
      date: "2026-05-01",
      title: "New",
      summary: "",
      activities: [act("x", "11:00")],
    });
    expect(after.days[0]?.title).toBe("New");
    expect(after.days[1]).toBe(before.days[1]);
  });

  it("does not mutate its input", () => {
    const before = base();
    const snapshot = JSON.stringify(before);
    applyEvent(before, { type: "activity", day: 1, ...act("new", "07:00") });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("editing", () => {
  it("reorders within a day and reassigns the original time slots", () => {
    const it = reorderActivities(base(), 1, 2, 0);
    const day = it.days[0]!;
    expect(day.activities.map((a) => a.id)).toEqual(["c", "a", "b"]);
    expect(day.activities.map((a) => a.time)).toEqual(["09:00", "12:00", "18:00"]);
  });

  it("moves an activity to another day", () => {
    const it = moveActivity(base(), "a", 2);
    expect(it.days[0]?.activities.map((a) => a.id)).toEqual(["b", "c"]);
    expect(it.days[1]?.activities.map((a) => a.id)).toEqual(["a", "d"]);
  });

  it("returns the same object when moving an unknown activity", () => {
    const it = base();
    expect(moveActivity(it, "missing", 2)).toBe(it);
  });

  it("removes an activity", () => {
    const it = removeActivity(base(), "b");
    expect(it.days[0]?.activities.map((a) => a.id)).toEqual(["a", "c"]);
  });
});

describe("computeBudget", () => {
  const withCategories = () => {
    const it = base();
    // base(): day 1 = a (10), b (20), c (0); day 2 = d (5). Re-categorise a few stops.
    const recat: Record<string, Activity["category"]> = { a: "culture", b: "food", d: "transport" };
    return {
      ...it,
      days: it.days.map((day) => ({
        ...day,
        activities: day.activities.map((x) => ({ ...x, category: recat[x.id] ?? x.category })),
      })),
    };
  };

  it("files listed stops under their category, per person", () => {
    const b = computeBudget(withCategories(), 2);
    expect(b.activities).toBe(10 * 2);
    expect(b.food).toBe((20 + 0) * 2);
    expect(b.transport).toBe(5 * 2);
    expect(b.accommodation).toBe(0);
    expect(b.hasEstimates).toBe(false);
  });

  it("adds daily estimates on top and shares rooms between two travellers", () => {
    const it = { ...withCategories(), budget: { accommodationPerNight: 100, foodPerDay: 30, transportPerDay: 10 } };
    const b = computeBudget(it, 3);
    expect(b.accommodation).toBe(100 * 1 * 2); // 2 days → 1 night, 3 people → 2 rooms
    expect(b.food).toBe(20 * 3 + 30 * 2 * 3);
    expect(b.transport).toBe(5 * 3 + 10 * 2 * 3);
    expect(b.activities).toBe(10 * 3);
    expect(b.total).toBe(b.activities + b.accommodation + b.food + b.transport);
    expect(b.perPerson).toBeCloseTo(b.total / 3);
    expect(b.hasEstimates).toBe(true);
    expect(b.perDay).toEqual([
      { day: 1, listed: 30 * 3 },
      { day: 2, listed: 5 * 3 },
    ]);
  });

  it("handles an empty itinerary", () => {
    const b = computeBudget(emptyItinerary({ destination: "X" }), 0);
    expect(b.total).toBe(0);
    expect(b.perDay).toEqual([]);
  });
});

describe("lenient extras", () => {
  it("trims over-long lists and text instead of rejecting the budget and tips", () => {
    const line = JSON.stringify({
      type: "extras",
      budget: { accommodationPerNight: "2500", foodPerDay: 800, transportPerDay: -5 },
      packing: Array.from({ length: 40 }, (_, i) => ({ item: `Item ${i}` })),
      localTips: {
        language: "Filipino",
        phrases: Array.from({ length: 12 }, (_, i) => ({ phrase: `P${i}`, meaning: "m" })),
        etiquette: Array.from({ length: 9 }, () => "Be kind"),
        tipping: "x".repeat(500),
        plugType: "Type A",
        emergencyNumber: "911",
      },
    });
    const event = parseEventLine(line);
    expect(event?.type).toBe("extras");
    if (event?.type !== "extras") return;
    expect(event.budget).toEqual({ accommodationPerNight: 2500, foodPerDay: 800, transportPerDay: 0 });
    expect(event.packing).toHaveLength(30);
    expect(event.localTips.phrases).toHaveLength(8);
    expect(event.localTips.etiquette).toHaveLength(6);
    expect(event.localTips.tipping).toHaveLength(200);
  });
});

describe("dates and requests", () => {
  it("counts trip length inclusively across month ends", () => {
    expect(tripLength("2026-01-30", "2026-02-02")).toBe(4);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("rejects trips that end before they start or run too long", () => {
    const ok = { destination: "Kyoto", startDate: "2026-05-01", endDate: "2026-05-04", travelers: 2, budget: "moderate", styles: [], pace: "balanced" };
    expect(tripRequestSchema.safeParse(ok).success).toBe(true);
    expect(tripRequestSchema.safeParse({ ...ok, endDate: "2026-04-30" }).success).toBe(false);
    expect(tripRequestSchema.safeParse({ ...ok, endDate: "2026-06-01" }).success).toBe(false);
  });
});

describe("demo samples", () => {
  it.each(SAMPLE_TRIPS.map((s) => [s.slug, s] as const))("%s is a valid itinerary with unique ids", (_slug, s) => {
    expect(itinerarySchema.safeParse(s.itinerary).success).toBe(true);
    const ids = s.itinerary.days.flatMap((d) => d.activities.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
