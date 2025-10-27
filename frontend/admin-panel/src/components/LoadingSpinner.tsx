import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'purple' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    purple: 'border-purple-600',
    gray: 'border-gray-600',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`
          ${sizeClasses[size]}
          border-4
          border-gray-200
          ${colorClasses[color]}
          border-t-transparent
          rounded-full
          animate-spin
        `}
      />
      {text && <p className="text-gray-600 text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton components for loading states
export const SkeletonText: React.FC<{ width?: string; lines?: number }> = ({ width = 'w-full', lines = 1 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, idx) => (
      <div key={idx} className={`h-4 bg-gray-200 rounded animate-pulse ${width}`} />
    ))}
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      <div className="w-16 h-6 bg-gray-200 rounded" />
    </div>
    <div className="h-8 bg-gray-200 rounded mb-2 w-24" />
    <div className="h-4 bg-gray-200 rounded w-32" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
    </div>
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="px-6 py-4 flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-80 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-80 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonDashboard;

// Error state components
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Error',
  message = 'Something went wrong',
  onRetry,
  className = ''
}) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4 max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    )}
  </div>
);

export const NetworkErrorState: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className = '' }) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    <WifiOff className="w-12 h-12 text-orange-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
    <p className="text-gray-600 mb-4 max-w-md">
      Please check your internet connection and try again.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Wifi className="w-4 h-4" />
        Retry Connection
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({
  title = 'No data',
  message = 'No items to display',
  icon,
  action,
  className = ''
}) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    {icon || <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <span className="text-gray-400 text-xl">📦</span>
    </div>}
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4 max-w-md">{message}</p>
    {action}
  </div>
);

// Combined loading/error/empty state component
export const AsyncContent: React.FC<{
  loading: boolean;
  error?: string | Error | null;
  empty?: boolean;
  onRetry?: () => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
}> = ({
  loading,
  error,
  empty = false,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}) => {
  if (loading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return errorComponent || (
      <ErrorState
        message={typeof error === 'string' ? error : error.message}
        onRetry={onRetry}
      />
    );
  }

  if (empty) {
    return emptyComponent || (
      <EmptyState />
    );
  }

  return <>{children}</>;
};

