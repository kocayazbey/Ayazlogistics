import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title = 'Admin Panel',
  breadcrumbs = []
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <main className="min-h-screen">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            {breadcrumbs.length > 0 && (
              <Breadcrumb items={breadcrumbs} />
            )}
            
            {/* Page Title */}
            {title && (
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              </div>
            )}
            
            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
