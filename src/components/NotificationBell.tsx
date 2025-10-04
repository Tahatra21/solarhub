"use client";

import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, CloseIcon } from '@/icons';

interface Notification {
  notification_id: number;
  license_id: number;
  notification_date: string;
  is_read: boolean;
  created_at: string;
  nama_aplikasi: string;
  bpo: string;
  akhir_layanan: string;
  jenis_lisensi: string;
  days_until_expiry: number;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Check if notifications were recently cleared (within same day)
      const clearedAt = localStorage.getItem('notifications_cleared_at');
      console.log('🔍 Checking localStorage cleared_at:', clearedAt);
      
      if (clearedAt) {
        const clearedTime = new Date(clearedAt);
        const now = new Date();
        
        // Check if cleared on the same day (not 24 hours, but same calendar day)
        const clearedDate = clearedTime.toDateString();
        const currentDate = now.toDateString();
        
        console.log('🔍 Cleared date:', clearedDate);
        console.log('🔍 Current date:', currentDate);
        console.log('🔍 Same day?', clearedDate === currentDate);
        
        // If cleared on the same day, don't fetch notifications
        if (clearedDate === currentDate) {
          console.log('✅ Notifications cleared today, showing empty list');
          setNotifications([]);
          setLoading(false);
          return;
        } else {
          console.log('🔄 Different day, clearing localStorage and fetching notifications');
          localStorage.removeItem('notifications_cleared_at');
        }
      }
      
      console.log('📡 Fetching notifications from API...');
      const response = await fetch('/api/license-notifications');
      if (response.ok) {
        const data = await response.json();
        console.log('📡 API response:', data);
        
        // Filter notifications based on 30-day expiry rule (only future dates)
        const filteredNotifications = (data.data || []).filter((notification: Notification) => {
          const expiryDate = new Date(notification.akhir_layanan);
          const now = new Date();
          const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Only show notifications that expire within 30 days AND are not expired yet
          return daysDiff >= 0 && daysDiff <= 30;
        });
        
        console.log('📡 Filtered notifications:', filteredNotifications.length);
        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/license-notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.notification_id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      console.log('🗑️ Starting to clear notifications...');
      
      const response = await fetch('/api/license-notifications?clear_all=true', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🗑️ API response status:', response.status);
      console.log('🗑️ API response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('🗑️ API response data:', result);
        
        // Store cleared timestamp in localStorage (current date)
        const clearedTimestamp = new Date().toISOString();
        localStorage.setItem('notifications_cleared_at', clearedTimestamp);
        console.log('🗑️ Stored clear timestamp:', clearedTimestamp);
        
        // Clear notifications from state immediately
        setNotifications([]);
        console.log('✅ All notifications cleared from UI');
        
        // Close dropdown after clearing
        setIsOpen(false);
        
        // Show success message
        alert('✅ Semua notifikasi berhasil dihapus! Notifikasi akan muncul kembali besok.');
      } else {
        const errorText = await response.text();
        console.error('❌ API returned error:', response.status, errorText);
        alert('❌ Gagal menghapus notifikasi. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      alert('❌ Error menghapus notifikasi: ' + (error as Error).message);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications on component mount and set up polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysText = (days: number) => {
    if (days <= 0) return 'Sudah expired';
    if (days === 1) return '1 hari lagi';
    return `${days} hari lagi`;
  };

  const getPriorityColor = (days: number) => {
    if (days <= 0) return 'text-white bg-red-600 border-red-700';
    if (days <= 7) return 'text-white bg-orange-500 border-orange-600';
    if (days <= 14) return 'text-white bg-yellow-500 border-yellow-600';
    return 'text-white bg-blue-500 border-blue-600';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-700 hover:text-blue-600 hover:bg-gray-50"
        title="Notification"
      >
        <span className="mr-1.5"><BellIcon className="w-4 h-4" /></span>
        <span className="hidden lg:block">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-coral-medium text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[1004] max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notification
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Tidak ada notifikasi
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {notification.nama_aplikasi}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0 shadow-sm"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 font-medium">
                          {notification.bpo} • {notification.jenis_lisensi}
                        </p>
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 shadow-sm ${
                          getPriorityColor(notification.days_until_expiry)
                        }`}>
                          {getDaysText(notification.days_until_expiry)}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                          Expired: {formatDate(notification.akhir_layanan)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.notification_id)}
                          className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md font-medium transition-colors duration-200 flex-shrink-0 shadow-sm"
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Always show buttons for debugging */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              {/* Debug info */}
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center font-medium">
                Notifikasi: {notifications.length} | 
                Status: {localStorage.getItem('notifications_cleared_at') ? 
                  (() => {
                    const clearedAt = localStorage.getItem('notifications_cleared_at');
                    if (clearedAt) {
                      const clearedTime = new Date(clearedAt);
                      const now = new Date();
                      const clearedDate = clearedTime.toDateString();
                      const currentDate = now.toDateString();
                      return clearedDate === currentDate ? 'Dihapus hari ini' : 'Akan reset besok';
                    }
                    return 'Belum dihapus';
                  })() : 'Belum dihapus'
                }
              </div>
              
              {/* Buttons */}
              <div className="flex flex-col gap-2">
                {/* Clear All Button - More prominent */}
                <button
                  onClick={clearAllNotifications}
                  className="w-full text-center text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-2 border-2 border-red-500"
                  style={{ 
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}
                  title="Hapus semua notifikasi hari ini. Notifikasi akan muncul kembali besok."
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  🗑️ HAPUS SEMUA NOTIFIKASI
                </button>
                
                {/* Other buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Navigate to monitoring license page
                      window.location.href = '/admin/cusol-hub/monitoring-license';
                      setIsOpen(false);
                    }}
                    className="flex-1 text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-blue-200"
                  >
                    📋 Lihat Semua
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 Resetting notifications...');
                      localStorage.removeItem('notifications_cleared_at');
                      console.log('🔄 Cleared localStorage');
                      fetchNotifications();
                      console.log('🔄 Refreshed notifications');
                    }}
                    className="flex-1 text-center text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium px-3 py-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border border-green-200"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;