"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Plane, Sun } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { avatarUrl, displayName, useAuth } from "@/components/providers";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/plan", label: "Plan a trip" },
  { href: "/explore", label: "Explore" },
  { href: "/trips", label: "My trips" },
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-display text-xl tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/30">
        <Plane className="size-4 -rotate-45" />
      </span>
      Wanderly
    </Link>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const isDark = isMounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

function UserMenu() {
  const { user, isEnabled, isLoading, signOut } = useAuth();
  if (!isEnabled || isLoading) return null;
  if (!user) {
    return (
      <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign in
      </Link>
    );
  }
  const avatar = avatarUrl(user);
  const name = displayName(user);
  return (
    <div className="flex items-center gap-1">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
        <LogOut />
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith("/trip/");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl",
        isWorkspace && "bg-background/90",
      )}
    >
      <div className={cn("mx-auto flex h-16 items-center gap-6 px-4 sm:px-6", !isWorkspace && "max-w-7xl")}>
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                pathname.startsWith(item.href) && "bg-muted text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
          <Link href="/plan" className={cn(buttonVariants({ variant: "accent", size: "sm" }), "hidden sm:inline-flex")}>
            New trip
          </Link>
        </div>
      </div>
      <nav aria-label="Mobile" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm text-muted-foreground",
              pathname.startsWith(item.href) && "bg-muted text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
