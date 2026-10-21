# Wanderly — AI Travel Planner (Project Plan)

> Working name: **Wanderly**. Easy to rename later.
> Status: **Phases 0–8 built** (2026-10-21). Phase 9 (deploy) needs your Supabase and Vercel accounts; see README.
> Changes from this draft: Supabase replaced Neon + Prisma + Auth.js (one free service for database, auth and
> realtime); Claude is called through the official Anthropic SDK; packing list, local tips and .ics export
> were pulled forward from the extras.

---

## 1. What this app is

You type something like *"5 days in Kyoto in April, mid budget, love food and temples, travelling with my partner"*.
The app returns a full day-by-day trip: places, times, a live map with routes, costs, weather, and packing tips.
You can then edit it by chatting ("swap day 3 for a day trip to Nara"), drag things around, save it, share it, and export it as a PDF.

**Why it stands out from typical portfolio travel apps:**
- The itinerary **streams in live** while the AI writes it (cards appear one by one, map pins drop as they arrive). Most demo apps show a spinner for 20 seconds.
- **Structured AI output**: the AI returns validated JSON (Zod schema), not a blob of text. That is what makes the map, budget charts and drag-and-drop possible, and it's the part a technical reviewer will notice.
- **Chat to edit**: the AI modifies only the part of the plan you asked about, with an undo.
- **Works without an API key** (demo mode) so recruiters can click around your live link without it costing you money.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Industry standard; front end and API in one repo; free hosting on Vercel |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Polished, accessible components you own |
| Animation | **Framer Motion** | Page transitions, streaming card reveals, micro-interactions |
| AI | **Claude API via Vercel AI SDK** (`streamObject`) | Streams structured JSON; easy to swap provider |
| Validation | **Zod** | One schema for AI output, forms and API |
| Database | **PostgreSQL (Neon, free tier) + Prisma** | Saved trips, users, share links |
| Auth | **Auth.js (NextAuth v5)** — Google + email magic link | Guests can plan without signing up; sign-in only to save |
| Maps | **MapLibre GL + OpenFreeMap tiles** | Free, no key, beautiful vector maps |
| Places / photos | **Unsplash API** (destination photos), **OpenStreetMap Nominatim** (geocoding) | Free tiers |
| Weather | **Open-Meteo** | Free, no key |
| Currency | **Frankfurter API** | Free exchange rates |
| Forms | **React Hook Form + Zod** | Per your preferences |
| Client state | **Zustand** | Trip editor state, undo history |
| PDF export | **@react-pdf/renderer** | Branded, printable itinerary |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | |
| CI / hosting | **GitHub Actions** (lint, typecheck, test) + **Vercel** | Green badge on the README |

---

## 3. Features

### Core (MVP)
1. **Landing page** — hero with an animated globe/map, example trips, feature highlights, call to action.
2. **Trip wizard** — destination (autocomplete), dates, travellers, budget level, travel style chips (food, culture, nature, nightlife, adventure, relaxation), pace (relaxed / balanced / packed), and a free-text "anything else?" box. Also a single "describe your trip" text box as a shortcut.
3. **AI itinerary generation (streaming)** — day-by-day timeline with morning/afternoon/evening activities, each with time, duration, description, estimated cost, category, and coordinates.
4. **Interactive map** — pins numbered per day, colour-coded by day, route lines between stops, map and timeline stay in sync (hover a card → pin highlights).
5. **Itinerary editor** — drag and drop to reorder activities or move them between days, delete, add your own, regenerate a single day.
6. **AI chat assistant** — side panel to refine the trip in plain language. The AI edits the structured plan; changes are highlighted; one-click undo.
7. **Budget breakdown** — totals per category (stay, food, activities, transport) and per day, with a chart; currency switcher with live rates.
8. **Weather forecast** — per day for the trip dates (forecast if within 16 days, historical averages otherwise).
9. **Save trips + dashboard** — "My Trips" page with cover photos, upcoming/past tabs, duplicate, delete.
10. **Share** — public read-only link with a nice Open Graph preview image when pasted into Messenger/Slack/LinkedIn.
11. **PDF export** — branded itinerary to print or send.
12. **Dark / light mode**, fully responsive (mobile-first), accessible (keyboard navigation, WCAG AA contrast).

