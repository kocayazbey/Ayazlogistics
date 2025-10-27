'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usersApi } from '../../lib/api/users.api';
import { productsApi } from '../../lib/api/products.api';
import { ordersApi } from '../../lib/api/orders.api';
import { warehouseApi } from '../../lib/api/warehouse.api';
import { vehiclesApi } from '../../lib/api/vehicles.api';

export default function TestPage() {
  const { user, isAuthenticated, hasPermission, hasRole } = useAuth();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Authentication
      results.auth = {
        isAuthenticated,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        } : null
      };

      // Test 2: Permission checks
      results.permissions = {
        canManageUsers: hasPermission('users'),
        canManageRoles: hasPermission('roles'),
        canManageWarehouse: hasPermission('manage_warehouse'),
        canManageVehicles: hasPermission('manage_vehicles'),
        canViewReports: hasPermission('reports'),
        hasAllPermissions: hasPermission('all')
      };

      // Test 3: Role checks
      results.roles = {
        isSuperAdmin: hasRole('super_admin'),
        isWarehouseManager: hasRole('warehouse_manager'),
        isLogisticsManager: hasRole('logistics_manager'),
        isFinance: hasRole('finance'),
        isSupplierRelation: hasRole('supplier_relation'),
        isItAdmin: hasRole('it_admin')
      };

      // Test 4: API calls
      try {
        const usersResponse = await usersApi.getAll({ page: 1, limit: 5 });
        results.apiUsers = {
          success: true,
          data: usersResponse.data,
          count: usersResponse.data?.users?.length || 0
        };
      } catch (error) {
        results.apiUsers = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      try {
        const productsResponse = await productsApi.getAll({ page: 1, limit: 5 });
        results.apiProducts = {
          success: true,
          data: productsResponse.data,
          count: productsResponse.data?.products?.length || 0
        };
      } catch (error) {
        results.apiProducts = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      try {
        const ordersResponse = await ordersApi.getAll({ page: 1, limit: 5 });
        results.apiOrders = {
          success: true,
          data: ordersResponse.data,
          count: ordersResponse.data?.orders?.length || 0
        };
      } catch (error) {
        results.apiOrders = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      try {
        const warehousesResponse = await warehouseApi.getWarehouses({ page: 1, limit: 5 });
        results.apiWarehouses = {
          success: true,
          data: warehousesResponse.data,
          count: warehousesResponse.data?.warehouses?.length || 0
        };
      } catch (error) {
        results.apiWarehouses = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      try {
        const vehiclesResponse = await vehiclesApi.getVehicles({ page: 1, limit: 5 });
        results.apiVehicles = {
          success: true,
          data: vehiclesResponse.data,
          count: vehiclesResponse.data?.vehicles?.length || 0
        };
      } catch (error) {
        results.apiVehicles = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      setLoading(false);
      setTestResults(results);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      runTests();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Sayfası</h2>
          <p className="text-gray-600">Test sayfasına erişmek için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistem Test Sayfası</h1>
          <p className="text-gray-600">Admin panel sistem testleri ve API bağlantıları</p>
        </div>

        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Testler Çalışıyor...' : 'Testleri Yeniden Çalıştır'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authentication Test */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Kimlik Doğrulama</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Giriş Durumu:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  testResults.auth?.isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {testResults.auth?.isAuthenticated ? 'Giriş Yapılmış' : 'Giriş Yapılmamış'}
                </span>
              </div>
              {testResults.auth?.user && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kullanıcı ID:</span>
                    <span className="text-sm font-mono">{testResults.auth.user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">E-posta:</span>
                    <span className="text-sm">{testResults.auth.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rol:</span>
                    <span className="text-sm font-semibold">{testResults.auth.user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yetkiler:</span>
                    <span className="text-sm">{testResults.auth.user.permissions?.length || 0} adet</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Permissions Test */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Yetki Kontrolleri</h3>
            <div className="space-y-3">
              {testResults.permissions && Object.entries(testResults.permissions).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {value ? 'Var' : 'Yok'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Role Test */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rol Kontrolleri</h3>
            <div className="space-y-3">
              {testResults.roles && Object.entries(testResults.roles).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {value ? 'Evet' : 'Hayır'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* API Test */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">API Bağlantıları</h3>
            <div className="space-y-3">
              {testResults.apiUsers && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Kullanıcılar API:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    testResults.apiUsers.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.apiUsers.success ? `Başarılı (${testResults.apiUsers.count})` : 'Hata'}
                  </span>
                </div>
              )}
              {testResults.apiProducts && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürünler API:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    testResults.apiProducts.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.apiProducts.success ? `Başarılı (${testResults.apiProducts.count})` : 'Hata'}
                  </span>
                </div>
              )}
              {testResults.apiOrders && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Siparişler API:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    testResults.apiOrders.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.apiOrders.success ? `Başarılı (${testResults.apiOrders.count})` : 'Hata'}
                  </span>
                </div>
              )}
              {testResults.apiWarehouses && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Depolar API:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    testResults.apiWarehouses.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.apiWarehouses.success ? `Başarılı (${testResults.apiWarehouses.count})` : 'Hata'}
                  </span>
                </div>
              )}
              {testResults.apiVehicles && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Araçlar API:</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    testResults.apiVehicles.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults.apiVehicles.success ? `Başarılı (${testResults.apiVehicles.count})` : 'Hata'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {testResults.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-red-800 font-semibold mb-2">Hata:</h4>
            <p className="text-red-700">{testResults.error}</p>
          </div>
        )}

        {/* Raw Data Display */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ham Test Verileri</h3>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
