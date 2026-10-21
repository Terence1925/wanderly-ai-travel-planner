import { addDays } from "@/lib/itinerary";
import { tripLength, type StreamEvent, type TripRequest } from "@/lib/schema";
import { findSample } from "./samples";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Replays a sample trip as a stream so demo mode looks and behaves exactly like
 * real generation. The sample is re-dated to the traveller's chosen dates.
 */
export async function* demoTripEvents(request: TripRequest, delayMs = 220): AsyncGenerator<StreamEvent> {
  const { sample, exactMatch } = findSample(request.destination);
  const it = sample.itinerary;
  const days = Math.min(tripLength(request.startDate, request.endDate), it.days.length);

  yield {
    type: "meta",
    title: it.title,
    summary: exactMatch
      ? it.summary
      : `Demo mode: AI generation isn't connected, so here's a sample ${it.destination.name} trip instead of ${request.destination}. ${it.summary}`,
    destination: it.destination,
    currency: it.currency,
  };

  for (const d of it.days.slice(0, days)) {
    await sleep(delayMs * 2);
    const { activities, ...header } = d;
    yield { type: "day", ...header, date: addDays(request.startDate, d.day - 1) };
    for (const a of activities) {
      await sleep(delayMs);
      yield { type: "activity", day: d.day, ...a };
    }
  }

  await sleep(delayMs);
  if (it.budget && it.localTips) {
    yield { type: "extras", budget: it.budget, packing: it.packing, localTips: it.localTips };
  }
  yield { type: "done", demo: true };
}
