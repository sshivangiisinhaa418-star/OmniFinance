'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CompanySlug,
  CompanyConfig,
  COMPANIES,
  COMPANY_LIST,
  DEFAULT_COMPANY,
  isValidCompanySlug,
  getCompanyConfig,
} from '@/lib/company/companyConfig';

interface CompanyContextType {
  activeCompany: CompanyConfig;
  activeCompanyId: CompanySlug;
  companies: CompanyConfig[];
  isGateway: boolean;
  switchCompany: (targetSlug: CompanySlug) => void;
  getCompanyRoute: (subpath: string) => string;
  returnToGateway: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Extract company slug from window.location.pathname, searchParams, or router pathname
  const getDetectedCompany = useCallback((): CompanySlug | null => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && isValidCompanySlug(pathParts[0])) {
        return pathParts[0];
      }
      const params = new URLSearchParams(window.location.search);
      const paramComp = params.get('company');
      if (paramComp && isValidCompanySlug(paramComp)) {
        return paramComp;
      }
    }
    if (pathname) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0 && isValidCompanySlug(parts[0])) {
        return parts[0];
      }
    }
    return null;
  }, [pathname]);

  const [activeCompanyId, setActiveCompanyId] = useState<CompanySlug>(() => {
    const detected = typeof window !== 'undefined' ? (
      (() => {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0 && isValidCompanySlug(pathParts[0])) return pathParts[0];
        const params = new URLSearchParams(window.location.search);
        const paramComp = params.get('company');
        if (paramComp && isValidCompanySlug(paramComp)) return paramComp;
        const saved = localStorage.getItem('omnifinance_active_company_id');
        if (saved && isValidCompanySlug(saved)) return saved;
        return null;
      })()
    ) : null;
    return detected || DEFAULT_COMPANY;
  });

  // Sync state whenever pathname changes or browser navigates
  useEffect(() => {
    const detected = getDetectedCompany();
    if (detected && detected !== activeCompanyId) {
      setActiveCompanyId(detected);
    }
  }, [pathname, getDetectedCompany, activeCompanyId]);

  // Keep localStorage updated for legacy helpers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const comp = COMPANIES[activeCompanyId];
      localStorage.setItem('omnifinance_active_company_id', activeCompanyId);
      localStorage.setItem('omnifinance_selected_company', comp.name);
      localStorage.setItem(
        'omnifinance_company_list',
        JSON.stringify(COMPANY_LIST.map(c => c.name))
      );
    }
  }, [activeCompanyId]);

  const isGateway = pathname === '/' || pathname === '/gateway';

  // Navigate to target company while preserving sub-route
  const switchCompany = useCallback(
    (targetSlug: CompanySlug) => {
      if (!isValidCompanySlug(targetSlug)) return;

      setActiveCompanyId(targetSlug);
      if (typeof window !== 'undefined') {
        localStorage.setItem('omnifinance_active_company_id', targetSlug);
        localStorage.setItem('omnifinance_selected_company', COMPANIES[targetSlug].name);

        const currentPath = window.location.pathname;
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0 && isValidCompanySlug(parts[0])) {
          const subpath = parts.slice(1).join('/');
          window.location.href = `/${targetSlug}${subpath ? `/${subpath}` : ''}`;
        } else if (currentPath === '/' || currentPath === '/login' || currentPath === '/gateway') {
          window.location.href = `/${targetSlug}`;
        } else {
          window.location.href = `/${targetSlug}`;
        }
      } else {
        router.push(`/${targetSlug}`);
      }
    },
    [router]
  );

  // Helper to build links prefixed with active company: e.g. getCompanyRoute('/sales') -> '/ssl/sales'
  const getCompanyRoute = useCallback(
    (subpath: string) => {
      const cleanSubpath = subpath.startsWith('/') ? subpath : `/${subpath}`;
      if (cleanSubpath === '/' || cleanSubpath === '') {
        return `/${activeCompanyId}`;
      }
      return `/${activeCompanyId}${cleanSubpath}`;
    },
    [activeCompanyId]
  );

  const returnToGateway = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.push('/');
    }
  }, [router]);

  const activeCompany = useMemo(() => getCompanyConfig(activeCompanyId), [activeCompanyId]);

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        activeCompanyId,
        companies: COMPANY_LIST,
        isGateway,
        switchCompany,
        getCompanyRoute,
        returnToGateway,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
