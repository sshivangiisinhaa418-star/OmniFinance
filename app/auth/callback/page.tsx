'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Flame } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email security token...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          // Verify session from URL fragment or query code
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;

          if (session?.user) {
            // Save session metadata locally
            const userMeta = {
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 'Executive User',
              role: session.user.user_metadata?.role || 'CFO',
              loggedInAt: new Date().toISOString(),
            };
            localStorage.setItem('tally_user_session', JSON.stringify(userMeta));

            setStatus('success');
            setMessage('Email verification confirmed! Security session activated.');
            
            // Redirect to Executive Summary after 1.5 seconds
            setTimeout(() => {
              router.replace('/');
            }, 1500);
          } else {
            // Check for hash parameters or query codes
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !data.session) {
              setStatus('error');
              setMessage('Email verification link is invalid or has expired. Please sign in or request a new link.');
            } else {
              setStatus('success');
              setMessage('Email verification confirmed! Redirecting...');
              setTimeout(() => router.replace('/'), 1500);
            }
          }
        } catch (err: any) {
          setStatus('error');
          setMessage(err.message || 'Verification failed. Please try logging in directly.');
        }
      } else {
        setStatus('error');
        setMessage('Database connection not configured.');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-stone-950 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-stone-900/90 backdrop-blur-2xl border border-stone-800 rounded-3xl p-8 shadow-2xl z-10 text-center space-y-6">
        
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 shadow-xl shadow-orange-600/30">
          <Flame className="w-9 h-9 text-white" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Tally</span>
            <span className="text-orange-500">Vision</span>
          </h1>
          <p className="text-xs text-stone-400 font-semibold tracking-wider uppercase mt-1">
            Email Verification Gateway
          </p>
        </div>

        {/* Dynamic Status Card */}
        {status === 'verifying' && (
          <div className="p-6 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-stone-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-sm font-bold text-emerald-400">Account Verified!</h2>
            <p className="text-xs text-stone-300">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-3 animate-fade-in">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-sm font-bold text-rose-400">Verification Failed</h2>
            <p className="text-xs text-stone-300">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 w-full py-2.5 px-4 bg-stone-950 hover:bg-stone-800 border border-stone-700 rounded-xl text-xs font-bold text-white transition cursor-pointer"
            >
              Return to Login Gateway
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>256-Bit Encrypted Security Token</span>
        </div>
      </div>
    </div>
  );
}
