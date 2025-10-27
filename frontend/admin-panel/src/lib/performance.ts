// Performance monitoring utilities for frontend

export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  static mark(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name);
    }
  }

  static measure(name: string, startMark: string, endMark: string) {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name)[0];
        
        if (measure) {
          const existing = this.metrics.get(name) || [];
          existing.push(measure.duration);
          this.metrics.set(name, existing);
        }
      } catch (error) {
        console.error('Performance measurement error:', error);
      }
    }
  }

  static getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  static clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  static reportMetrics() {
    const report: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      report[name] = this.getMetrics(name);
    });

    return report;
  }
}

// React component performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    PerformanceMonitor.mark(startMark);

    React.useEffect(() => {
      PerformanceMonitor.mark(endMark);
      PerformanceMonitor.measure(measureName, startMark, endMark);
    });

    return React.createElement(Component, props);
  };
}

// Web Vitals monitoring
export function reportWebVitals(metric: any) {
  // Send to analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(console.error);
  }
  
  console.log(metric);
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window !== 'undefined') {
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter((r: any) => r.initiatorType === 'script');
    
    const totalSize = scripts.reduce((sum: number, script: any) => {
      return sum + (script.transferSize || 0);
    }, 0);

    return {
      totalSize,
      scriptCount: scripts.length,
      scripts: scripts.map((s: any) => ({
        name: s.name,
        size: s.transferSize,
        duration: s.duration,
      })),
    };
  }
  
  return null;
}

// Lazy load images
export function lazyLoadImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return { imageSrc, isLoaded };
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Import React for the utilities
import * as React from 'react';
