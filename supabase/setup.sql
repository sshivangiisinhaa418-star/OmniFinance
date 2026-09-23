-- ============================================================
-- SUPABASE POSTGRESQL SETUP WITH ALL EXACT MODULE COLUMNS
-- Run this script in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Metadata Snapshots Table
CREATE TABLE IF NOT EXISTS public.snapshots (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT DEFAULT 'Finance Team',
    record_count INTEGER DEFAULT 0,
    grand_total_opening NUMERIC DEFAULT 0,
    grand_total_debit NUMERIC DEFAULT 0,
    grand_total_credit NUMERIC DEFAULT 0,
    grand_total_closing NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active'
);

-- 2. SALES TRANSACTIONS TABLE (With all exact Tally Sales export columns)
DROP TABLE IF EXISTS public.sales_transactions CASCADE;

CREATE TABLE public.sales_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date TEXT NOT NULL,
    particulars TEXT NOT NULL,
    party_name TEXT NOT NULL,
    voucher_type TEXT DEFAULT 'Sales',
    voucher_number TEXT NOT NULL,
    voucher_ref_no TEXT,
    gstin TEXT,
    pan_no TEXT,
    quantity NUMERIC DEFAULT 0,
    value NUMERIC DEFAULT 0,
    gross_total NUMERIC DEFAULT 0,
    sale_amount NUMERIC DEFAULT 0,
    igst NUMERIC DEFAULT 0,
    round_off NUMERIC DEFAULT 0,
    cgst NUMERIC DEFAULT 0,
    sgst NUMERIC DEFAULT 0,
    work_contract NUMERIC DEFAULT 0,
    transportation_charges NUMERIC DEFAULT 0,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACCOUNTS PAYABLE TABLE
CREATE TABLE IF NOT EXISTS public.payables_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date TEXT NOT NULL,
    voucher_number TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_type TEXT DEFAULT 'vendor',
    ledger_name TEXT NOT NULL,
    ledger_category TEXT DEFAULT 'payables',
    opening_balance NUMERIC DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid',
    description TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ACCOUNTS RECEIVABLE TABLE
CREATE TABLE IF NOT EXISTS public.receivables_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    voucher_number TEXT DEFAULT 'VCH-001',
    voucher_type TEXT DEFAULT 'Receipt',
    particulars TEXT NOT NULL,
    party_name TEXT NOT NULL,
    party_type TEXT DEFAULT 'customer',
    ledger_name TEXT DEFAULT 'Receivables Account',
    ledger_category TEXT DEFAULT 'receivables',
    opening_balance NUMERIC DEFAULT 0,
    closing_balance NUMERIC DEFAULT 0,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    due_date DATE,
    overdue_days INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid',
    description TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PURCHASES TRANSACTIONS TABLE (With ALL 80 exact Purchase Register columns)
DROP TABLE IF EXISTS public.purchases_transactions CASCADE;

