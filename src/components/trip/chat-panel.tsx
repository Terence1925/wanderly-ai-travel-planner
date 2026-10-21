"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers";
import { applyEvent } from "@/lib/itinerary";
import { readEventStream } from "@/lib/ndjson";
import type { Day } from "@/lib/schema";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/trip-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  changedDays?: number[];
}

const SUGGESTIONS = [
  "Make day 2 more relaxed",
  "Add a cooking class",
  "Swap dinner on day 1 for somewhere cheaper",
  "What should I book in advance?",
];

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}

export function ChatPanel({ open, onClose, canEdit }: ChatPanelProps) {
  const { user } = useAuth();
  const trip = useTripStore((s) => s.trip);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const tripId = trip?.id;
  const isCloud = trip?.isCloud ?? false;

  // Cloud trips keep a shared chat history that collaborators see live.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !tripId || !isCloud || !user) return setMessages([]);
    supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("trip_id", tripId)
      .order("created_at")
      .limit(100)
      .then(({ data }) => data && setMessages(data as Message[]));

    const channel = supabase
      .channel(`chat:${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as Message & { user_id: string | null };
          if (row.user_id === user.id) return;
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, isCloud, user]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBusy]);

  const persist = (role: Message["role"], content: string) => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !isCloud || !tripId || !user) return;
    void supabase.from("chat_messages").insert({ trip_id: tripId, user_id: user.id, role, content: content.slice(0, 2000) });
  };

  const send = async (text: string) => {
    const message = text.trim();
    const current = useTripStore.getState().trip;
    if (!message || isBusy || !current) return;
    setInput("");
    setIsBusy(true);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: message }]);
    persist("user", message);

    const replaced: Day[] = [];
    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, itinerary: current.itinerary }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The assistant is unavailable right now.");
      }
      await readEventStream(res, (event) => {
        if (event.type === "reply") reply = event.text;
        else if (event.type === "replace_day") {
          const { type: _type, ...day } = event;
          replaced.push(day);
        } else if (event.type === "error") reply ||= event.message;
      });

      // All of the AI's edits land as a single undo step.
      if (replaced.length && canEdit) {
        const store = useTripStore.getState();
        store.edit((it) => replaced.reduce((acc, day) => applyEvent(acc, { type: "replace_day", ...day }), it));
        store.markChanged(replaced.map((d) => d.day));
        setTimeout(() => useTripStore.getState().markChanged([]), 6000);
      }
      const content = reply || (replaced.length ? "Done! I've updated your itinerary." : "Sorry, I couldn't work that out.");
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content, changedDays: canEdit ? replaced.map((d) => d.day) : [] },
      ]);
      persist("assistant", content);
    } catch (error) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          aria-label="Trip assistant"
          className="no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl sm:top-16"
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-accent/12 text-accent">
                <Sparkles className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold">Trip assistant</h2>
                <p className="text-xs text-muted-foreground">Ask questions or request changes</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant">
              <X />
            </Button>
          </header>

          <div ref={listRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3 pt-6 text-center">
                <p className="font-display text-2xl">How can I improve your trip?</p>
                <p className="text-sm text-muted-foreground">I&apos;ll only change the days you ask about.</p>
                <div className="flex flex-wrap justify-center gap-2 pt-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={!canEdit}
                      className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.changedDays && m.changedDays.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      Updated day {m.changedDays.join(", ")}
                      <button onClick={() => useTripStore.getState().undo()} className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
                        <RotateCcw className="size-3" /> Undo
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isBusy && (
              <div className="flex gap-1.5 rounded-2xl bg-muted px-4 py-3" style={{ width: "fit-content" }} aria-label="Assistant is thinking">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-2 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t border-border p-4"
          >
            {!canEdit && <p className="mb-2 text-xs text-muted-foreground">You have view-only access to this trip.</p>}
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-4 focus-within:ring-accent/15">
              <label htmlFor="chat-input" className="sr-only">Message the trip assistant</label>
              <textarea
                id="chat-input"
                rows={1}
                value={input}
                maxLength={500}
                disabled={!canEdit || isBusy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="e.g. Add a day trip to Nara on day 3"
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <Button type="submit" variant="accent" size="icon" disabled={!input.trim() || isBusy || !canEdit} aria-label="Send">
                <ArrowUp />
              </Button>
            </div>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
