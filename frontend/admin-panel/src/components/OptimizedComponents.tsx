import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import Image from 'next/image';
import { Card, Button } from '@ayazlogistics/design-system';

/**
 * Performance-Optimized Components
 * React.memo, useMemo, useCallback, React.lazy examples
 */

// ========== React.memo Examples ==========

interface ExpensiveListItemProps {
  id: string;
  title: string;
  description: string;
  onClick: (id: string) => void;
}

export const ExpensiveListItem = memo<ExpensiveListItemProps>(({ id, title, description, onClick }) => {
  console.log('Rendering ExpensiveListItem:', id);
  
  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  return (
    <div onClick={handleClick} className="p-4 border rounded hover:bg-gray-50 cursor-pointer">
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
});

ExpensiveListItem.displayName = 'ExpensiveListItem';

// ========== useMemo Example ==========

interface DataTableProps {
  data: Array<{ id: string; name: string; value: number; category: string }>;
  filterCategory?: string;
}

export const DataTable = memo<DataTableProps>(({ data, filterCategory }) => {
  // Expensive filtering operation - memoized
  const filteredData = useMemo(() => {
    console.log('Filtering data...');
    if (!filterCategory) return data;
    return data.filter(item => item.category === filterCategory);
  }, [data, filterCategory]);

  // Expensive calculation - memoized
  const statistics = useMemo(() => {
    console.log('Calculating statistics...');
    return {
      total: filteredData.reduce((sum, item) => sum + item.value, 0),
      average: filteredData.length > 0 ? filteredData.reduce((sum, item) => sum + item.value, 0) / filteredData.length : 0,
      count: filteredData.length,
    };
  }, [filteredData]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{statistics.total.toLocaleString('tr-TR')}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Average</p>
          <p className="text-2xl font-bold">{statistics.average.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Count</p>
          <p className="text-2xl font-bold">{statistics.count}</p>
        </Card>
      </div>
      
      <div className="space-y-2">
        {filteredData.map(item => (
          <div key={item.id} className="p-3 bg-white rounded border">
            <span className="font-medium">{item.name}</span>
            <span className="float-right">{item.value.toLocaleString('tr-TR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';

// ========== useCallback Example ==========

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
}

export const SearchBar = memo<SearchBarProps>(({ onSearch, onFilterChange }) => {
  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState({});

  // Memoized callbacks to prevent child re-renders
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  }, [query, onSearch]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 px-4 py-2 border rounded"
        placeholder="Search..."
      />
      <Button type="submit">Search</Button>
    </form>
  );
});

SearchBar.displayName = 'SearchBar';

// ========== Code Splitting with React.lazy ==========

// Lazy load heavy components - commented out for build
// const HeavyDashboard = lazy(() => import('./HeavyDashboard'));
// const ReportGenerator = lazy(() => import('./ReportGenerator'));
// const ChartLibrary = lazy(() => import('./ChartLibrary'));

export const LazyLoadedPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'reports' | 'charts'>('dashboard');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setActiveTab('dashboard')}>Dashboard</Button>
        <Button onClick={() => setActiveTab('reports')}>Reports</Button>
        <Button onClick={() => setActiveTab('charts')}>Charts</Button>
      </div>

      <div className="p-8 text-center">
        <p>Lazy loading components are temporarily disabled for build.</p>
      </div>
    </div>
  );
};

// ========== Image Optimization with Next.js Image ==========

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
}

export const ProductCard = memo<ProductCardProps>(({ product }) => {
  return (
    <Card>
      {/* Optimized image with Next.js Image component */}
      <Image
        src={product.image}
        alt={product.name}
        width={300}
        height={300}
        quality={85}
        priority={false}
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        className="rounded-t-lg"
      />
      <div className="p-4">
        <h3 className="font-bold">{product.name}</h3>
        <p className="text-lg font-semibold text-green-600">
          {product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        </p>
      </div>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

// ========== Virtualized List for Large Datasets ==========

// import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps {
  items: Array<{ id: string; name: string }>;
  itemHeight: number;
}

export const VirtualizedList = memo<VirtualizedListProps>(({ items, itemHeight }) => {
  return (
    <div className="border border-gray-300 rounded-lg h-96 overflow-y-auto">
      {items.map((item, index) => (
        <div key={item.id} className="px-4 py-2 border-b">
          {item.name}
        </div>
      ))}
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

// ========== Performance Monitoring Hook ==========

export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // 60fps = 16ms per frame
        console.warn(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}

// Usage example
export const MonitoredComponent: React.FC = () => {
  usePerformanceMonitor('MonitoredComponent');
  
  return <div>Component with performance monitoring</div>;
};

