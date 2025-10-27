'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';

export default function ERPHRPage() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('all');

  const employees = [
    {
      id: 'EMP001',
      name: 'Ahmet Yılmaz',
      position: 'Depo Müdürü',
      department: 'WMS',
      email: 'ahmet.yilmaz@ayazlogistics.com',
      phone: '+90 532 123 4567',
      location: 'İstanbul Depo',
      hireDate: '2022-03-15',
      salary: 15000,
      status: 'active',
      performance: 92,
      attendance: 98,
      skills: ['Liderlik', 'Depo Yönetimi', 'SAP'],
      avatar: 'AY'
    },
    {
      id: 'EMP002',
      name: 'Mehmet Kaya',
      position: 'Sürücü',
      department: 'TMS',
      email: 'mehmet.kaya@ayazlogistics.com',
      phone: '+90 533 234 5678',
      location: 'Ankara Terminal',
      hireDate: '2021-08-20',
      salary: 12000,
      status: 'active',
      performance: 88,
      attendance: 95,
      skills: ['Sürücülük', 'Güvenlik', 'Müşteri Hizmetleri'],
      avatar: 'MK'
    },
    {
      id: 'EMP003',
      name: 'Fatma Demir',
      position: 'Muhasebe Uzmanı',
      department: 'ERP',
      email: 'fatma.demir@ayazlogistics.com',
      phone: '+90 534 345 6789',
      location: 'İzmir Ofis',
      hireDate: '2023-01-10',
      salary: 13500,
      status: 'active',
      performance: 95,
      attendance: 100,
      skills: ['Muhasebe', 'Excel', 'Mali Raporlama'],
      avatar: 'FD'
    },
    {
      id: 'EMP004',
      name: 'Ali Özkan',
      position: 'IT Uzmanı',
      department: 'IT',
      email: 'ali.ozkan@ayazlogistics.com',
      phone: '+90 535 456 7890',
      location: 'İstanbul Ofis',
      hireDate: '2022-11-05',
      salary: 18000,
      status: 'on-leave',
      performance: 90,
      attendance: 85,
      skills: ['Yazılım Geliştirme', 'Veritabanı', 'Sistem Yönetimi'],
      avatar: 'AO'
    }
  ];

  const departments = [
    { name: 'Tümü', value: 'all', count: 45 },
    { name: 'WMS', value: 'WMS', count: 15 },
    { name: 'TMS', value: 'TMS', count: 12 },
    { name: 'ERP', value: 'ERP', count: 8 },
    { name: 'IT', value: 'IT', count: 6 },
    { name: 'CRM', value: 'CRM', count: 4 }
  ];

  const hrMetrics = [
    {
      metric: 'Toplam Çalışan',
      value: '45',
      change: '+3',
      trend: 'up',
      icon: Users
    },
    {
      metric: 'Aktif Çalışan',
      value: '42',
      change: '+2',
      trend: 'up',
      icon: CheckCircle
    },
    {
      metric: 'Ortalama Performans',
      value: '91%',
      change: '+5%',
      trend: 'up',
      icon: TrendingUp
    },
    {
      metric: 'Devam Oranı',
      value: '96%',
      change: '+2%',
      trend: 'up',
      icon: Clock
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'hire',
      employee: 'Zeynep Yıldız',
      position: 'Müşteri Temsilcisi',
      date: '2024-01-25',
      status: 'completed'
    },
    {
      id: 2,
      type: 'promotion',
      employee: 'Ahmet Yılmaz',
      position: 'Depo Müdürü',
      date: '2024-01-20',
      status: 'completed'
    },
    {
      id: 3,
      type: 'leave',
      employee: 'Ali Özkan',
      position: 'İzin',
      date: '2024-01-22',
      status: 'active'
    },
    {
      id: 4,
      type: 'training',
      employee: 'Mehmet Kaya',
      position: 'Güvenlik Eğitimi',
      date: '2024-01-18',
      status: 'completed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'on-leave':
        return 'İzinde';
      case 'inactive':
        return 'Pasif';
      default:
        return 'Bilinmiyor';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hire':
        return UserPlus;
      case 'promotion':
        return Award;
      case 'leave':
        return Calendar;
      case 'training':
        return GraduationCap;
      default:
        return Users;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'hire':
        return 'bg-green-100 text-green-600';
      case 'promotion':
        return 'bg-blue-100 text-blue-600';
      case 'leave':
        return 'bg-yellow-100 text-yellow-600';
      case 'training':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredEmployees = employees.filter(employee => 
    filterDepartment === 'all' || employee.department === filterDepartment
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">İnsan Kaynakları</h1>
          <p className="text-gray-600">Çalışanları yönetin ve takip edin</p>
        </div>

        {/* HR Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {hrMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <metric.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${metric.trend === 'down' ? 'rotate-180' : ''}`} />
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.metric}</div>
            </div>
          ))}
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-48">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {departments.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.name} ({dept.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Çalışan
              </button>
              <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                İzin Yönetimi
              </button>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Çalışan Listesi</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çalışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pozisyon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEmployee(employee)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {employee.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">#{employee.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.position}</div>
                      <div className="text-sm text-gray-500">{employee.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      <div className="text-sm text-gray-500">{employee.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${employee.performance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{employee.performance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                        {getStatusText(employee.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Son Aktiviteler</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    {React.createElement(getActivityIcon(activity.type), { className: "w-5 h-5" })}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{activity.employee}</div>
                    <div className="text-sm text-gray-600">{activity.position}</div>
                    <div className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString('tr-TR')}</div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.status === 'completed' ? 'Tamamlandı' : 'Aktif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Details */}
        {selectedEmployee && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Çalışan Detayları: {selectedEmployee.name}</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Kişisel Bilgiler</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pozisyon:</span>
                      <span className="font-medium">{selectedEmployee.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departman:</span>
                      <span className="font-medium">{selectedEmployee.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">İşe Giriş:</span>
                      <span className="font-medium">{new Date(selectedEmployee.hireDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maaş:</span>
                      <span className="font-medium">₺{selectedEmployee.salary.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Performance & Skills */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Performans & Yetenekler</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Performans</span>
                        <span className="text-sm font-medium">{selectedEmployee.performance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${selectedEmployee.performance}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Devam</span>
                        <span className="text-sm font-medium">{selectedEmployee.attendance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${selectedEmployee.attendance}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-2">Yetenekler:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
