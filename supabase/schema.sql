-- ============================================================
-- SUPABASE POSTGRESQL SCHEMA FOR TALLY FINANCE DASHBOARD
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT,
    currency TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    financial_year_start MONTH DEFAULT 4, -- April
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('Admin', 'Finance Manager', 'Finance User', 'Viewer')) DEFAULT 'Finance User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Imports Table
CREATE TABLE IF NOT EXISTS public.imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash TEXT,
    dataset_type TEXT NOT NULL,
    record_count INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'imported',
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Master Ledgers Table
CREATE TABLE IF NOT EXISTS public.ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    category TEXT,
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gstin TEXT,
    state TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 7. Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gstin TEXT,
    state TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 8. Main Financial Transactions Table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    source_import_id UUID REFERENCES public.imports(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    voucher_number TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_type TEXT CHECK (party_type IN ('customer', 'vendor', 'other')),
    ledger_name TEXT NOT NULL,
    ledger_category TEXT,
    item_name TEXT,
    item_category TEXT,
    quantity NUMERIC DEFAULT 0,
    rate NUMERIC DEFAULT 0,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    cgst NUMERIC DEFAULT 0,
    sgst NUMERIC DEFAULT 0,
    igst NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    due_date DATE,
    overdue_days INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_txn_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_txn_org ON public.financial_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_txn_voucher ON public.financial_transactions(voucher_number);
CREATE INDEX IF NOT EXISTS idx_txn_party ON public.financial_transactions(party_name);
CREATE INDEX IF NOT EXISTS idx_txn_type ON public.financial_transactions(voucher_type);
CREATE INDEX IF NOT EXISTS idx_txn_import ON public.financial_transactions(source_import_id);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    dataset TEXT,
    details TEXT,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
