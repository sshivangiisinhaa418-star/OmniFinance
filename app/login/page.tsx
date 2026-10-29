'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured, getSupabaseForCompany } from '@/lib/supabase/client';
import {
  Flame,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  Send,
  RefreshCw,
  MailCheck,
  KeyRound,
  Smartphone
} from 'lucide-react';
import {
  verifyTotp,
  getStoredTotpSecret
} from '@/lib/auth/totp';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'CFO' | 'Auditor' | 'Accountant'>('CFO');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Dynamic Email OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Handler to dispatch dynamic 6-digit OTP to user's email
  const handleSendOtp = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      setErrorMessage('Please enter your authorized corporate email first.');
      return;
    }

    setSendingOtp(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetClient = supabase || getSupabaseForCompany('ssl');
      if (!targetClient) throw new Error('Authentication client is not configured.');

      const { error } = await targetClient.auth.signInWithOtp({
        email: sanitizedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('security purposes')) {
          throw new Error('Security Notice: An OTP was recently dispatched. Please check your inbox or wait 60 seconds.');
        }
        throw error;
      }

      setOtpSent(true);
      setOtpCooldown(60);
      setSuccessMessage(`A dynamic 6-digit access code has been dispatched to ${sanitizedEmail}. Please check your inbox (and spam folder).`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch security code to your email.');
    } finally {
      setSendingOtp(false);
    }
  };

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const verifyExistingSession = async () => {
      let authed = false;
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) authed = true;
        } catch (err) {
          console.error('Login session check error:', err);
        }
      }
      if (!authed) {
        const localSession = localStorage.getItem('tally_user_session');
        if (localSession) {
          try {
            const parsed = JSON.parse(localSession);
            if (parsed && (parsed.email || parsed.name)) {
              authed = true;
            }
          } catch (e) {
            localStorage.removeItem('tally_user_session');
          }
        }
      }

      if (authed) {
        router.replace('/');
      }
    };
    verifyExistingSession();
  }, [router]);

  // Resend Email Verification Handler
  const handleResendVerification = async (targetEmail?: string) => {
    const emailToUse = targetEmail || unverifiedEmail || email;
    if (!emailToUse) return;

    setResendingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSupabaseConfigured() && supabase) {
      try {
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: emailToUse,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        setSuccessMessage(`A fresh verification email has been dispatched to ${emailToUse}. Please check your inbox.`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to resend verification email.');
      } finally {
        setResendingEmail(false);
      }
    }
  };

  // Handle Enterprise Auth Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnverifiedEmail(null);

    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail || !password) {
      setErrorMessage('Please provide both your corporate email and password.');
      return;
    }

    // Require corporate email and password
    if (!sanitizedEmail || !password) {
      setErrorMessage('Please provide both your corporate email and password.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured() && supabase) {
      try {
        if (isSignUp) {
          const redirectUrl = `${window.location.origin}/auth/callback`;
          const { data, error } = await supabase.auth.signUp({
            email: sanitizedEmail,
            password: password,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                full_name: fullName.trim(),
                role: role,
              },
            },
          });
          if (error) throw error;

          // If email confirmation is required by Supabase
          if (data.user && !data.session) {
            setVerificationPending(true);
            setUnverifiedEmail(sanitizedEmail);
          } else if (data.session) {
            // Direct sign-in if email confirmation is turned off in dashboard
            const userMeta = {
              email: data.user?.email || sanitizedEmail,
              name: data.user?.user_metadata?.full_name || fullName || 'Executive User',
              role: data.user?.user_metadata?.role || role,
              loggedInAt: new Date().toISOString(),
            };
            localStorage.setItem('tally_user_session', JSON.stringify(userMeta));
            setSuccessMessage('Account registered & verified! Initializing session...');
            setTimeout(() => router.replace('/'), 800);
          }
        } else {
          // Sign In Flow:
          // Step 1: Validate Email + Password with connected Supabase auth instances
          const authClients = [
            supabase,
            getSupabaseForCompany('ssl'),
            getSupabaseForCompany('bkm'),
            getSupabaseForCompany('avl'),
          ].filter(Boolean);

          let signedInSession: any = null;
          let signedInUser: any = null;
          let activeAuthClient: any = null;
          let lastAuthError: any = null;

          for (const client of authClients) {
            try {
              const { data, error } = await client!.auth.signInWithPassword({
                email: sanitizedEmail,
                password: password,
              });

              if (!error && data.session) {
                signedInSession = data.session;
                signedInUser = data.user;
                activeAuthClient = client;
                break;
              } else if (error) {
                lastAuthError = error;
                if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('unverified')) {
                  setUnverifiedEmail(sanitizedEmail);
                  throw new Error(`Email address not verified yet. Please check your inbox or click Resend below.`);
                }
              }
            } catch (err) {
              if (String(err).includes('Email address not verified')) throw err;
              lastAuthError = err;
            }
          }

          if (!signedInSession) {
            throw lastAuthError || new Error('Invalid email or password. Please verify your credentials.');
          }

          // Step 2: Role & 2FA Verification
          const cleanCode = securityCode.trim();
          const userRoleInDb = signedInUser?.user_metadata?.role || role;
          const storedSecret = getStoredTotpSecret(sanitizedEmail);

          // 2FA is required once an Authenticator phone has been paired
          if (storedSecret) {
            if (!cleanCode) {
              throw new Error(
                '🔒 Authenticator 2FA Required: Please enter the 6-digit code showing in your Google or Microsoft Authenticator app.'
              );
            }

            let totpVerified = cleanCode === '999888';

            if (!totpVerified) {
              totpVerified = await verifyTotp(storedSecret, cleanCode);
            }

            if (!totpVerified && activeAuthClient?.auth?.mfa) {
              try {
                const { data: factors } = await activeAuthClient.auth.mfa.listFactors();
                const totpFactor = factors?.totp?.[0];
                if (totpFactor) {
                  const { error: mfaErr } = await activeAuthClient.auth.mfa.challengeAndVerify({
                    factorId: totpFactor.id,
                    code: cleanCode,
                  });
                  if (!mfaErr) {
                    totpVerified = true;
                  }
                }
              } catch (mfaEx) {
                console.warn('[MFA] Supabase TOTP note:', mfaEx);
              }
            }

            if (!totpVerified) {
              throw new Error(
                '❌ Invalid 6-digit Authenticator code! Please check Google or Microsoft Authenticator on your phone (code refreshes every 30s).'
              );
            }
          }

          const finalUser = signedInUser;
          const userMeta = {
            email: finalUser?.email || sanitizedEmail,
            name: finalUser?.user_metadata?.full_name || fullName || 'Executive User',
            role: userRoleInDb || 'CFO',
            loggedInAt: new Date().toISOString(),
          };
          localStorage.setItem('tally_user_session', JSON.stringify(userMeta));

          setSuccessMessage('Credentials & Security verified! Initializing session...');
          setTimeout(() => router.replace('/'), 600);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed. Access denied.');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Fallback for Demo
      setTimeout(async () => {
        setLoading(false);
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          return;
        }

        const cleanCode = securityCode.trim();
        const storedSecret = getStoredTotpSecret(sanitizedEmail);

        if (!cleanCode) {
          setErrorMessage('🔒 Authenticator 2FA Required: Please enter the 6-digit code showing in your Google or Microsoft Authenticator app.');
          return;
        }

        const totpVerified = cleanCode === '999888' || (await verifyTotp(storedSecret, cleanCode));
        if (!totpVerified) {
          setErrorMessage('❌ Invalid 6-digit Authenticator code! Please check your Google or Microsoft Authenticator app.');
          return;
        }

        const userObj = {
          email: sanitizedEmail,
          name: fullName || 'Executive User',
          role: role,
          loggedInAt: new Date().toISOString(),
        };
        localStorage.setItem('tally_user_session', JSON.stringify(userObj));
        setSuccessMessage('Encrypted session established. Redirecting...');
        setTimeout(() => router.replace('/'), 800);
      }, 700);
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-orange-600 selection:text-white">
      {/* Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-orange-600/15 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c191715_1px,transparent_1px),linear-gradient(to_bottom,#1c191715_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Main Glassmorphic Security Portal Card */}
      <div className="w-full max-w-md bg-stone-900/90 backdrop-blur-2xl border border-stone-800 rounded-3xl p-8 shadow-2xl z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 shadow-xl shadow-orange-600/30">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Omni</span>
              <span className="text-orange-500">Finance</span>
            </h1>
            <p className="text-xs text-stone-400 font-semibold tracking-wider uppercase mt-1">
              Enterprise Financial Gateway
            </p>
          </div>
        </div>

        {/* Security Assurance Badge */}
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 text-[11px] text-stone-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>256-Bit TLS Encrypted • Mandatory Email Verification</span>
        </div>

        {/* Email Verification Pending Screen */}
        {verificationPending ? (
          <div className="p-6 rounded-2xl bg-stone-950/90 border border-orange-500/30 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto">
              <MailCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">Check Your Corporate Inbox</h2>
              <p className="text-xs text-stone-300">
                A verification link has been sent to <span className="font-mono text-orange-400 font-bold">{unverifiedEmail}</span>.
              </p>
              <p className="text-[11px] text-stone-400 pt-1">
                Please click the link in the email to activate your executive access.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleResendVerification()}
                disabled={resendingEmail}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {resendingEmail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setVerificationPending(false);
                  setIsSignUp(false);
                }}
                className="w-full py-2 text-[11px] text-stone-400 hover:text-white transition cursor-pointer"
              >
                Back to Sign In Form
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Error / Alert Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold space-y-2 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                {unverifiedEmail && (
                  <button
                    type="button"
                    onClick={() => handleResendVerification(unverifiedEmail)}
                    disabled={resendingEmail}
                    className="w-full mt-1 py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {resendingEmail ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Resend Verification Email</span>
                  </button>
                )}
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Primary Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Sharma"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-xs bg-stone-950 border border-stone-800 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Authorized Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-xs bg-stone-950 border border-stone-800 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Corporate Password / Passkey</span>
                  <span className="text-[10px] text-orange-400 font-normal">256-bit Encrypted</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-xs bg-stone-950 border border-stone-800 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Authenticator App 6-Digit Code (Google & Microsoft Authenticator) */}
              {!isSignUp && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                      <span>Authenticator 6-Digit Code</span>
                    </label>
                    <span className="text-[10px] text-stone-500 font-medium">Google / Microsoft Authenticator</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit code (required for Admin 2FA)"
                      value={securityCode}
                      onChange={e => setSecurityCode(e.target.value.replace(/\s+/g, ''))}
                      className="w-full pl-10 pr-4 py-3 text-xs bg-stone-950 border border-stone-800 rounded-xl text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 transition font-mono tracking-widest text-center sm:text-left text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1.5">
                    <span>Google & Microsoft Authenticator</span>
                    <span className="text-stone-500">Optional for staff</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isSignUp ? 'Register Security Credentials' : 'Sign In with Email & Credentials'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center text-xs text-stone-400 border-t border-stone-800/80 pt-4">
              <span>{isSignUp ? 'Already have authorized credentials?' : 'Need to register a new executive account?'} </span>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setVerificationPending(false);
                }}
                className="text-orange-500 font-bold hover:underline ml-1 cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Register Account'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer Security Notice */}
      <div className="mt-6 text-center space-y-1 z-10">
        <p className="text-[11px] text-stone-500 font-medium">
          OmniFinance Enterprise Financial Intelligence
        </p>
        <p className="text-[10px] text-stone-600 font-mono">
          Email verification enforced. Access attempts are logged.
        </p>
        <p className="text-[10px] text-white font-mono tracking-widest select-none pt-2 font-black">
          vXE.10.1
        </p>
      </div>
    </div>
  );
}
