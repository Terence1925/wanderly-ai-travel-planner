"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isEnabled: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: false,
  isEnabled: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isEnabled: isSupabaseConfigured,
      signOut: async () => {
        await getSupabaseBrowser()?.auth.signOut();
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster position="bottom-center" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}

export function displayName(user: User | null): string {
  if (!user) return "Guest";
  const meta = user.user_metadata as { full_name?: string; name?: string };
  return meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Traveller";
}

export function avatarUrl(user: User | null): string | undefined {
  return (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url;
}
