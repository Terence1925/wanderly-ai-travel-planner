import type { Activity, Day, Itinerary, StreamEvent, TripRequest } from "@/lib/schema";

export function emptyItinerary(request: Pick<TripRequest, "destination">): Itinerary {
  return {
    title: `Trip to ${request.destination}`,
    summary: "",
    destination: { name: request.destination, country: "", lat: 0, lng: 0 },
    currency: "USD",
    days: [],
    packing: [],
  };
}

const byTime = (a: Activity, b: Activity) => a.time.localeCompare(b.time);

/** Pure reducer: folds one stream event into an itinerary. Never mutates input. */
export function applyEvent(itinerary: Itinerary, event: StreamEvent): Itinerary {
  switch (event.type) {
    case "meta": {
      const { type: _type, ...meta } = event;
      return { ...itinerary, ...meta };
    }
    case "day": {
      const { type: _type, ...day } = event;
      const existing = itinerary.days.find((d) => d.day === day.day);
      const merged: Day = { ...day, activities: existing?.activities ?? [] };
      const days = existing
        ? itinerary.days.map((d) => (d.day === day.day ? merged : d))
        : [...itinerary.days, merged].sort((a, b) => a.day - b.day);
      return { ...itinerary, days };
    }
    case "activity": {
      const { type: _type, day: dayNumber, ...activity } = event;
      const hasDay = itinerary.days.some((d) => d.day === dayNumber);
      // Activities can arrive before their day header if the model skips a line.
      const days = hasDay
        ? itinerary.days
        : [...itinerary.days, placeholderDay(itinerary, dayNumber)].sort((a, b) => a.day - b.day);
      return {
        ...itinerary,
        days: days.map((d) =>
          d.day === dayNumber
            ? { ...d, activities: upsert(d.activities, activity).sort(byTime) }
            : d,
        ),
      };
    }
    case "extras":
      return {
        ...itinerary,
        budget: event.budget,
        packing: event.packing,
        localTips: event.localTips,
      };
    case "replace_day": {
      const { type: _type, ...day } = event;
      const exists = itinerary.days.some((d) => d.day === day.day);
      const days = exists
        ? itinerary.days.map((d) => (d.day === day.day ? day : d))
        : [...itinerary.days, day].sort((a, b) => a.day - b.day);
      return { ...itinerary, days };
    }
    default:
      return itinerary;
  }
}

function upsert(list: Activity[], item: Activity): Activity[] {
  return list.some((a) => a.id === item.id)
    ? list.map((a) => (a.id === item.id ? item : a))
    : [...list, item];
}

function placeholderDay(itinerary: Itinerary, day: number): Day {
  const first = itinerary.days[0];
  const date = first ? addDays(first.date, day - first.day) : new Date().toISOString().slice(0, 10);
  return { day, date, title: `Day ${day}`, summary: "", activities: [] };
}

export function addDays(isoDate: string, amount: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function newId(prefix = "a"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface BudgetBreakdown {
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
  total: number;
  perPerson: number;
  perDay: { day: number; activities: number }[];
}

/**
 * Activity costs are per person; daily food/transport estimates are per person;
 * accommodation is per room-night, assuming two travellers share a room.
 */
export function computeBudget(itinerary: Itinerary, travelers: number): BudgetBreakdown {
  const people = Math.max(1, travelers);
  const dayCount = itinerary.days.length;
  const nights = Math.max(0, dayCount - 1);
  const rooms = Math.ceil(people / 2);

  const perDay = itinerary.days.map((d) => ({
    day: d.day,
    activities: d.activities.reduce((sum, a) => sum + a.cost, 0) * people,
  }));
  const activities = perDay.reduce((sum, d) => sum + d.activities, 0);
  const accommodation = (itinerary.budget?.accommodationPerNight ?? 0) * nights * rooms;
  const food = (itinerary.budget?.foodPerDay ?? 0) * dayCount * people;
  const transport = (itinerary.budget?.transportPerDay ?? 0) * dayCount * people;
  const total = accommodation + food + activities + transport;

  return {
    accommodation,
    food,
    activities,
    transport,
    total,
    perPerson: total / people,
    perDay,
  };
}

/** Moves an activity to another day, keeping that day sorted by time. */
export function moveActivity(itinerary: Itinerary, activityId: string, toDay: number): Itinerary {
  let moving: Activity | undefined;
  const without = itinerary.days.map((d) => {
    const found = d.activities.find((a) => a.id === activityId);
    if (found) moving = found;
    return found ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d;
  });
  if (!moving) return itinerary;
  const item = moving;
  return {
    ...itinerary,
    days: without.map((d) =>
      d.day === toDay ? { ...d, activities: [...d.activities, item].sort(byTime) } : d,
    ),
  };
}

/** Reorders activities inside a day and reassigns the original time slots in order. */
export function reorderActivities(
  itinerary: Itinerary,
  dayNumber: number,
  fromIndex: number,
  toIndex: number,
): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((d) => {
      if (d.day !== dayNumber) return d;
      const slots = d.activities.map((a) => a.time);
      const next = [...d.activities];
      const [item] = next.splice(fromIndex, 1);
      if (!item) return d;
      next.splice(toIndex, 0, item);
      return { ...d, activities: next.map((a, i) => ({ ...a, time: slots[i] ?? a.time })) };
    }),
  };
}

export function removeActivity(itinerary: Itinerary, activityId: string): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((d) => ({
      ...d,
      activities: d.activities.filter((a) => a.id !== activityId),
    })),
  };
}

export function addActivity(itinerary: Itinerary, dayNumber: number, activity: Activity): Itinerary {
  return {
    ...itinerary,
    days: itinerary.days.map((d) =>
      d.day === dayNumber ? { ...d, activities: [...d.activities, activity].sort(byTime) } : d,
    ),
  };
}
