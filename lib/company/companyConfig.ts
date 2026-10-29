export type CompanySlug = 'bkm' | 'avl' | 'ssl';

export interface CompanyConfig {
  id: CompanySlug;
  code: string;
  name: string;
  themeColor: 'amber' | 'violet' | 'emerald';
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  gradient: string;
  glowShadow: string;
  iconName: string;
  dbUrlEnvKey: string;
  dbKeyEnvKey: string;
}

export const COMPANIES: Record<CompanySlug, CompanyConfig> = {
  bkm: {
    id: 'bkm',
    code: 'BKM',
    name: 'BKM',
    themeColor: 'amber',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-700 dark:text-amber-400',
    gradient: 'from-amber-600 via-orange-500 to-amber-500',
    glowShadow: 'shadow-amber-500/20',
    iconName: 'Building2',
    dbUrlEnvKey: 'NEXT_PUBLIC_SUPABASE_URL_BKM',
    dbKeyEnvKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY_BKM',
  },
  avl: {
    id: 'avl',
    code: 'AVL',
    name: 'AVL',
    themeColor: 'violet',
    badgeBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    badgeBorder: 'border-violet-500/30',
    badgeText: 'text-violet-700 dark:text-violet-400',
    gradient: 'from-violet-600 via-purple-500 to-indigo-500',
    glowShadow: 'shadow-violet-500/20',
    iconName: 'Cpu',
    dbUrlEnvKey: 'NEXT_PUBLIC_SUPABASE_URL_AVL',
    dbKeyEnvKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY_AVL',
  },
  ssl: {
    id: 'ssl',
    code: 'SSL',
    name: 'SSL',
    themeColor: 'emerald',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    gradient: 'from-emerald-600 via-teal-500 to-emerald-400',
    glowShadow: 'shadow-emerald-500/20',
    iconName: 'Truck',
    dbUrlEnvKey: 'NEXT_PUBLIC_SUPABASE_URL_SSL',
    dbKeyEnvKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY_SSL',
  },
};

export const COMPANY_LIST: CompanyConfig[] = [
  COMPANIES.bkm,
  COMPANIES.avl,
  COMPANIES.ssl,
];

export const DEFAULT_COMPANY: CompanySlug = 'bkm';

export function isValidCompanySlug(slug: string): slug is CompanySlug {
  return slug === 'bkm' || slug === 'avl' || slug === 'ssl';
}

export function getCompanyConfig(slug?: string | null): CompanyConfig {
  if (slug && isValidCompanySlug(slug.toLowerCase())) {
    return COMPANIES[slug.toLowerCase() as CompanySlug];
  }
  return COMPANIES[DEFAULT_COMPANY];
}
