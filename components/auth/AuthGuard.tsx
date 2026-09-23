'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // If currently on login page, skip protection check
      if (pathname === '/login') {
        if (isMounted) setIsAuthenticated(true);
        return;
      }

      let authenticated = false;

      // Check Supabase Auth session if configured
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            authenticated = true;
          }
        } catch (err) {
          console.error('Session verification error:', err);
        }
      }

      // Check Local session fallback if Supabase auth is not active or empty
      if (!authenticated) {
        const localSession = localStorage.getItem('tally_user_session');
        if (localSession) {
          try {
            const parsed = JSON.parse(localSession);
            if (parsed && parsed.email) {
              authenticated = true;
            }
          } catch (e) {
            localStorage.removeItem('tally_user_session');
          }
        }
      }

      if (isMounted) {
        if (!authenticated) {
          setIsAuthenticated(false);
          router.replace('/login');
        } else {
          setIsAuthenticated(true);
        }
      }
    };

    checkAuth();

    // Listen for auth state changes if Supabase is enabled
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session && pathname !== '/login') {
          setIsAuthenticated(false);
          router.replace('/login');
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
  }, [pathname, router]);

  // If on login page, render children directly
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show security verification loader while checking auth state
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
