'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Package, 
  Route, 
  Users, 
  Shield, 
  BarChart3, 
  Settings,
  Brain,
  Zap,
  Target,
  Activity,
  TrendingUp,
  FileText,
  Database,
  Globe,
  Lock,
  Bell,
  HelpCircle,
  Megaphone,
  Edit
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard'
    },
    {
      name: 'WMS - Depo Yönetimi',
      href: '/wms',
      icon: Package,
      current: pathname.startsWith('/wms'),
      children: [
        { name: 'Depo Operasyonları', href: '/wms/operations' },
        { name: 'Stok Yönetimi', href: '/wms/inventory' },
        { name: 'Sevkiyat', href: '/wms/shipping' },
        { name: 'Alım', href: '/wms/receiving' },
        { name: 'Toplama', href: '/wms/picking' }
      ]
    },
    {
      name: 'TMS - Taşıma Yönetimi',
      href: '/tms',
      icon: Route,
      current: pathname.startsWith('/tms'),
      children: [
        { name: 'Rota Optimizasyonu', href: '/tms/routes' },
        { name: 'Araç Yönetimi', href: '/tms/vehicles' },
        { name: 'Sürücü Yönetimi', href: '/tms/drivers' },
        { name: 'Takip', href: '/tms/tracking' }
      ]
    },
    {
      name: 'CRM - Müşteri Yönetimi',
      href: '/crm',
      icon: Users,
      current: pathname.startsWith('/crm'),
      children: [
        { name: 'Müşteriler', href: '/customers' },
        { name: 'Potansiyel Müşteriler', href: '/leads' },
        { name: 'İletişim', href: '/contacts' },
        { name: 'Kampanyalar', href: '/campaigns' }
      ]
    },
    {
      name: 'ERP - Kurumsal Kaynak',
      href: '/erp',
      icon: Database,
      current: pathname.startsWith('/erp'),
      children: [
        { name: 'Muhasebe', href: '/erp/accounting' },
        { name: 'İnsan Kaynakları', href: '/erp/hr' },
        { name: 'Satın Alma', href: '/erp/procurement' },
        { name: 'Proje Yönetimi', href: '/erp/projects' }
      ]
    },
    {
      name: 'Marketing',
      href: '/marketing',
      icon: Megaphone,
      current: pathname.startsWith('/marketing'),
      children: [
        { name: 'Kampanyalar', href: '/marketing/campaigns' },
        { name: 'İndirimler', href: '/marketing/discounts' },
        { name: 'Newsletter', href: '/marketing/newsletter' },
        { name: 'SEO', href: '/marketing/seo' },
        { name: 'Reklam Yönetimi', href: '/marketing/ads' }
      ]
    },
    {
      name: 'İçerik Yönetimi',
      href: '/content',
      icon: Edit,
      current: pathname.startsWith('/content'),
      children: [
        { name: 'Sayfalar', href: '/content/pages' },
        { name: 'Bloglar', href: '/content/blogs' },
        { name: 'Bannerlar', href: '/content/banners' },
        { name: 'SSS / FAQ', href: '/content/faq' }
      ]
    },
    {
      name: 'Faturalama',
      href: '/billing',
      icon: FileText,
      current: pathname.startsWith('/billing'),
      children: [
        { name: 'Faturalar', href: '/billing/invoices' },
        { name: 'Sözleşmeler', href: '/billing/contracts' },
        { name: 'Ödemeler', href: '/payments' }
      ]
    },
    {
      name: 'Sipariş Yönetimi',
      href: '/orders',
      icon: Target,
      current: pathname.startsWith('/orders')
    },
    {
      name: 'Araçlar',
      href: '/vehicles',
      icon: Route,
      current: pathname.startsWith('/vehicles')
    },
    {
      name: 'Depolar',
      href: '/warehouses',
      icon: Package,
      current: pathname.startsWith('/warehouses')
    },
    {
      name: 'Kullanıcılar',
      href: '/users',
      icon: Users,
      current: pathname.startsWith('/users')
    },
    {
      name: 'Raporlar',
      href: '/reports',
      icon: BarChart3,
      current: pathname.startsWith('/reports')
    },
    {
      name: 'Analitik',
      href: '/analytics',
      icon: TrendingUp,
      current: pathname.startsWith('/analytics')
    },
    {
      name: 'Entegrasyonlar',
      href: '/integrations',
      icon: Globe,
      current: pathname.startsWith('/integrations')
    },
    {
      name: 'Güvenlik',
      href: '/security',
      icon: Shield,
      current: pathname.startsWith('/security')
    },
    {
      name: 'İzleme',
      href: '/monitoring',
      icon: Activity,
      current: pathname.startsWith('/monitoring')
    },
    {
      name: 'Bildirimler',
      href: '/notifications',
      icon: Bell,
      current: pathname.startsWith('/notifications')
    },
    {
      name: 'Webhooks',
      href: '/webhooks',
      icon: Globe,
      current: pathname.startsWith('/webhooks')
    },
    {
      name: 'Dokümanlar',
      href: '/documents',
      icon: FileText,
      current: pathname.startsWith('/documents')
    },
    {
      name: 'Yasal',
      href: '/legal',
      icon: Lock,
      current: pathname.startsWith('/legal')
    },
    {
      name: 'Parametreler',
      href: '/parameters',
      icon: Settings,
      current: pathname.startsWith('/parameters')
    },
    {
      name: 'Ayarlar',
      href: '/settings',
      icon: Settings,
      current: pathname.startsWith('/settings')
    }
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AyazLogistics</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            <Link
              href={item.href}
              onClick={() => item.children && toggleExpanded(item.name)}
              className={`
                group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                ${item.current 
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              {item.children && (
                <svg 
                  className={`h-4 w-4 transition-transform ${expandedItems.includes(item.name) ? 'rotate-90' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
            
            {/* Sub-navigation */}
            {item.children && expandedItems.includes(item.name) && (
              <div className="ml-8 mt-2 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.name}
                    href={child.href}
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@ayazlogistics.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;