### "Wow" extras (Phase 2 — pick which ones you want)
- **AI packing list** — based on destination, weather and activities; checkable.
- **Local tips card** — etiquette, tipping, plugs/voltage, emergency numbers, key phrases with pronunciation.
- **"Surprise me"** — enter budget + dates only, AI picks a destination and explains why.
- **Hidden-gems toggle** — bias suggestions away from tourist hotspots.
- **Calendar export (.ics)** — add the whole trip to Google/Apple Calendar.
- **Collaborative trips** — invite a friend, both can edit, vote on activities.
- **Photo-to-plan** — upload a photo of a place, AI identifies it and builds a trip around it.
- **Multi-city trips** — e.g. Tokyo → Kyoto → Osaka with transfers between cities.
- **PWA / offline mode** — view saved itinerary with no signal while travelling.

---

## 4. Pages

```
/                     Landing page
/plan                 Trip wizard
/trip/[id]            Itinerary view + editor + map + chat  (main screen)
/trip/[id]/share      Public read-only view
/trips                My Trips dashboard (signed in)
/explore              Curated sample trips (works in demo mode)
/sign-in              Auth
```

**Main screen layout (desktop):** itinerary timeline on the left, sticky map on the right, chat as a slide-over panel, tabs at the top for *Itinerary · Budget · Weather · Packing · Tips*.
**Mobile:** tabs at the bottom, map as a toggleable full-screen sheet.

---

## 5. Design direction

- Feel: premium travel magazine meets modern SaaS (think Airbnb + Linear).
- Large destination photography, soft glassmorphism panels over imagery, generous whitespace.
- Typography: a display serif for headings (e.g. *Instrument Serif* / *Fraunces*) paired with *Inter* for UI.
- Palette: deep ocean blue + warm sunset coral accent, neutral sand tones; full dark theme.
- Motion: subtle and purposeful — streaming card reveals, map fly-to animations, skeleton loaders. Respects `prefers-reduced-motion`.

---

## 6. Data model (simplified)

```
User      id, name, email, image
Trip      id, userId?, title, destination, startDate, endDate, travellers,
          budgetLevel, styles[], pace, currency, coverImage,
          itinerary (JSON, validated by Zod), isPublic, shareSlug, createdAt
ChatMessage  id, tripId, role, content, createdAt
```

Itinerary JSON shape: `days[] → activities[] { id, time, title, description, category, durationMin, cost, lat, lng, address, tips }`.

---

## 7. Security, cost control, quality

- **API keys stay server-side only**; `.env.example` documents every variable.
- **Rate limiting** on AI endpoints (per IP for guests, per user when signed in) so a public demo link can't run up your bill.
- **Demo mode**: if no AI key is set, the app serves pre-generated sample itineraries with simulated streaming — the live portfolio link always works.
- Zod validation on every API input and on AI output (malformed AI responses are retried or rejected, never rendered).
- Prompt-injection hardening on the free-text field; output is rendered as text, never raw HTML.
- Unit tests for schema, budget maths, and itinerary edit logic; Playwright E2E for the main flow; Lighthouse target 90+.

---

## 8. Build phases

| Phase | Deliverable |
|---|---|
| 0. Setup | Repo, Next.js + Tailwind + shadcn, lint/format, CI, design tokens, `.env.example` |
| 1. Shell & landing | Layout, nav, theme toggle, landing page |
| 2. Wizard + AI generation | Form, Zod schema, streaming endpoint, timeline UI, demo mode |
| 3. Map | MapLibre map, pins, routes, sync with timeline |
| 4. Editing | Drag and drop, add/remove, regenerate day, AI chat edits with undo |
| 5. Budget, weather, currency | Charts and integrations |
| 6. Persistence | Database, auth, save trips, dashboard |
| 7. Sharing & export | Share links, OG images, PDF export |
| 8. Polish | Responsive pass, accessibility, animations, performance, tests |
| 9. Ship | Deploy to Vercel, README with screenshots/GIF, live demo link |
| 10. Extras | Whichever Phase 2 features you choose |

I'll stop and show you progress after each phase rather than building everything in one go.

---

## 9. Portfolio packaging

- README with hero screenshot, animated GIF of streaming generation, feature list, architecture diagram, tech badges, live demo link, and "how to run locally".
- Clean commit history (one meaningful commit per feature), GitHub Actions badge.

---

## 10. Things you'll need to provide / decide

1. **Node.js upgrade** — you have Node 18.20.8, which reached end-of-life in April 2025. I recommend installing **Node 22 LTS** before we start.
2. **Anthropic API key** (for real AI generation). Optional — demo mode works without one. A typical trip generation costs a few cents.
3. **Free accounts** later (only for deploying the full version): Vercel, Neon (database), Unsplash, Google OAuth.
4. **App name** — keep "Wanderly" or choose your own.
