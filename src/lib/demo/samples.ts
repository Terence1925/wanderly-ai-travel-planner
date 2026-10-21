import type { Activity, Day, Itinerary } from "@/lib/schema";

type A = [
  id: string,
  time: string,
  title: string,
  category: Activity["category"],
  durationMin: number,
  cost: number,
  lat: number,
  lng: number,
  description: string,
  tip?: string,
];

const act = ([id, time, title, category, durationMin, cost, lat, lng, description, tip = ""]: A): Activity => ({
  id,
  time,
  title,
  category,
  durationMin,
  cost,
  lat,
  lng,
  description,
  address: "",
  tip,
});

const day = (n: number, title: string, summary: string, activities: A[]): Day => ({
  day: n,
  date: "2000-01-01", // re-dated to the traveller's dates when served
  title,
  summary,
  activities: activities.map(act),
});

export interface SampleTrip {
  slug: string;
  keywords: string[];
  coverQuery: string;
  itinerary: Itinerary;
}

const kyoto: SampleTrip = {
  slug: "kyoto",
  keywords: ["kyoto", "japan", "osaka", "nara"],
  coverQuery: "Kyoto",
  itinerary: {
    title: "Temples, Tea & Lantern-Lit Lanes",
    summary:
      "Three unhurried days through Kyoto's shrines, bamboo forests and old merchant streets. Early starts beat the crowds; evenings are for Gion's lantern-lit alleys.",
    destination: { name: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681 },
    currency: "JPY",
    days: [
      day(1, "Vermilion Gates & Old Kyoto", "Shrines in the morning, market snacking at noon, geisha district at dusk.", [
        ["d1a1", "07:00", "Fushimi Inari Taisha", "culture", 150, 0, 34.96714, 135.77267, "Climb through thousands of vermilion torii gates winding up Mount Inari. The higher you go, the quieter it gets.", "Arrive before 8am; most visitors turn back at the Yotsutsuji viewpoint."],
        ["d1a2", "10:30", "Kiyomizu-dera", "sightseeing", 90, 500, 34.99485, 135.78504, "The famous wooden stage juts out over the hillside with views across the city. Walk down through Sannenzaka's preserved lanes afterwards."],
        ["d1a3", "12:30", "Lunch at Nishiki Market", "food", 90, 2500, 35.00505, 135.76478, "Five blocks of stalls selling pickles, tamagoyaki, grilled seafood skewers and matcha sweets.", "Eating while walking is frowned upon; eat at the stall."],
        ["d1a4", "15:30", "Tea ceremony in Gion", "culture", 60, 4000, 35.00367, 135.7751, "A guided matcha ceremony in a traditional machiya townhouse, with seasonal wagashi sweets."],
        ["d1a5", "18:00", "Hanamikoji & Pontocho evening", "nightlife", 120, 0, 35.00557, 135.77096, "Stroll Gion's lantern-lit main street, then cross to narrow Pontocho alley for riverside izakaya."],
        ["d1a6", "19:30", "Dinner on Pontocho", "food", 90, 5000, 35.0049, 135.7712, "Kaiseki-style small plates or yakitori with a view of the Kamo River.", "Summer brings kawayuka decks built out over the river."],
      ]),
      day(2, "Bamboo Groves of Arashiyama", "Western Kyoto's forests, a Zen garden, and the Golden Pavilion.", [
        ["d2a1", "07:30", "Arashiyama Bamboo Grove", "nature", 45, 0, 35.01703, 135.67143, "Towering green stalks creak in the wind along a short path. Magical before the tour buses arrive."],
        ["d2a2", "08:30", "Coffee at % Arabica Arashiyama", "food", 30, 600, 35.01336, 135.67691, "A tiny riverside espresso bar facing Togetsukyo Bridge and the mountains."],
        ["d2a3", "09:15", "Tenryu-ji Temple", "culture", 75, 800, 35.01582, 135.67376, "A UNESCO-listed Zen temple whose 14th-century pond garden borrows the mountains as scenery."],
        ["d2a4", "12:30", "Kinkaku-ji (Golden Pavilion)", "sightseeing", 60, 500, 35.03937, 135.72924, "The gold-leaf pavilion reflected in Mirror Pond is Kyoto's most photographed view."],
        ["d2a5", "14:00", "Ryoan-ji rock garden", "culture", 60, 600, 35.03446, 135.71826, "Fifteen stones raked in white gravel; from any seat, one is always hidden. Sit and look for a while."],
        ["d2a6", "19:00", "Dinner near Kyoto Station", "food", 90, 3000, 34.98582, 135.75879, "Kyoto Ramen Koji on the station's 10th floor gathers famous ramen shops from across Japan."],
      ]),
      day(3, "The Philosopher's Path", "A gentle eastern Higashiyama walk between temples and canals.", [
        ["d3a1", "08:30", "Ginkaku-ji (Silver Pavilion)", "culture", 75, 500, 35.027, 135.79823, "Moss gardens and a sculpted sand cone said to reflect moonlight. Quieter and subtler than its golden sibling."],
        ["d3a2", "10:00", "Philosopher's Path walk", "nature", 60, 0, 35.02651, 135.79483, "A canal-side stone path lined with cherry trees, cafés and small shrines."],
        ["d3a3", "11:30", "Udon lunch", "food", 60, 1300, 35.0256, 135.795, "Thick handmade udon with seasonal vegetables in a homely Higashiyama shop."],
        ["d3a4", "13:00", "Nanzen-ji & the aqueduct", "sightseeing", 90, 600, 35.01113, 135.79359, "A grand Zen complex with a red-brick Meiji-era aqueduct running through the grounds."],
        ["d3a5", "16:00", "Shopping on Teramachi", "shopping", 90, 3000, 35.0076, 135.767, "Covered arcades with incense makers, stationery, ceramics and vintage kimono."],
      ]),
    ],
    budget: { accommodationPerNight: 18000, foodPerDay: 1500, transportPerDay: 1200 },
    packing: [
      { item: "Comfortable slip-on shoes", reason: "You'll remove shoes at temples many times a day" },
      { item: "IC transit card (ICOCA)", reason: "Tap on buses and trains" },
      { item: "Light rain jacket", reason: "Showers are common in spring and early summer" },
      { item: "Coin purse", reason: "Shrines, lockers and small shops prefer cash" },
      { item: "Pocket Wi-Fi or eSIM", reason: "Maps and translation on the go" },
      { item: "Small towel", reason: "Many restrooms have no paper towels" },
    ],
    localTips: {
      language: "Japanese",
      phrases: [
        { phrase: "Konnichiwa", meaning: "Hello" },
        { phrase: "Arigatou gozaimasu", meaning: "Thank you" },
        { phrase: "Sumimasen", meaning: "Excuse me / sorry" },
        { phrase: "Okaikei onegaishimasu", meaning: "The bill, please" },
      ],
      etiquette: [
        "Don't photograph geiko or maiko without permission",
        "Stand on the left on escalators in Kyoto",
        "Bow slightly when greeting or thanking",
      ],
      tipping: "Not customary and can cause confusion.",
      plugType: "Type A/B, 100V",
      emergencyNumber: "110 police · 119 ambulance",
    },
  },
};

