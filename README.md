# 💎 OmniFinance — Executive Financial Intelligence Suite

> **OmniFinance** is an enterprise-grade financial analytics platform designed to ingest, process, and analyze financial ledger exports (Sales, Purchases, Accounts Receivable, Accounts Payable, Payment Register, and Receipt Register). Built with Next.js 14, TypeScript, TailwindCSS, and Supabase PostgreSQL.

---

## ✨ Features

- 📊 **Executive Financial Dashboard**: Real-time KPIs, Cash Flow, Net Balance, Revenue vs Expense trends, and Accounts Receivable/Payable aging analytics.
- 🛒 **Purchases & Sales Registers**: Full column support including multi-state GST (IGST, CGST, SGST), TDS (194C, 194J, 194I), and expense classifications.
- 💳 **Payments & Receipts Registers**: Real-time tracking of payment/receipt vouchers with debit/credit breakdown.
- 📅 **Smart Month/Year Date Filtering**: Normalized Tally date parsing (`01-Aug-26`, `1-Aug-2026`) with date availability warnings.
- ⚡ **Option A Overwrite Sync**: Smart snapshot overwrite and purge mechanism to prevent duplicate transaction rows during re-imports.
- 🔒 **Enterprise Gateway & Route Guard (`AuthGuard`)**: Standalone 256-bit TLS login portal, route protection blocking unauthenticated access, and email verification workflows via Supabase Auth.
- ☁️ **Supabase PostgreSQL & RLS**: Fully relational schema with Row Level Security policies and automated profile triggers.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS & Lucide Icons
- **Charts**: Recharts & Lucide React
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth
- **Excel Parser**: SheetJS (XLSX)

---

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sshivangiisinhaa418-star/OmniFinance.git
   cd OmniFinance
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run Database Schema**:
   Copy and execute the SQL script in [`supabase/setup.sql`](supabase/setup.sql) inside your Supabase SQL Editor.

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## 🛡️ License

MIT License. Designed for Enterprise Financial Analytics.
