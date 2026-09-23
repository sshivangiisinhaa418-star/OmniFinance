'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  Layers,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Database,
  ChevronDown,
  FileText,
  UploadCloud,
  DollarSign,
  Users,
  Clock,
  Receipt,
  Building2,
  CreditCard,
  Package,
  FileCheck2,
  BookOpen,
  ListFilter,
  History,
  Settings,
  Sparkles,
  Percent,
  Wallet,
  Building,
  Cpu,
  Flame,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const pathname = usePathname();
  const menuItems = [
    { label: 'Executive Summary', href: '/', icon: LayoutDashboard, badge: 'Summary' },
    { label: 'Sales Transactions', href: '/sales', icon: TrendingUp, dbTable: 'sales_transactions' },
    { label: 'Receivables Transactions', href: '/receivables', icon: Clock, dbTable: 'receivables_transactions' },
    { label: 'Purchases Transactions', href: '/purchases', icon: ShoppingBag, dbTable: 'purchases_transactions' },
    { label: 'Payables Transactions', href: '/payables', icon: CreditCard, dbTable: 'payables_transactions' },
    { label: 'Payment Register', href: '/payments', icon: Receipt, dbTable: 'payments_transactions' },
    { label: 'Receipt Register', href: '/receipts', icon: Wallet, dbTable: 'receipts_transactions' },
    { label: 'System Settings', href: '/settings', icon: Settings, badge: 'Config' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-white dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/70">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-black text-stone-900 dark:text-white text-base tracking-wide leading-tight flex items-center gap-1">
                Omni<span className="text-orange-600 dark:text-orange-500 font-extrabold">Finance</span>
              </span>
              <span className="text-[10px] text-orange-600 dark:text-amber-500 uppercase tracking-widest font-extrabold">
                Executive Suite
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          title={collapsed ? 'Expand Workspace Menu' : 'Collapse Workspace Menu'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {!collapsed ? 'Core Financial Modules' : 'Menu'}
        </div>

        {menuItems.map(item => {
          const ItemIcon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 font-extrabold'
                  : 'text-stone-800 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <ItemIcon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-stone-500 dark:text-stone-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            TV
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-200 truncate">
                Senior Financial Architect
              </span>
              <span className="text-[10px] text-orange-600 dark:text-amber-500 font-extrabold truncate">
                TallyVision Executive
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
