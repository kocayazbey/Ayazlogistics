import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CorporateSidebar } from './CorporateSidebar';
import { CorporateHeader } from './CorporateHeader';

export interface CorporateLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

export function CorporateLayout({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
}: CorporateLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-secondary-900 opacity-50" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <CorporateSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <CorporateHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          actions={actions}
        />

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export interface CorporatePageProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

export function CorporatePage({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: CorporatePageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page header */}
      {(title || subtitle || breadcrumbs || actions) && (
        <div className="bg-white border border-secondary-200 rounded-lg shadow-corporate-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <nav className="flex mb-2" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                      {breadcrumbs.map((breadcrumb, index) => (
                        <li key={index} className="flex items-center">
                          {index > 0 && (
                            <svg
                              className="w-4 h-4 text-secondary-400 mx-2"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {breadcrumb.href ? (
                            <a
                              href={breadcrumb.href}
                              className="text-sm font-medium text-secondary-500 hover:text-secondary-700"
                            >
                              {breadcrumb.label}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-secondary-500">
                              {breadcrumb.label}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}
                
                {title && (
                  <h1 className="text-2xl font-bold text-secondary-900">
                    {title}
                  </h1>
                )}
                
                {subtitle && (
                  <p className="mt-1 text-sm text-secondary-600">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {actions && (
                <div className="flex items-center space-x-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

export interface CorporateGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CorporateGrid({
  children,
  cols = 3,
  gap = 'md',
  className,
}: CorporateGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4',
    6: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6',
  };

  const gaps = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div
      className={cn(
        'grid',
        gridCols[cols],
        gaps[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

export interface CorporateSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function CorporateSection({
  children,
  title,
  subtitle,
  actions,
  className,
}: CorporateSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-secondary-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-secondary-600 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
