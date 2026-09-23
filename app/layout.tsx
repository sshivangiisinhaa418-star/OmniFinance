'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlobalFiltersModal } from '@/components/layout/GlobalFiltersModal';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { GlobalFilterState } from '@/types';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const [filters, setFilters] = useState<GlobalFilterState>({
    dateRange: { start: '', end: '' },
    financialYear: 'All Time',
    quarter: 'All',
    month: 'All',
    party: '',
    ledger: '',
    voucherType: '',
    branch: '',
    searchQuery: '',
  });

  return (
    <html lang="en" className="dark">
      <head>
        <title>OmniFinance — Enterprise Financial Intelligence Suite</title>
        <meta
          name="description"
          content="OmniFinance Enterprise Financial Intelligence Platform."
        />
      </head>
      <body className="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen font-sans antialiased selection:bg-orange-600 selection:text-white transition-colors duration-200">
        <AuthGuard>
          {isLoginPage ? (
            // Dedicated standalone login layout (no sidebar, no header, no search bars)
            <main className="min-h-screen w-full bg-stone-950 flex flex-col justify-center items-center">
              {children}
            </main>
          ) : (
            // Protected application layout
            <div className="flex min-h-screen">
              <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

              <div
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
                  collapsed ? 'ml-20' : 'ml-64'
                }`}
              >
                <Header
                  filters={filters}
                  setFilters={setFilters}
                  collapsed={collapsed}
                  onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
                  theme={theme}
                  setTheme={setTheme}
                />

                <main className="flex-1 pt-20 pb-12 px-6 overflow-y-auto">
                  {children}
                </main>
              </div>

              <GlobalFiltersModal
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                filters={filters}
                setFilters={setFilters}
              />
            </div>
          )}
        </AuthGuard>
      </body>
    </html>
  );
}
