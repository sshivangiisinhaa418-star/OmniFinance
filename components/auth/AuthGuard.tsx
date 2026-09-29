'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Lock, Loader2 } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Standalone public routes bypass AuthGuard completely to prevent redirect loops
  const isPublicRoute = pathname === '/login' || pathname === '/auth/callback';

  const checkHasValidSession = async (): Promise<boolean> => {
    // 1. Check Supabase session first
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return true;
      } catch (err) {
        console.error('Session verification error:', err);
      }
    }

    // 2. Check local fallback session
    if (typeof window !== 'undefined') {
      const localSession = localStorage.getItem('tally_user_session');
      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          if (parsed && (parsed.email || parsed.name)) return true;
        } catch (e) {
          localStorage.removeItem('tally_user_session');
        }
      }
    }

    return false;
  };

  useEffect(() => {
    if (isPublicRoute) {
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;

    const performAuthCheck = async () => {
      const isAuthed = await checkHasValidSession();

      if (isMounted) {
        if (!isAuthed) {
          setIsAuthenticated(false);
          router.replace('/login');
        } else {
          setIsAuthenticated(true);
        }
      }
    };

    performAuthCheck();

    // Listen for auth state changes if Supabase is enabled
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('tally_user_session');
          if (isMounted && !isPublicRoute) {
            setIsAuthenticated(false);
            router.replace('/login');
          }
        } else if (!session) {
          // Check if local session exists before forcing redirect
          const localAuthed = await checkHasValidSession();
          if (!localAuthed && isMounted && !isPublicRoute) {
            setIsAuthenticated(false);
            router.replace('/login');
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [pathname, router, isPublicRoute]);

  // If on login or auth callback page, render children directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show security verification loader while checking auth state on protected routes
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center animate-pulse">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <Loader2 className="w-20 h-20 text-orange-500 animate-spin absolute -inset-2" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white tracking-wide">
            Verifying Security Credentials...
          </h2>
          <p className="text-xs text-stone-400">
            Encrypted session check in progress. Please wait.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
