import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Sparkles, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DestinationCover } from "@/components/destination-cover";
import { PublicMap } from "@/components/trip/public-map";
import { CATEGORY_META, dayColor } from "@/lib/categories";
import { getPublicTrip } from "@/lib/trips/public";
import { formatDate, formatDuration, formatMoney } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trip = await getPublicTrip((await params).slug);
  if (!trip) return { title: "Trip not found" };
  return {
    title: trip.itinerary.title,
    description: trip.itinerary.summary,
    openGraph: { title: trip.itinerary.title, description: trip.itinerary.summary },
  };
}

export default async function SharePage({ params }: Props) {
  const trip = await getPublicTrip((await params).slug);
  if (!trip) notFound();
  const { itinerary, request } = trip;

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]">
      <div className="scrollbar-thin lg:overflow-y-auto">
        <DestinationCover place={itinerary.destination.name} className="h-64">
          <div className="flex h-full flex-col justify-end p-6 text-white sm:p-8">
            <p className="flex flex-wrap items-center gap-4 text-sm opacity-90">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {formatDate(request.startDate, { month: "short", day: "numeric" })} – {formatDate(request.endDate, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5"><Users className="size-4" /> {request.travelers}</span>
              <span>{itinerary.destination.name}, {itinerary.destination.country}</span>
            </p>
            <h1 className="mt-2 text-balance font-display text-4xl leading-tight sm:text-5xl">{itinerary.title}</h1>
          </div>
        </DestinationCover>

        <div className="px-4 py-8 sm:px-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Shared with Wanderly · read-only</p>
            <Link href="/plan" className={buttonVariants({ variant: "accent", size: "sm" })}>
              <Sparkles /> Plan your own trip
            </Link>
          </div>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">{itinerary.summary}</p>

          <div className="space-y-10">
            {itinerary.days.map((day) => (
              <section key={day.day} aria-labelledby={`d${day.day}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: dayColor(day.day) }}>
                  Day {day.day} · {formatDate(day.date)}
                </p>
                <h2 id={`d${day.day}`} className="mb-4 mt-1 font-display text-2xl">{day.title}</h2>
                <ol className="space-y-3">
                  {day.activities.map((a, i) => {
                    const meta = CATEGORY_META[a.category];
                    return (
                      <li key={a.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: dayColor(day.day) }}>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{a.time}</span>
                            <span className={`rounded-full px-2 py-0.5 ${meta.tone}`}>{meta.label}</span>
                            <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDuration(a.durationMin)}</span>
                            <span>{a.cost > 0 ? formatMoney(a.cost, itinerary.currency) : "Free"}</span>
                          </p>
                          <h3 className="mt-1 font-semibold">{a.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </div>
      <div className="h-[60vh] border-t border-border lg:h-auto lg:border-l lg:border-t-0">
        <PublicMap itinerary={itinerary} />
      </div>
    </div>
  );
}