CREATE TABLE public.purchases_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date TEXT NOT NULL,
    particulars TEXT NOT NULL,
    party_name TEXT NOT NULL DEFAULT 'Vendor',
    voucher_type TEXT DEFAULT 'Purchase',
    voucher_number TEXT NOT NULL,
    ledger_name TEXT DEFAULT 'Purchase Account',
    item_name TEXT,
    item_category TEXT,
    supplier_invoice_no TEXT,
    supplier_invoice_date DATE,
    gstin TEXT,
    pan_no TEXT,
    quantity NUMERIC DEFAULT 0,
    rate NUMERIC DEFAULT 0,
    value NUMERIC DEFAULT 0,
    addl_cost NUMERIC DEFAULT 0,
    gross_total NUMERIC DEFAULT 0,
    purchases_ac NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    input_igst_silvassa NUMERIC DEFAULT 0,
    round_off NUMERIC DEFAULT 0,
    repair_maintenance_gst NUMERIC DEFAULT 0,
    transportation_expenses NUMERIC DEFAULT 0,
    input_cgst_silvassa NUMERIC DEFAULT 0,
    input_sgst_silvassa NUMERIC DEFAULT 0,
    professional_charges NUMERIC DEFAULT 0,
    consultancy_charges NUMERIC DEFAULT 0,
    tds_payable_194j NUMERIC DEFAULT 0,
    general_expenses_non_gst NUMERIC DEFAULT 0,
    roc_fee NUMERIC DEFAULT 0,
    freight_charges NUMERIC DEFAULT 0,
    electrical_items NUMERIC DEFAULT 0,
    sop_waiver_fee NUMERIC DEFAULT 0,
    gst_non_credit NUMERIC DEFAULT 0,
    software_renewal_charges NUMERIC DEFAULT 0,
    input_igst_kol NUMERIC DEFAULT 0,
    store_consumption NUMERIC DEFAULT 0,
    purchases_for_rajmahal NUMERIC DEFAULT 0,
    store_material_rajmahal NUMERIC DEFAULT 0,
    transportation_expenses_rajmahal NUMERIC DEFAULT 0,
    input_sgst_kol NUMERIC DEFAULT 0,
    input_cgst_kol NUMERIC DEFAULT 0,
    labour_charge_rajmahal NUMERIC DEFAULT 0,
    commission_expenses_rajmahal NUMERIC DEFAULT 0,
    tds_payable_194c NUMERIC DEFAULT 0,
    tds_payable_194h NUMERIC DEFAULT 0,
    plant_machinery_silvassa NUMERIC DEFAULT 0,
    hotel_lodging_non_gst NUMERIC DEFAULT 0,
    diesel_petrol NUMERIC DEFAULT 0,
    transportation_expenses_non_gst NUMERIC DEFAULT 0,
    electricity_expenses NUMERIC DEFAULT 0,
    courier_expenses NUMERIC DEFAULT 0,
    security_charges_non_gst NUMERIC DEFAULT 0,
    director_sitting_fee NUMERIC DEFAULT 0,
    packing_charges NUMERIC DEFAULT 0,
    commission_expenses_non_gst NUMERIC DEFAULT 0,
    professional_fee_non_gst NUMERIC DEFAULT 0,
    professional_fee NUMERIC DEFAULT 0,
    hire_charges_rajmahal NUMERIC DEFAULT 0,
    tds_payable_194i NUMERIC DEFAULT 0,
    insurance_expenses NUMERIC DEFAULT 0,
    labour_charges NUMERIC DEFAULT 0,
    expense_rajmahal NUMERIC DEFAULT 0,
    publishing_fee NUMERIC DEFAULT 0,
    rta_expenses NUMERIC DEFAULT 0,
    printing_expenses_ctp NUMERIC DEFAULT 0,
    design_charges NUMERIC DEFAULT 0,
    repair_maintenance_non_gst NUMERIC DEFAULT 0,
    depository_expenses NUMERIC DEFAULT 0,
    plant_expenses NUMERIC DEFAULT 0,
    artwork_sizzing NUMERIC DEFAULT 0,
    purchase_of_burnpur NUMERIC DEFAULT 0,
    tcs_receivable NUMERIC DEFAULT 0,
    annual_listing_fee NUMERIC DEFAULT 0,
    loading_unloading_rajmahal NUMERIC DEFAULT 0,
    general_exp_services_gst NUMERIC DEFAULT 0,
    exchange_fees_penalty NUMERIC DEFAULT 0,
    audit_fee NUMERIC DEFAULT 0,
    compressor NUMERIC DEFAULT 0,
    commission_expenses NUMERIC DEFAULT 0,
    gas_purchases NUMERIC DEFAULT 0,
    printing_stationery_expenses NUMERIC DEFAULT 0,
    transit_insurance_burnpur NUMERIC DEFAULT 0,
    cartage_charges NUMERIC DEFAULT 0,
    internet_charges NUMERIC DEFAULT 0,
    description TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS Policies
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases_transactions ENABLE ROW LEVEL SECURITY;

-- 6. PAYMENTS REGISTER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payments_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date TEXT NOT NULL,
    particulars TEXT NOT NULL,
    party_name TEXT NOT NULL,
    voucher_type TEXT DEFAULT 'Payment',
    voucher_number TEXT NOT NULL,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RECEIPTS REGISTER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.receipts_transactions (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT REFERENCES public.snapshots(id) ON DELETE CASCADE,
    source_import_id TEXT,
    transaction_date TEXT NOT NULL,
    particulars TEXT NOT NULL,
    party_name TEXT NOT NULL,
    voucher_type TEXT DEFAULT 'Receipt',
    voucher_number TEXT NOT NULL,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.receipts_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all snapshots" ON public.snapshots;
DROP POLICY IF EXISTS "Allow all sales" ON public.sales_transactions;
DROP POLICY IF EXISTS "Allow all payables" ON public.payables_transactions;
DROP POLICY IF EXISTS "Allow all receivables" ON public.receivables_transactions;
DROP POLICY IF EXISTS "Allow all purchases" ON public.purchases_transactions;
DROP POLICY IF EXISTS "Allow all payments" ON public.payments_transactions;
DROP POLICY IF EXISTS "Allow all receipts" ON public.receipts_transactions;

CREATE POLICY "Allow all snapshots" ON public.snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sales" ON public.sales_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payables" ON public.payables_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all receivables" ON public.receivables_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all purchases" ON public.purchases_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all payments" ON public.payments_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all receipts" ON public.receipts_transactions FOR ALL USING (true) WITH CHECK (true);

-- 8. USER PROFILES TABLE & AUTOMATIC SIGNUP TRIGGER
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'CFO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all profiles" ON public.profiles;
CREATE POLICY "Allow all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Automatic trigger to populate public.profiles on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Executive User'),
    COALESCE(new.raw_user_meta_data->>'role', 'CFO')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