const paris: SampleTrip = {
  slug: "paris",
  keywords: ["paris", "france", "europe"],
  coverQuery: "Paris",
  itinerary: {
    title: "Paris, Slowly",
    summary:
      "Three days balancing the icons with café terraces and neighbourhood wandering. Museums in the morning, the Seine at sunset.",
    destination: { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
    currency: "EUR",
    days: [
      day(1, "Art & the Right Bank", "The Louvre, the Tuileries and a sunset by the Eiffel Tower.", [
        ["d1a1", "09:00", "Musée du Louvre", "culture", 180, 22, 48.86061, 2.33764, "Pick three wings rather than trying to see everything: the Denon wing holds the Mona Lisa and Winged Victory.", "Book a timed ticket and enter via the Carrousel entrance."],
        ["d1a2", "12:30", "Picnic in the Tuileries", "food", 60, 15, 48.86349, 2.32748, "Grab a jambon-beurre and pastries and claim one of the famous green chairs by the fountain."],
        ["d1a3", "14:00", "Musée d'Orsay", "culture", 120, 16, 48.86, 2.32656, "Impressionist masterpieces in a Beaux-Arts railway station. Don't miss the view through the giant clock."],
        ["d1a4", "18:30", "Seine river cruise", "sightseeing", 60, 18, 48.8603, 2.2934, "Glide past Notre-Dame, the Louvre and the Musée d'Orsay as the city lights come on."],
        ["d1a5", "20:00", "Eiffel Tower sparkle", "sightseeing", 45, 0, 48.85837, 2.29448, "Watch from the Trocadéro as the tower sparkles for five minutes on the hour."],
      ]),
      day(2, "Islands & the Latin Quarter", "Gothic chapels, bookshops and Left Bank cafés.", [
        ["d2a1", "09:30", "Sainte-Chapelle", "culture", 60, 13, 48.8554, 2.345, "Fifteen soaring walls of 13th-century stained glass. Go on a sunny morning."],
        ["d2a2", "10:45", "Notre-Dame Cathedral", "sightseeing", 60, 0, 48.85297, 2.34996, "Reopened after restoration, its bright, cleaned stone interior is stunning."],
        ["d2a3", "12:00", "Shakespeare and Company", "shopping", 45, 0, 48.85257, 2.34709, "The legendary English-language bookshop facing Notre-Dame. The café next door is lovely too."],
        ["d2a4", "13:00", "Lunch at Café de Flore", "food", 75, 35, 48.85407, 2.33259, "Classic Saint-Germain café once frequented by Sartre and de Beauvoir."],
        ["d2a5", "16:00", "Le Marais & Place des Vosges", "culture", 120, 0, 48.85561, 2.36542, "Paris's oldest planned square, surrounded by boutiques, galleries and hidden courtyards."],
        ["d2a6", "19:30", "Falafel on Rue des Rosiers", "food", 45, 10, 48.85753, 2.35908, "Join the queue at L'As du Fallafel for a pita stuffed with falafel, aubergine and tahini."],
      ]),
      day(3, "Montmartre Mornings", "Hilltop views, artists' squares and a grand finale on the Champs-Élysées.", [
        ["d3a1", "08:30", "Sacré-Cœur Basilica", "sightseeing", 60, 0, 48.88671, 2.34311, "The white-domed basilica crowns the city's highest hill with sweeping views."],
        ["d3a2", "09:45", "Place du Tertre", "culture", 45, 0, 48.88654, 2.34076, "Painters set up easels in the square where Picasso and Modigliani once worked."],
        ["d3a3", "11:00", "Crêpes at Breizh Café", "food", 60, 20, 48.8601, 2.3623, "Buckwheat galettes and Breton cider done properly."],
        ["d3a4", "15:00", "Arc de Triomphe rooftop", "sightseeing", 60, 16, 48.8738, 2.29504, "Climb 284 steps for a view down twelve avenues radiating like a star."],
      ]),
    ],
    budget: { accommodationPerNight: 190, foodPerDay: 25, transportPerDay: 9 },
    packing: [
      { item: "Comfortable walking shoes", reason: "You'll easily walk 15,000 steps a day" },
      { item: "Crossbody bag with zip", reason: "Pickpockets work the metro and big sights" },
      { item: "Light scarf or layer", reason: "Churches and evenings can be cool" },
      { item: "Type E plug adapter", reason: "French sockets" },
      { item: "Reusable water bottle", reason: "Free Wallace fountains around the city" },
    ],
    localTips: {
      language: "French",
      phrases: [
        { phrase: "Bonjour", meaning: "Hello (say it when entering any shop)" },
        { phrase: "Merci", meaning: "Thank you" },
        { phrase: "L'addition, s'il vous plaît", meaning: "The bill, please" },
        { phrase: "Excusez-moi", meaning: "Excuse me" },
      ],
      etiquette: [
        "Always greet staff with 'Bonjour' before asking anything",
        "Keep your voice low on the metro and in restaurants",
        "Waiters won't bring the bill until you ask",
      ],
      tipping: "Service is included; rounding up or leaving 5% is appreciated.",
      plugType: "Type E, 230V",
      emergencyNumber: "112",
    },
  },
};

const bali: SampleTrip = {
  slug: "bali",
  keywords: ["bali", "ubud", "indonesia", "seminyak", "canggu"],
  coverQuery: "Bali",
  itinerary: {
    title: "Rice Terraces & Sea Temples",
    summary:
      "From Ubud's jungle-green heart to the cliffs of the Bukit Peninsula. Sacred springs, sunrise hikes and seafood on the sand.",
    destination: { name: "Bali", country: "Indonesia", lat: -8.5069, lng: 115.2625 },
    currency: "IDR",
    days: [
      day(1, "Ubud's Green Heart", "Monkeys, markets and a ridge walk at golden hour.", [
        ["d1a1", "08:30", "Sacred Monkey Forest Sanctuary", "nature", 90, 100000, -8.51898, 115.25874, "Long-tailed macaques roam moss-covered temples in a jungle of banyan trees.", "Keep sunglasses and snacks out of sight."],
        ["d1a2", "10:30", "Ubud Art Market", "shopping", 60, 150000, -8.5072, 115.2629, "Handwoven baskets, sarongs and wood carvings. Bargaining is expected."],
        ["d1a3", "11:30", "Ubud Palace", "culture", 45, 0, -8.50683, 115.26249, "The royal family's ornate compound, with evening Legong dance performances."],
        ["d1a4", "12:30", "Babi guling lunch", "food", 60, 70000, -8.5066, 115.2624, "Bali's famous spit-roasted suckling pig with spicy lawar and crackling."],
        ["d1a5", "16:30", "Campuhan Ridge Walk", "nature", 90, 0, -8.50263, 115.25403, "An easy paved ridge between two river valleys, glowing at sunset."],
      ]),
      day(2, "Terraces & Holy Water", "Iconic rice paddies and a purification ritual.", [
        ["d2a1", "07:30", "Tegallalang Rice Terraces", "nature", 120, 25000, -8.43262, 115.27925, "Cascading emerald paddies irrigated by the 1,000-year-old subak system."],
        ["d2a2", "10:30", "Tirta Empul Temple", "culture", 90, 75000, -8.41524, 115.31535, "Join locals bathing beneath carved spouts in the sacred spring pools.", "A sarong is provided; bring a change of clothes."],
        ["d2a3", "13:00", "Lunch with a volcano view", "food", 75, 150000, -8.2907, 115.3517, "Kintamani's ridge-top restaurants overlook Mount Batur and its crater lake."],
        ["d2a4", "18:30", "Legong dance performance", "culture", 90, 100000, -8.50683, 115.26249, "Graceful dancers in gold brocade, accompanied by a full gamelan orchestra."],
      ]),
      day(3, "Cliffs of the South", "Sea temples, a fire dance and seafood on the beach.", [
        ["d3a1", "10:00", "Tanah Lot", "sightseeing", 90, 75000, -8.62123, 115.08681, "A temple perched on a rock in the surf, reachable on foot at low tide."],
        ["d3a2", "16:00", "Uluwatu Temple", "culture", 90, 50000, -8.82914, 115.08482, "Clifftop temple 70 metres above crashing waves."],
        ["d3a3", "18:00", "Kecak fire dance", "culture", 60, 150000, -8.8288, 115.0858, "A hypnotic chant performance by 70 men as the sun sets over the ocean."],
        ["d3a4", "19:30", "Jimbaran Bay seafood dinner", "food", 90, 300000, -8.77622, 115.16626, "Pick your catch and eat grilled seafood at candlelit tables on the sand."],
      ]),
    ],
    budget: { accommodationPerNight: 900000, foodPerDay: 250000, transportPerDay: 350000 },
    packing: [
      { item: "Reef-safe sunscreen", reason: "Strong equatorial sun" },
      { item: "Sarong", reason: "Required at temples, doubles as a beach towel" },
      { item: "Insect repellent", reason: "Mosquitoes at dusk" },
      { item: "Quick-dry clothes", reason: "Humidity and sudden rain" },
      { item: "Sandals and trail shoes", reason: "Beaches and rice-terrace walks" },
    ],
    localTips: {
      language: "Indonesian / Balinese",
      phrases: [
        { phrase: "Om Swastiastu", meaning: "Balinese greeting" },
        { phrase: "Terima kasih", meaning: "Thank you" },
        { phrase: "Berapa harganya?", meaning: "How much is it?" },
        { phrase: "Tidak pedas", meaning: "Not spicy" },
      ],
      etiquette: [
        "Don't step on canang sari offerings on the pavement",
        "Use your right hand to give and receive",
        "Cover shoulders and knees at temples",
      ],
      tipping: "Not required; 5–10% for good service is appreciated.",
      plugType: "Type C/F, 230V",
      emergencyNumber: "112",
    },
  },
};

export const SAMPLE_TRIPS = [kyoto, paris, bali] as const;

export function findSample(destination: string): { sample: SampleTrip; exactMatch: boolean } {
  const query = destination.toLowerCase();
  const match = SAMPLE_TRIPS.find((s) => s.keywords.some((k) => query.includes(k)));
  return { sample: match ?? kyoto, exactMatch: Boolean(match) };
}
