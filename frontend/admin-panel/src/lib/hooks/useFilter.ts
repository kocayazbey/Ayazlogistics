import { useState, useMemo, useCallback } from 'react';
import { debounce } from '../utils/debounce';

interface FilterConfig<T> {
  searchFields?: (keyof T)[];
  initialFilters?: Record<string, any>;
}

export function useFilter<T extends Record<string, any>>(
  data: T[],
  config: FilterConfig<T> = {}
) {
  const { searchFields = [], initialFilters = {} } = config;
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);

  const debouncedSetSearchTerm = useCallback(
    debounce((term: string) => setSearchTerm(term), 300),
    []
  );

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchTerm && searchFields.length > 0) {
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field])
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          result = result.filter((item) => value.includes(item[key]));
        } else {
          result = result.filter((item) => item[key] === value);
        }
      }
    });

    return result;
  }, [data, searchTerm, filters, searchFields]);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters(initialFilters);
  };

  const clearFilter = (key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  return {
    data: filteredData,
    searchTerm,
    filters,
    setSearchTerm: debouncedSetSearchTerm,
    updateFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters: searchTerm !== '' || Object.keys(filters).length > 0,
  };
}

