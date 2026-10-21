import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared layout for the privacy policy and terms pages. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-5xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-foreground/90 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_li]:mt-1.5 [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
    </article>
  );
}

export const CONTACT_URL = "https://github.com/Terence1925/wanderly-ai-travel-planner/issues";
