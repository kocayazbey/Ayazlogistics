'use client';

import React from 'react';
import Link from 'next/link';
import { Cog, ShieldCheck, Users, Wrench, Bell, Key, Database, Globe } from 'lucide-react';

export default function SettingsPage() {
  const stats = [
    { label: 'Active Users', value: '24', change: '+3' },
    { label: 'User Roles', value: '8', change: '+1' },
    { label: 'Integrations', value: '12', change: '+2' },
    { label: 'System Health', value: '98%', change: '+2%' },
  ];

  const quickActions = [
    { 
      title: 'Role Management', 
      description: 'Manage user roles and permissions',
      icon: ShieldCheck, 
      href: '/settings/roles', 
      color: 'from-blue-600 to-cyan-500' 
    },
    { 
      title: 'User Management', 
      description: 'Manage users and access control',
      icon: Users, 
      href: '/settings/users', 
      color: 'from-green-600 to-emerald-500' 
    },
    { 
      title: 'Integrations', 
      description: 'Configure external integrations',
      icon: Wrench, 
      href: '/settings/integrations', 
      color: 'from-purple-600 to-pink-500' 
    },
  ];

  const systemSettings = [
    { name: 'General Settings', description: 'Basic system configuration', icon: Cog, status: 'configured' },
    { name: 'Security Settings', description: 'Security and authentication', icon: Key, status: 'configured' },
    { name: 'Notification Settings', description: 'Email and alert preferences', icon: Bell, status: 'needs_attention' },
    { name: 'Database Settings', description: 'Database configuration', icon: Database, status: 'configured' },
    { name: 'Regional Settings', description: 'Language and timezone', icon: Globe, status: 'configured' },
  ];

  const recentActivities = [
    { action: 'User role updated', item: 'John Doe assigned Admin role', time: '5 minutes ago', type: 'role' },
    { action: 'Integration added', item: 'SAP ERP connected', time: '15 minutes ago', type: 'integration' },
    { action: 'User created', item: 'New user: Jane Smith', time: '1 hour ago', type: 'user' },
    { action: 'Settings updated', item: 'Security settings modified', time: '2 hours ago', type: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Manage system configuration and user access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-purple-500 to-pink-500',
            'from-orange-500 to-red-500'
          ];
          
          return (
            <div 
              key={stat.label} 
              className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white shadow-lg`}
            >
              <p className="text-sm opacity-90 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm opacity-90">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <action.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            {systemSettings.map((setting, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <setting.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{setting.name}</p>
                    <p className="text-xs text-gray-500">{setting.description}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    setting.status === 'configured' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {setting.status === 'configured' ? 'Configured' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.type === 'role' ? 'bg-blue-500' :
                    activity.type === 'integration' ? 'bg-purple-500' :
                    activity.type === 'user' ? 'bg-green-500' :
                    'bg-orange-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.item}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}