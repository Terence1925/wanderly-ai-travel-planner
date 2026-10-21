# Wanderly · AI Travel Planner

Describe a trip in plain English and watch a complete day-by-day itinerary **stream onto a live map**, with budgets, weather, packing lists and local tips. Then refine it by chatting with the AI, drag things around, and plan it together with friends in real time.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Claude API · Supabase (Postgres, Auth, Realtime) · MapLibre GL · Framer Motion · Zod · Vitest

> Add a screenshot or GIF here once deployed: `docs/screenshot.png`

---

## Features

| | |
|---|---|
| **Streaming AI itineraries** | Claude writes the trip as newline-delimited JSON. Each line is validated with Zod and rendered the moment it arrives, so cards and map pins appear live instead of after a long spinner. |
| **Chat to edit** | Ask "make day 2 more relaxed". The AI returns only the days it changed; all edits land as a single undo step and the changed days are highlighted. |
| **Interactive map** | MapLibre with free OpenFreeMap tiles. Colour-coded days, numbered stops, routes, and selection synced with the timeline. Light and dark styles. |
| **Drag-and-drop editing** | Reorder within a day (mouse, touch or keyboard), move stops between days, add your own, undo/redo (Ctrl+Z / Ctrl+Shift+Z). |
| **Authentication** | Supabase Auth with email magic links and optional Google sign-in. Guests can plan without an account; trips are kept in the browser until they sign in. |
| **Database** | Postgres with row-level security: owners, editors and public read-only trips. JSON columns are re-validated on read. |
| **Real-time collaboration** | Invite friends with a secret link. Edits sync live through Supabase Realtime, presence avatars show who's online, and the AI chat history is shared. |
| **Live data** | Weather from Open-Meteo (forecast, or last year's actual weather for dates further out), live ECB exchange rates from Frankfurter, destination photos from Wikipedia. |
| **Budget breakdown** | Category split and per-day spend, convertible to other currencies. |
| **Sharing & export** | Public share pages with generated Open Graph images, branded PDF export, and `.ics` calendar export. |
| **Demo mode** | Without an AI key, the app streams hand-made sample trips, so a public portfolio link never costs you money. |
| **Cost protection** | Per-visitor hourly limit and a global daily cap on AI calls, enforced in Postgres. |

## Architecture

```
Browser ──POST /api/generate──▶ Next.js route ──stream──▶ Claude
   ▲                                │  validates each NDJSON line (Zod)
   └──────── NDJSON events ◀────────┘  rate limit via Postgres function
   │
   ├── Supabase JS ──▶ Postgres (RLS)   trips · trip_members · chat_messages
   ├── Supabase Realtime                postgres_changes + presence
   └── Open-Meteo · Frankfurter · Wikipedia · OpenFreeMap (no keys)
```

Key files:

- `src/lib/schema.ts`: Zod schemas shared by the AI output, API input, forms and database reads
- `src/lib/ai/`: prompts and the Claude streaming client
- `src/lib/itinerary.ts`: pure, unit-tested reducers for stream events and edits
- `src/components/trip/`: the workspace (timeline, map, chat, budget, realtime hooks)
- `supabase/migrations/0001_init.sql`: schema, RLS policies, invite RPC, rate limiter

## Run locally

Requires Node.js 18.18+ (Node 22 LTS recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables, the app runs in demo mode with browser-only storage. Everything works except custom AI generation, accounts and collaboration.

To enable AI, create `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest unit tests |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `AI_PROVIDER` | No | `gemini` or `anthropic`. Defaults to whichever key is set |
| `GEMINI_API_KEY` | For AI (free) | From Google AI Studio. Free tier works for a portfolio demo |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.5-flash-lite` (fast on the free tier) |
| `ANTHROPIC_API_KEY` | For AI (paid) | Without any AI key the app runs in demo mode |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-opus-5-5`. `claude-haiku-5-5` is much cheaper per trip |
| `AI_DAILY_LIMIT` | No | Global AI calls per day (default 50) |
| `AI_HOURLY_LIMIT_PER_IP` | No | Per visitor (default 5) |
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For accounts | Publishable key (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Safe in the browser; RLS protects data |
| `SUPABASE_SECRET_KEY` | Recommended | Secret key (or legacy `SUPABASE_SERVICE_ROLE_KEY`). **Server only.** Used solely for the shared AI rate limiter. Without it, limits are per server instance |
| `NEXT_PUBLIC_AUTH_GOOGLE` | No | `true` after enabling Google in Supabase |
| `NEXT_PUBLIC_SITE_URL` | In production | Your deployed URL, used for share links and OG images |

## Deploy for free (Supabase + Vercel)

Both services have free tiers that cover a portfolio project. The only paid part is the Claude API, and that's optional because demo mode works without it.

### 1. Supabase (database, auth, realtime)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order: `0001_init.sql`, then `0002_security_fixes.sql`.
3. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL and add `https://YOUR-APP.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` to *Redirect URLs*.
4. Optional Google sign-in: **Authentication → Providers → Google**, add a Google OAuth client, then set `NEXT_PUBLIC_AUTH_GOOGLE=true`.
5. Copy the project URL, the anon key and the service-role key from **Project Settings → API**.

> Supabase's built-in email sender is rate-limited (a few emails per hour). That's fine for a demo. Add custom SMTP for heavier use.

### 2. Vercel (hosting)

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com) choose **Add New → Project**, import the repo (Next.js is detected automatically).
3. Add the environment variables from the table above.
4. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final URL and redeploy.

The AI routes stream for up to 60 seconds, which is within the Vercel Hobby limit.

### Keeping AI costs in check

- Leave `ANTHROPIC_API_KEY` unset on the public deployment to run in demo mode for free.
- Or set it with a low `AI_DAILY_LIMIT` and a monthly spend limit in the Anthropic Console.
- `ANTHROPIC_MODEL=claude-haiku-5-5` cuts the per-trip cost dramatically.

## Security notes

- API keys are only read on the server; the Supabase anon key is public by design and every table has RLS.
- Collaborators join only through a secret invite code (`join_trip` RPC). The code is hidden from normal reads by column privileges and only the owner can fetch it (`get_invite_code`). Only owners can change sharing settings, which a trigger enforces.
- Chat messages can only be inserted as the signed-in user.
- The rate-limit function is executable only by the service role, so visitors can't exhaust the quota directly.
- AI output is validated line by line and rendered as text, never as HTML. Traveller notes are wrapped in delimiters and treated as preferences only.
- Post-login redirects are parsed and must resolve to the same origin (blocks `/\evil.com`-style open redirects).

## Known limitations

- Collaboration is last-write-wins at the itinerary level; simultaneous edits to the same trip can overwrite each other.
- AI coordinates and prices are estimates. The UI says so, and every stop links to Google Maps.
- Map routes are straight lines between stops, not turn-by-turn directions.

## License

MIT
