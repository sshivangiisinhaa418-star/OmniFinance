import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CompanySlug, COMPANIES, DEFAULT_COMPANY } from '@/lib/company/companyConfig';

// In-memory client connection pool to prevent duplicate client initialization
const clientPool = new Map<string, SupabaseClient>();

// Helper to resolve URL and Key for a specific company with static env access for Next.js client bundler
export function getCompanyCredentials(companySlug: CompanySlug = DEFAULT_COMPANY): { url: string; anonKey: string } {
  const slug = (companySlug || DEFAULT_COMPANY).toLowerCase() as CompanySlug;
  switch (slug) {
    case 'bkm':
      return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL_BKM || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_BKM || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      };
    case 'avl':
      return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL_AVL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_AVL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      };
    case 'ssl':
      return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL_SSL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SSL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      };
    default:
      return {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      };
  }
}

// Get or create dedicated Supabase client for a specific company
export function getSupabaseForCompany(companySlug: CompanySlug = DEFAULT_COMPANY): SupabaseClient | null {
  if (clientPool.has(companySlug)) {
    return clientPool.get(companySlug)!;
  }

  const { url, anonKey } = getCompanyCredentials(companySlug);

  if (!url || !anonKey) {
    return null;
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  clientPool.set(companySlug, client);
  return client;
}

// Central Primary Supabase client for Authentication & Global Sessions (defaults to primary configured project)
const globalAuthUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL_SSL || getCompanyCredentials('ssl').url;
const globalAuthKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SSL || getCompanyCredentials('ssl').anonKey;

export const supabase = (globalAuthUrl && globalAuthKey)
  ? createClient(globalAuthUrl, globalAuthKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const isSupabaseConfigured = (companySlug?: CompanySlug): boolean => {
  if (companySlug) {
    const creds = getCompanyCredentials(companySlug);
    return Boolean(creds.url && creds.anonKey);
  }
  return Boolean(supabase);
};
