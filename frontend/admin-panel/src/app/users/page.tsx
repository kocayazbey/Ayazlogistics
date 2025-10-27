'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Shield, Settings, Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { usersApi, User, UserFilter } from '../../lib/api/users.api';
import { useAuth } from '../../contexts/AuthContext';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>({
    page: 1,
    limit: 20
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    lastLogin: '2 saat önce'
  });

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll(filter);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Fallback to mock data
      setUsers([
        {
          id: '1',
          email: 'admin@ayazlogistics.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'super_admin',
          permissions: ['all'],
          isActive: true,
          lastLogin: '2024-01-01T10:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          email: 'warehouse@ayazlogistics.com',
          firstName: 'Warehouse',
          lastName: 'Manager',
          role: 'warehouse_manager',
          permissions: ['manage_stocks', 'manage_lots', 'view_warehouse'],
          isActive: true,
          lastLogin: '2024-01-01T09:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await usersApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total: users.length,
        active: users.filter(u => u.isActive).length,
        admins: users.filter(u => u.role === 'super_admin').length,
        lastLogin: '2 saat önce'
      });
    }
  };

  const handleSearch = () => {
    setFilter(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }));
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    setFilter(prev => ({
      ...prev,
      role: role || undefined,
      page: 1
    }));
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setFilter(prev => ({
      ...prev,
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page: 1
    }));
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await usersApi.toggleStatus(userId);
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await usersApi.delete(userId);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'warehouse_manager': return 'bg-blue-100 text-blue-800';
      case 'logistics_manager': return 'bg-green-100 text-green-800';
      case 'finance': return 'bg-purple-100 text-purple-800';
      case 'supplier_relation': return 'bg-orange-100 text-orange-800';
      case 'it_admin': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const quickActions = [
    { title: 'Yeni Kullanıcı', icon: UserPlus, href: '/users/new', color: 'from-blue-600 to-cyan-500' },
    { title: 'Kullanıcı Listesi', icon: Users, href: '/users', color: 'from-green-600 to-emerald-500' },
    { title: 'Roller', icon: Shield, href: '/users/roles', color: 'from-purple-600 to-pink-500' },
    { title: 'Ayarlar', icon: Settings, href: '/users/settings', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600">Kullanıcılarınızı yönetin ve yetkilendirin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90 mb-2">Toplam Kullanıcı</p>
          <p className="text-3xl font-bold mb-1">{stats.total}</p>
          <p className="text-sm opacity-90">+8 bu ay</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90 mb-2">Aktif Kullanıcı</p>
          <p className="text-3xl font-bold mb-1">{stats.active}</p>
          <p className="text-sm opacity-90">+12 bu ay</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90 mb-2">Admin Kullanıcı</p>
          <p className="text-3xl font-bold mb-1">{stats.admins}</p>
          <p className="text-sm opacity-90">+2 bu ay</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm opacity-90 mb-2">Son Giriş</p>
          <p className="text-3xl font-bold mb-1">{stats.lastLogin}</p>
          <p className="text-sm opacity-90">Aktif</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">Hızlı erişim</p>
                </div>
                <action.icon className="h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => handleRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tüm Roller</option>
            <option value="super_admin">Super Admin</option>
            <option value="warehouse_manager">Warehouse Manager</option>
            <option value="logistics_manager">Logistics Manager</option>
            <option value="finance">Finance</option>
            <option value="supplier_relation">Supplier Relation</option>
            <option value="it_admin">IT Admin</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Filtrele
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Son Giriş
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Kullanıcılar yükleniyor...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-medium">
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.isActive)}`}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Hiç giriş yapmamış'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {hasPermission('users') && (
                          <>
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(user.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              {user.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}