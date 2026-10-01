'use client';

import React, { createContext, useContext, useState } from 'react';
import { GlobalFilterState } from '@/types';

interface FilterContextType {
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  resetFilters: () => void;
}

const initialFilters: GlobalFilterState = {
  dateRange: { start: '', end: '' },
  financialYear: 'All Time',
  quarter: 'All',
  month: 'All',
  party: '',
  ledger: '',
  voucherType: '',
  branch: '',
  searchQuery: '',
};

const FilterContext = createContext<FilterContextType>({
  filters: initialFilters,
  setFilters: () => {},
  resetFilters: () => {},
});

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilterState>(initialFilters);

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => useContext(FilterContext);
