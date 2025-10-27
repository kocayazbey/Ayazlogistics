'use client';

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CogIcon,
  ChartBarIcon,
  TruckIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BellIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  MapIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  submenus?: MenuItem[];
  permissions?: string[];
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: HomeIcon,
    route: '/dashboard',
    permissions: ['view_dashboard']
  },
  {
    id: 'products',
    title: 'Products',
    icon: CubeIcon,
    route: '/products',
    permissions: ['manage_products'],
    submenus: [
      { id: 'all-products', title: 'All Products', icon: CubeIcon, route: '/products', permissions: ['view_products'] },
      { id: 'add-product', title: 'Add Product', icon: CubeIcon, route: '/products/add', permissions: ['create_products'] },
      { id: 'categories', title: 'Categories', icon: CubeIcon, route: '/products/categories', permissions: ['manage_categories'] }
    ]
  },
  {
    id: 'warehouse',
    title: 'Warehouse',
    icon: BuildingStorefrontIcon,
    route: '/warehouse',
    permissions: ['manage_warehouse'],
    submenus: [
      { id: 'stocks', title: 'Stocks', icon: CubeIcon, route: '/warehouse/stocks', permissions: ['manage_stocks'] },
      { id: 'lots', title: 'Lots & Batches', icon: ClipboardDocumentListIcon, route: '/warehouse/lots', permissions: ['manage_lots'] },
      { id: 'shelves', title: 'Shelves', icon: BuildingStorefrontIcon, route: '/warehouse/shelves', permissions: ['manage_warehouse'] },
      { id: 'terminals', title: 'Handheld Devices', icon: WrenchScrewdriverIcon, route: '/warehouse/terminals', permissions: ['manage_warehouse'] }
    ]
  },
  {
    id: 'logistics',
    title: 'Logistics',
    icon: TruckIcon,
    route: '/logistics',
    permissions: ['manage_logistics'],
    submenus: [
      { id: 'vehicles', title: 'Vehicles', icon: TruckIcon, route: '/logistics/vehicles', permissions: ['manage_vehicles'] },
      { id: 'routes', title: 'Routes', icon: MapIcon, route: '/logistics/routes', permissions: ['manage_routes'] },
      { id: 'tracking', title: 'Tracking', icon: ClockIcon, route: '/logistics/tracking', permissions: ['tracking'] }
    ]
  },
  {
    id: 'orders',
    title: 'Orders',
    icon: ShoppingCartIcon,
    route: '/orders',
    permissions: ['manage_orders']
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    icon: ShoppingCartIcon,
    route: '/suppliers',
    permissions: ['manage_suppliers'],
    submenus: [
      { id: 'orders', title: 'Orders', icon: ShoppingCartIcon, route: '/suppliers/orders', permissions: ['manage_orders'] },
      { id: 'sync', title: 'Stock Sync', icon: WrenchScrewdriverIcon, route: '/suppliers/sync', permissions: ['sync_stock'] }
    ]
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: CurrencyDollarIcon,
    route: '/finance',
    permissions: ['manage_finance'],
    submenus: [
      { id: 'invoices', title: 'Invoices', icon: DocumentTextIcon, route: '/finance/invoices', permissions: ['manage_invoices'] },
      { id: 'accounts', title: 'Accounts', icon: CurrencyDollarIcon, route: '/finance/accounts', permissions: ['accounts'] },
      { id: 'reports', title: 'Reports', icon: ChartPieIcon, route: '/finance/reports', permissions: ['reports'] }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: CogIcon,
    route: '/settings',
    permissions: ['manage_settings'],
    submenus: [
      { id: 'roles', title: 'Role Management', icon: ShieldCheckIcon, route: '/settings/roles', permissions: ['roles'] },
      { id: 'users', title: 'User Management', icon: UserGroupIcon, route: '/settings/users', permissions: ['users'] },
      { id: 'integrations', title: 'Integrations', icon: WrenchScrewdriverIcon, route: '/settings/integrations', permissions: ['integrations'] }
    ]
  }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, hasRole, logout, user } = useAuth();

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const isActive = (route: string) => {
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  const isMenuExpanded = (menuId: string) => {
    return expandedMenus.has(menuId);
  };

  const canAccessMenuItem = (item: MenuItem): boolean => {
    // Super admin her şeye erişebilir
    if (hasRole('super_admin')) return true;
    
    // Check permissions
    if (item.permissions && item.permissions.length > 0) {
      return item.permissions.some(permission => hasPermission(permission));
    }
    
    // Check roles
    if (item.roles && item.roles.length > 0) {
      return item.roles.some(role => hasRole(role));
    }
    
    // If no permissions or roles specified, allow access
    return true;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    // Check if user can access this menu item
    if (!canAccessMenuItem(item)) {
      return null;
    }

    const hasSubmenus = item.submenus && item.submenus.length > 0;
    const isExpanded = isMenuExpanded(item.id);
    const isItemActive = isActive(item.route);

    return (
      <div key={item.id}>
        <div
          className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors touch-manipulation ${
            level > 0 ? 'ml-4' : ''
          } ${
            isItemActive
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
          }`}
          onClick={() => {
            if (hasSubmenus) {
              toggleMenu(item.id);
            }
          }}
        >
          <Link
            to={item.route}
            className="flex items-center flex-1"
            onClick={(e) => {
              if (hasSubmenus) {
                e.preventDefault();
                toggleMenu(item.id);
              } else if (onClose) {
                onClose();
              }
            }}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span className="text-sm font-medium">{item.title}</span>
          </Link>
          {hasSubmenus && (
            <svg
              className={`w-4 h-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
        {hasSubmenus && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.submenus!.map((submenu) => renderMenuItem(submenu, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto lg:shadow-none
      `}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AL</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Ayaz Logistics</h1>
            <p className="text-xs text-gray-500">3PL Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || 'AU'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.role || 'Super Admin'}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
            if (onClose) onClose();
          }}
          className="w-full flex items-center justify-center px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
    </>
  );
}

export default Sidebar;