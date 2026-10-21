"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  Check,
  CloudOff,
  Download,
  FileText,
  Loader2,
  Map as MapIcon,
  MessageSquareText,
  Redo2,
  Share2,
  Sparkles,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { DestinationCover } from "@/components/destination-cover";
import { buildIcs, downloadBlob, slugify } from "@/lib/export/ics";
import { cn, formatDate } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";
import { BudgetPanel } from "./budget-panel";
import { ChatPanel } from "./chat-panel";
import { PackingPanel, TipsPanel } from "./guide-panels";
import { ShareDialog } from "./share-dialog";
import { Timeline } from "./timeline";
import { useRealtimeTrip, type Peer } from "./use-realtime";
import { useTripSession, type SaveState } from "./use-trip-session";
import { WeatherPanel } from "./weather-panel";

const TripMap = dynamic(() => import("./trip-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

const TABS = [
  { id: "itinerary", label: "Itinerary" },
  { id: "budget", label: "Budget" },
  { id: "weather", label: "Weather" },
  { id: "packing", label: "Packing" },
  { id: "tips", label: "Local tips" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SaveIndicator({ state, isCloud }: { state: SaveState; isCloud: boolean }) {
  if (state === "saving")
    return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Saving</span>;
  if (state === "error")
    return <span className="flex items-center gap-1.5 text-xs text-danger"><CloudOff className="size-3.5" /> Not saved</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="size-3.5" /> {isCloud ? "Saved to cloud" : "Saved in browser"}
    </span>
  );
}

function Presence({ peers }: { peers: Peer[] }) {
  if (peers.length < 2) return null;
  return (
    <div className="flex items-center gap-2" aria-label={`${peers.length} people viewing`}>
      <div className="flex -space-x-2">
        {peers.slice(0, 4).map((p) =>
          p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.userId} src={p.avatar} alt={p.name} title={p.name} referrerPolicy="no-referrer" className="size-7 rounded-full object-cover ring-2 ring-background" />
          ) : (
            <span key={p.userId} title={p.name} className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-background">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ),
        )}
      </div>
      <span className="flex items-center gap-1 text-xs text-success">
        <span className="size-1.5 animate-pulse rounded-full bg-success" /> Live
      </span>
    </div>
  );
}

function GeneratingBanner() {
  const days = useTripStore((s) => s.trip?.itinerary.days.length ?? 0);
  const stops = useTripStore((s) => s.trip?.itinerary.days.reduce((n, d) => n + d.activities.length, 0) ?? 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-4 py-3 text-sm"
      role="status"
    >
      <Sparkles className="size-4 animate-pulse text-accent" />
      <span>
        <strong>Planning your trip…</strong>{" "}
        <span className="text-muted-foreground">
          {stops ? `${stops} stops across ${days} day${days === 1 ? "" : "s"} so far` : "Researching the best spots"}
        </span>
      </span>
    </motion.div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="font-display text-3xl">We hit a snag</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <div className="mt-6 flex gap-2">
        <Link href="/plan" className={buttonVariants({ variant: "accent" })}>Plan a new trip</Link>
        <Link href="/trips" className={buttonVariants({ variant: "outline" })}>My trips</Link>
      </div>
    </div>
  );
}

export function TripWorkspace({ id }: { id: string }) {
  const { canEdit, saveState } = useTripSession(id);
  const trip = useTripStore((s) => s.trip);
  const status = useTripStore((s) => s.status);
  const error = useTripStore((s) => s.error);
  const isDemo = useTripStore((s) => s.isDemo);
  const canUndo = useTripStore((s) => s.past.length > 0);
  const canRedo = useTripStore((s) => s.future.length > 0);
  const selectedId = useTripStore((s) => s.selectedActivityId);
  const focusedDay = useTripStore((s) => s.focusedDay);
  const { undo, redo, selectActivity } = useTripStore.getState();
  const peers = useRealtimeTrip(trip?.id, trip?.isCloud ?? false);

  const [tab, setTab] = useState<TabId>("itinerary");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Keyboard shortcuts for undo/redo, ignoring text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  if (status === "error") return <ErrorState message={error ?? "Something went wrong."} />;
  if (!trip || status === "loading") {
    return (
      <div className="grid h-[calc(100dvh-4rem)] place-items-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading trip" />
      </div>
    );
  }

  const { itinerary, request } = trip;
  const isGenerating = status === "generating";
  const isReady = !isGenerating && trip.id !== "new";

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const [{ pdf }, { TripPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/lib/export/trip-pdf")]);
      const blob = await pdf(<TripPdf itinerary={itinerary} travelers={request.travelers} />).toBlob();
      downloadBlob(blob, `${slugify(itinerary.title)}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportIcs = () => {
    downloadBlob(new Blob([buildIcs(itinerary)], { type: "text/calendar" }), `${slugify(itinerary.title)}.ics`);
    toast.success("Calendar file downloaded. Open it to add every activity.");
  };

  return (
    <div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,46%)]">
      <div className="scrollbar-thin lg:overflow-y-auto">
        <DestinationCover place={itinerary.destination.name || request.destination} className="h-56 sm:h-64">
          <div className="flex h-full flex-col justify-end p-6 text-white sm:p-8">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-90">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {formatDate(request.startDate, { month: "short", day: "numeric" })} – {formatDate(request.endDate, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" /> {request.travelers}
              </span>
              {itinerary.destination.country && <span>{itinerary.destination.name}, {itinerary.destination.country}</span>}
            </p>
            <h1 className="mt-2 text-balance font-display text-4xl leading-tight sm:text-5xl">
              {itinerary.title || <span className="skeleton inline-block h-10 w-72 rounded-xl" />}
            </h1>
          </div>
        </DestinationCover>

        <div className="z-20 border-b border-border bg-background/90 backdrop-blur-xl lg:sticky lg:top-0">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
            {isReady && <SaveIndicator state={saveState} isCloud={trip.isCloud} />}
            <Presence peers={peers} />
            <div className="ml-auto flex items-center gap-1">
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
                    <Undo2 />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
                    <Redo2 />
                  </Button>
                </>
              )}
              <details className="relative">
                <summary
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "list-none [&::-webkit-details-marker]:hidden", !isReady && "pointer-events-none opacity-50")}
                >
                  <Download /> <span className="hidden sm:inline">Export</span>
                </summary>
                <div className="absolute right-0 top-10 z-30 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                  <button onClick={exportPdf} disabled={isExporting} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                    {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF itinerary
                  </button>
                  <button onClick={exportIcs} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                    <CalendarPlus className="size-4" /> Add to calendar (.ics)
                  </button>
                </div>
              </details>
              <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} disabled={!isReady}>
                <Share2 /> <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="accent" size="sm" onClick={() => setIsChatOpen(true)} disabled={!isReady}>
                <MessageSquareText /> <span className="hidden sm:inline">Ask AI</span>
              </Button>
            </div>
          </div>
          <nav aria-label="Trip sections" className="scrollbar-thin flex gap-1 overflow-x-auto px-4 sm:px-6" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-sm transition-colors",
                  tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {tab === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
              </button>
            ))}
          </nav>
        </div>

        <div id={`panel-${tab}`} role="tabpanel" className="px-4 py-8 sm:px-6">
          {isDemo && (
            <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <strong>Demo mode.</strong> This deployment has no AI key, so you&apos;re seeing a hand-made sample. Everything else works.
            </p>
          )}
          {isGenerating && <GeneratingBanner />}
          {itinerary.summary && tab === "itinerary" && (
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">{itinerary.summary}</p>
          )}
          {tab === "itinerary" && <Timeline canEdit={canEdit} />}
          {tab === "budget" && <BudgetPanel />}
          {tab === "weather" && <WeatherPanel />}
          {tab === "packing" && <PackingPanel />}
          {tab === "tips" && <TipsPanel />}
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 top-16 z-30 bg-background lg:static lg:z-auto lg:block lg:border-l lg:border-border",
          isMapOpen ? "block" : "hidden",
        )}
      >
        <TripMap itinerary={itinerary} selectedId={selectedId} focusedDay={focusedDay} onSelect={selectActivity} />
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={() => setIsMapOpen((v) => !v)}
        className="no-print fixed bottom-5 left-1/2 z-40 -translate-x-1/2 shadow-2xl lg:hidden"
      >
        <MapIcon /> {isMapOpen ? "Show itinerary" : "Show map"}
      </Button>

      <ChatPanel open={isChatOpen} onClose={() => setIsChatOpen(false)} canEdit={canEdit} />
      <ShareDialog open={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </div>
  );
}
