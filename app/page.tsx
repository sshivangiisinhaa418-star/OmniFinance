'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Building2,
  Truck,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Database,
  Globe,
  Sparkles,
  LogOut,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { COMPANY_LIST, CompanyConfig } from '@/lib/company/companyConfig';
import { useCompany } from '@/context/CompanyContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import pkg from '@/package.json';

export default function CompanyGatewayPage() {
  const router = useRouter();
  const { switchCompany } = useCompany();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);

  const handleLaunch = (company: CompanyConfig) => {
    setLaunching(company.id);
    switchCompany(company.id);
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    localStorage.removeItem('tally_user_session');
    router.replace('/login');
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Truck':
        return <Truck className="w-8 h-8" />;
      case 'Cpu':
        return <Cpu className="w-8 h-8" />;
      case 'Building2':
      default:
        return <Building2 className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-orange-600 selection:text-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* TOP COMMAND BAR */}
      <header className="relative z-10 w-full border-b border-stone-800/80 bg-stone-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-wide leading-none">
                Omni<span className="text-orange-500 font-extrabold">Finance</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black text-white bg-gradient-to-r from-orange-600 to-amber-600 rounded-md border border-orange-400/30">
                v{pkg.version}
              </span>
            </div>
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
              Multi-Entity Enterprise Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">256-bit Encrypted Multi-Tenant Gateway</span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition cursor-pointer"
            title="Sign out of financial portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* MAIN HERO & ENTITY SELECTION */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
        {/* Hero Title */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Company Financial Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Select Your Corporate{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              Entity Workspace
            </span>
          </h1>

          <p className="text-sm sm:text-base text-stone-400 leading-relaxed">
            Each company operates on a dedicated, isolated database with independent ledger registers, GST reconciliations, and executive dashboards. Select an organization to launch.
          </p>
        </div>

        {/* 3 ENTITY CARDS GRID (BKM, AVL, SSL) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {COMPANY_LIST.map((comp) => {
            const isHovered = selectedEntity === comp.id;
            const isLaunchingThis = launching === comp.id;

            return (
              <div
                key={comp.id}
                onMouseEnter={() => setSelectedEntity(comp.id)}
                onMouseLeave={() => setSelectedEntity(null)}
                className={`relative group rounded-3xl p-8 border transition-all duration-300 flex flex-col justify-between backdrop-blur-xl ${
                  isHovered
                    ? `border-stone-700 bg-stone-900/90 shadow-2xl ${comp.glowShadow} -translate-y-1.5`
                    : 'border-stone-800/80 bg-stone-900/40 hover:border-stone-700/80'
                }`}
              >
                <div>
                  {/* Top Row: Icon & Dedicated DB Status */}
                  <div className="flex items-center justify-between mb-8">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${comp.gradient} flex items-center justify-center text-white shadow-xl ${comp.glowShadow} transition-transform duration-300 group-hover:scale-105`}
                    >
                      {getIcon(comp.iconName)}
                    </div>

                    <span className="px-3 py-1.5 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Dedicated DB</span>
                    </span>
                  </div>

                  {/* Clean Company Name: BKM, AVL, SSL */}
                  <h2 className="text-4xl font-black text-white tracking-tight group-hover:text-orange-400 transition-colors">
                    {comp.name}
                  </h2>
                  <p className="text-xs text-stone-400 font-medium mt-2">
                    Isolated Financial Database &amp; Ledger Workspace
                  </p>
                </div>

                {/* Launch Workspace CTA Button */}
                <div className="mt-10 pt-6 border-t border-stone-800/80">
                  <button
                    onClick={() => handleLaunch(comp)}
                    disabled={isLaunchingThis}
                    className={`w-full py-4 px-4 rounded-2xl text-sm font-black tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg ${
                      comp.id === 'ssl'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                        : comp.id === 'avl'
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-violet-600/30'
                        : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-orange-600/30'
                    }`}
                  >
                    {isLaunchingThis ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin" />
                        <span>Connecting to {comp.name} DB...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch {comp.name} Workspace</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="mt-3 text-center">
                    <span className="text-[11px] text-stone-500 font-mono">
                      URL: /{comp.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM ARCHITECTURAL ASSURANCE STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-stone-800/60">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-900/40 border border-stone-800/60">
            <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-white">Physical DB Segregation</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Each company connects to independent Supabase database credentials with zero risk of cross-contamination.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-900/40 border border-stone-800/60">
            <Globe className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-white">Isolated URL Namespaces</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Every browser tab runs in its own URL scope (<code className="text-orange-400">/bkm</code>, <code className="text-orange-400">/avl</code>, <code className="text-orange-400">/ssl</code>) allowing safe multi-tab work.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-stone-900/40 border border-stone-800/60">
            <FileSpreadsheet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-white">Tally Header Validation</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Excel parser verifies company headers during upload to prevent uploading one company&apos;s ledger into another.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-stone-800/60 py-4 px-6 text-center text-xs text-stone-500">
        <span>OmniFinance Executive Multi-Entity Gateway &copy; {new Date().getFullYear()}. All Rights Reserved.</span>
      </footer>
    </div>
  );
}
