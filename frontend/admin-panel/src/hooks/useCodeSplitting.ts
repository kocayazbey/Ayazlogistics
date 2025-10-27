import { useState, useEffect, useCallback } from 'react';

interface CodeSplittingOptions {
  fallback?: React.ComponentType;
  errorBoundary?: boolean;
  preload?: boolean;
}

export const useCodeSplitting = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: CodeSplittingOptions = {}
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      setComponent(() => module.default);
      return module.default;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [Component, importFunc]);

  const preloadComponent = useCallback(() => {
    if (!Component && !loading) {
      loadComponent();
    }
  }, [Component, loading, loadComponent]);

  useEffect(() => {
    if (options.preload) {
      preloadComponent();
    }
  }, [options.preload, preloadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    preloadComponent,
  };
};

export default useCodeSplitting;
