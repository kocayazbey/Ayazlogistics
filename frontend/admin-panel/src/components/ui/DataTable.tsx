import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  accessor?: (item: T) => any;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  key: string;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  pagination?: PaginationConfig;
  onSort?: (sortConfig: SortConfig) => void;
  onFilter?: (filters: FilterConfig[]) => void;
  onSearch?: (query: string) => void;
  onPaginationChange?: (pagination: PaginationConfig) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  selectable?: boolean;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  filterable = true,
  sortable = true,
  pagination,
  onSort,
  onFilter,
  onSearch,
  onPaginationChange,
  onSelectionChange,
  selectable = false,
  className,
  emptyMessage = 'No data available',
  emptyIcon,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 20);

  // Handle sorting
  const handleSort = (key: string) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';

    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);

    if (onSort) {
      onSort(newSortConfig);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (pagination && onPaginationChange) {
      onPaginationChange({ ...pagination, page });
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    if (pagination && onPaginationChange) {
      onPaginationChange({ ...pagination, pageSize: newPageSize, page: 1 });
    }
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery) {
      result = result.filter(item =>
        columns.some(column => {
          const value = column.accessor ? column.accessor(item) : item[column.key as keyof T];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    if (filters.length > 0) {
      result = result.filter(item =>
        filters.every(filter => {
          const column = columns.find(col => col.key === filter.key);
          if (!column) return true;

          const value = column.accessor ? column.accessor(item) : item[column.key as keyof T];
          const filterValue = filter.value.toLowerCase();

          switch (filter.operator) {
            case 'contains':
              return String(value).toLowerCase().includes(filterValue);
            case 'equals':
              return String(value).toLowerCase() === filterValue;
            case 'startsWith':
              return String(value).toLowerCase().startsWith(filterValue);
            case 'endsWith':
              return String(value).toLowerCase().endsWith(filterValue);
            case 'gt':
              return Number(value) > Number(filter.value);
            case 'lt':
              return Number(value) < Number(filter.value);
            case 'gte':
              return Number(value) >= Number(filter.value);
            case 'lte':
              return Number(value) <= Number(filter.value);
            default:
              return true;
          }
        })
      );
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const column = columns.find(col => col.key === sortConfig.key);
        if (!column) return 0;

        const aValue = column.accessor ? column.accessor(a) : a[column.key as keyof T];
        const bValue = column.accessor ? column.accessor(b) : b[column.key as keyof T];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, columns, searchQuery, filters, sortConfig]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pagination, currentPage, pageSize]);

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedData);
    } else {
      setSelectedItems([]);
    }
    if (onSelectionChange) {
      onSelectionChange(checked ? paginatedData : []);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedItems, item];
    } else {
      newSelection = selectedItems.filter(selected => selected !== item);
    }
    setSelectedItems(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  // Pagination info
  const totalPages = pagination ? Math.ceil(filteredData.length / pageSize) : 1;
  const startItem = pagination ? (currentPage - 1) * pageSize + 1 : 1;
  const endItem = pagination ? Math.min(currentPage * pageSize, filteredData.length) : filteredData.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            )}

            {filterable && (
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                </Button>
                {filters.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {filters.length} filter{filters.length > 1 ? 's' : ''} applied
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selection info */}
      {selectable && selectedItems.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-700">
            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelectAll(false)}
            className="text-blue-700 hover:text-blue-900"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  sortable={sortable && column.sortable !== false}
                  sortDirection={
                    sortConfig?.key === column.key ? sortConfig.direction : null
                  }
                  onSort={() => column.sortable !== false && handleSort(String(column.key))}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {selectable && <TableCell><div className="w-4 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center py-8"
                >
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon || <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xl">📦</span>
                    </div>}
                    <p className="text-gray-500">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={index}>
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item)}
                        onChange={(e) => handleSelectItem(item, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value = column.accessor ? column.accessor(item) : item[column.key as keyof T];
                    const content = column.render ? column.render(value, item, index) : String(value || '');

                    return (
                      <TableCell
                        key={String(column.key)}
                        align={column.align}
                        numeric={typeof value === 'number'}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col gap-4">
          {/* Mobile pagination info */}
          <div className="flex items-center justify-center sm:hidden">
            <span className="text-sm text-gray-700">
              {startItem}-{endItem} of {filteredData.length}
            </span>
          </div>

          {/* Desktop pagination controls */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                Show
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pagination.pageSizeOptions?.map(size => (
                  <option key={size} value={size}>{size}</option>
                )) || [10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-sm text-gray-700">
                entries
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {startItem}-{endItem} of {filteredData.length}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile pagination controls */}
          <div className="flex sm:hidden items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <span className="text-sm text-gray-700 px-3">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
