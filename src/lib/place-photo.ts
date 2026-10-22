export interface PlacePhoto {
  url: string;
  pageTitle: string;
  pageUrl: string;
}

// Leading phrases like "Lunch at", "Sunset stroll on" describe the activity, not the place.
const ACTIVITY_PREFIX =
  /^(?:(?:early|late|light|quick|casual|romantic|sunset|sunrise|evening|morning|night|guided)\s+)*(?:breakfast|brunch|lunch|dinner|drinks|coffee|snacks?|grazing|visit|explore|exploring|stroll|walk|wander|hike|swim|shopping|cruise|tour|dessert)\b.*?\b(?:at|on|in|along|near|by|through|around|to)\s+/i;

const STOP_WORDS = new Set([
  "the", "and", "with", "from", "into", "near", "your", "local", "tour", "visit", "walk",
  "lunch", "dinner", "breakfast", "evening", "morning", "night", "time", "free",
]);

/** Turns an activity title into the most likely place name to search for. */
export function cleanPlaceQuery(title: string): string {
  return title
    .replace(ACTIVITY_PREFIX, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[&+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

interface WikiPage {
  index?: number;
  title: string;
  fullurl?: string;
  thumbnail?: { source: string };
}

/**
 * Picks the best-ranked search result that has a photo and actually shares a meaningful
 * word with the place name. The destination itself doesn't count, so "Dinner in Kyoto"
 * won't be illustrated with a generic Kyoto photo.
 */
export function pickPhoto(pages: WikiPage[], query: string, destination: string): PlacePhoto | null {
  const exclude = new Set(tokens(destination));
  const wanted = tokens(query).filter((t) => !exclude.has(t));
  if (wanted.length === 0) return null;

  const ranked = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const page of ranked) {
    if (!page.thumbnail?.source) continue;
    const titleTokens = new Set(tokens(page.title));
    if (wanted.some((t) => titleTokens.has(t))) {
      return {
        url: page.thumbnail.source,
        pageTitle: page.title,
        pageUrl: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      };
    }
  }
  return null;
}

const cache = new Map<string, Promise<PlacePhoto | null>>();

// Be a polite API client: at most a few requests in flight at once.
const MAX_CONCURRENT = 4;
let active = 0;
const queue: (() => void)[] = [];

async function withLimit<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active += 1;
  try {
    return await task();
  } finally {
    active -= 1;
    queue.shift()?.();
  }
}

/** Finds a Wikipedia photo for an activity, or null. Results are cached per session. */
export function fetchPlacePhoto(title: string, destination: string): Promise<PlacePhoto | null> {
  const query = cleanPlaceQuery(title);
  const key = `${query}|${destination}`.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = withLimit(async () => {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${query} ${destination}`,
      gsrlimit: "4",
      prop: "pageimages|info",
      piprop: "thumbnail",
      pithumbsize: "800",
      inprop: "url",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
    const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
    return pickPhoto(Object.values(data.query?.pages ?? {}), query, destination);
  }).catch(() => {
    // Only genuine "no match" answers are cached; network errors get retried next time.
    cache.delete(key);
    return null;
  });

  cache.set(key, promise);
  return promise;
}
