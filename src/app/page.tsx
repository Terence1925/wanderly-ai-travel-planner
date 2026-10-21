import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CloudSun,
  FileDown,
  Map,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Hero } from "@/components/landing/hero";
import { SampleTripCards } from "@/components/landing/sample-trip-cards";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Zap,
    title: "Itineraries that stream in live",
    body: "Activities appear one by one as the AI writes them, and pins drop onto the map in real time. No 30-second spinner.",
    className: "md:col-span-2",
    highlight: true,
  },
  {
    icon: MessageSquareText,
    title: "Chat to refine",
    body: "“Swap day 3 for a day trip to Nara.” Only that day changes, and you can undo it.",
  },
  {
    icon: Map,
    title: "Interactive route map",
    body: "Colour-coded days, numbered stops and routes, synced with your timeline.",
  },
  {
    icon: Users,
    title: "Plan together in real time",
    body: "Invite friends with a link. See who's online and watch edits sync instantly.",
    className: "md:col-span-2",
    highlight: true,
  },
  {
    icon: Wallet,
    title: "Budget in any currency",
    body: "Category breakdowns with live exchange rates.",
  },
  {
    icon: CloudSun,
    title: "Weather for your dates",
    body: "Live forecasts, or last year's conditions for trips further out.",
  },
  {
    icon: FileDown,
    title: "PDF & calendar export",
    body: "A beautiful printable itinerary, or every activity in your calendar.",
  },
] as const;

const STEPS = [
  { n: "01", title: "Describe it", body: "Where, when, who's coming, and what you love. Or one sentence." },
  { n: "02", title: "Watch it appear", body: "A complete plan streams onto a live map in seconds." },
  { n: "03", title: "Make it yours", body: "Drag, chat, invite friends, share or export." },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      <section aria-labelledby="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">Features</p>
          <h2 id="features" className="text-balance font-display text-4xl tracking-tight sm:text-5xl">
            Everything a great trip needs, in one place.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, ...rest }) => {
            const isHighlight = "highlight" in rest && rest.highlight;
            return (
              <article
                key={title}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-border bg-card p-7 transition-shadow hover:shadow-xl hover:shadow-primary/5",
                  "className" in rest && rest.className,
                )}
              >
                {isHighlight && (
                  <div
                    aria-hidden
                    className="absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-2xl transition-transform duration-700 group-hover:scale-150"
                  />
                )}
                <span className="relative mb-5 grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="relative font-display text-2xl">{title}</h3>
                <p className="relative mt-2 leading-relaxed text-muted-foreground">{body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="how" className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <h2 id="how" className="mb-14 text-center font-display text-4xl tracking-tight sm:text-5xl">
            Three steps to somewhere new
          </h2>
          <ol className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="text-center">
                <span className="font-display text-6xl italic text-accent/80">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="samples" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">Inspiration</p>
            <h2 id="samples" className="font-display text-4xl tracking-tight sm:text-5xl">
              Start from a sample trip
            </h2>
          </div>
          <Link href="/explore" className={buttonVariants({ variant: "outline" })}>
            Explore all <ArrowRight />
          </Link>
        </div>
        <SampleTripCards />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="grain relative overflow-hidden rounded-[36px] bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <div aria-hidden className="absolute -left-20 -top-20 size-80 rounded-full bg-accent/40 blur-[100px]" />
          <div aria-hidden className="absolute -bottom-24 -right-10 size-80 rounded-full bg-sky-400/30 blur-[100px]" />
          <h2 className="relative text-balance font-display text-4xl tracking-tight sm:text-6xl">
            Where to next?
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg opacity-80">
            Your first itinerary is a minute away. No account needed.
          </p>
          <Link
            href="/plan"
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "relative mt-8")}
          >
            Plan my trip <ArrowRight />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Wanderly. Built with Next.js, Supabase and generative AI.</p>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Radio className="size-4" /> Realtime</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> Row-level security</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4" /> .ics export</span>
          </div>
        </div>
      </footer>
    </>
  );
}
