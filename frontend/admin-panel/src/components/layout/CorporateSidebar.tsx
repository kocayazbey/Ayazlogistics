import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SidebarItem[];
}

interface CorporateSidebarProps {
  onClose?: () => void;
}

const navigation: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
      </svg>
    ),
  },
  {
    name: 'Warehouse Management',
    href: '/wms',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      { name: 'Inventory', href: '/wms/inventory', icon: ({ className }) => <div className={className} /> },
      { name: 'Receiving', href: '/wms/receiving', icon: ({ className }) => <div className={className} /> },
      { name: 'Picking', href: '/wms/picking', icon: ({ className }) => <div className={className} /> },
      { name: 'Shipping', href: '/wms/shipping', icon: ({ className }) => <div className={className} /> },
    ],
  },
  {
    name: 'Transportation',
    href: '/tms',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    children: [
      { name: 'Routes', href: '/tms/routes', icon: ({ className }) => <div className={className} /> },
      { name: 'Vehicles', href: '/tms/vehicles', icon: ({ className }) => <div className={className} /> },
      { name: 'Drivers', href: '/tms/drivers', icon: ({ className }) => <div className={className} /> },
      { name: 'Tracking', href: '/tms/tracking', icon: ({ className }) => <div className={className} /> },
    ],
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    children: [
      { name: 'Invoices', href: '/billing/invoices', icon: ({ className }) => <div className={className} /> },
      { name: 'Contracts', href: '/billing/contracts', icon: ({ className }) => <div className={className} /> },
      { name: 'Payments', href: '/billing/payments', icon: ({ className }) => <div className={className} /> },
    ],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function CorporateSidebar({ onClose }: CorporateSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AL</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-secondary-900">AyazLogistics</h1>
            <p className="text-xs text-secondary-500">Management System</p>
          </div>
        </div>
        
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => (
          <SidebarItem key={item.name} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-secondary-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-secondary-200 rounded-full flex items-center justify-center">
              <span className="text-secondary-600 font-medium text-sm">JD</span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary-900 truncate">John Doe</p>
            <p className="text-xs text-secondary-500 truncate">Administrator</p>
          </div>
          <button className="ml-2 p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  item: SidebarItem;
  pathname: string;
}

function SidebarItem({ item, pathname }: SidebarItemProps) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <Link
        href={item.href}
        className={cn(
          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
          isActive
            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
        )}
      >
        <item.icon
          className={cn(
            'mr-3 flex-shrink-0 w-5 h-5',
            isActive ? 'text-primary-600' : 'text-secondary-400 group-hover:text-secondary-600'
          )}
        />
        {item.name}
        {hasChildren && (
          <svg
            className="ml-auto w-4 h-4 text-secondary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Link>
      
      {hasChildren && isActive && (
        <div className="ml-6 mt-2 space-y-1">
          {item.children?.map((child) => (
            <Link
              key={child.name}
              href={child.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                pathname === child.href
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
              )}
            >
              <child.icon className="mr-3 flex-shrink-0 w-4 h-4 text-secondary-400 group-hover:text-secondary-600" />
              {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
