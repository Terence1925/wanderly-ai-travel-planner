import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
      <Compass className="mb-6 size-12 text-accent" aria-hidden />
      <h1 className="font-display text-5xl">Off the map</h1>
      <p className="mt-3 text-muted-foreground">This page doesn&apos;t exist, or the trip isn&apos;t shared publicly.</p>
      <Link href="/" className={`${buttonVariants({ variant: "accent" })} mt-8`}>
        Back home
      </Link>
    </div>
  );
}
