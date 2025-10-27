'use client';

import React, { useState, useEffect } from 'react';
import { BellIcon, EnvelopeIcon, ChatBubbleLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'system' | 'order' | 'alert' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function Notifications() {
  const [filter, setFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/notifications?filter=${filter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/mark-read/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'alert': return BellIcon;
      case 'order': return CheckCircleIcon;
      case 'message': return ChatBubbleLeftIcon;
      default: return EnvelopeIcon;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Hata</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchNotifications}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bildirimler</h1>
            <p className="text-gray-600">Son aktivitelerden haberdar olun</p>
          </div>
          <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl font-medium">
            Tümünü Okundu İşaretle
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Okunmamış</p>
            <p className="text-3xl font-bold text-gray-900">
              {notifications.filter(n => !n.read).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Toplam</p>
            <p className="text-3xl font-bold text-gray-900">
              {notifications.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Yüksek Öncelikli</p>
            <p className="text-3xl font-bold text-gray-900">
              {notifications.filter(n => n.priority === 'high').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <div className="flex gap-3">
            {['all', 'unread', 'alerts', 'orders'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
                  !notif.read ? 'border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${getPriorityColor(notif.priority)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-bold ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-sm text-gray-500">{notif.timestamp}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{notif.message}</p>
                    <div className="flex gap-2 mt-3">
                      {!notif.read && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          className="text-blue-600 text-sm font-medium hover:underline"
                        >
                          Okundu İşaretle
                        </button>
                      )}
                      <button 
                        onClick={() => deleteNotification(notif.id)}
                        className="text-red-600 text-sm font-medium hover:underline"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

