import { useState, useEffect, useCallback } from 'react';
import { clearAllNotifications, markNotificationAsRead, getAllNotifications } from '@/utils/notificationUtils';

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

interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  clearAll: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if notifications were recently cleared (within same day)
      const clearedAt = localStorage.getItem('notifications_cleared_at');
      if (clearedAt) {
        const clearedTime = new Date(clearedAt);
        const now = new Date();
        
        // Check if cleared on the same day (not 24 hours, but same calendar day)
        const clearedDate = clearedTime.toDateString();
        const currentDate = now.toDateString();
        
        // If cleared on the same day, don't fetch notifications
        if (clearedDate === currentDate) {
          setNotifications([]);
          setLoading(false);
          return;
        }
      }
      
      const data = await getAllNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      setError(null);
      const success = await clearAllNotifications();
      if (success) {
        // Store cleared timestamp in localStorage (current date)
        const clearedTimestamp = new Date().toISOString();
        localStorage.setItem('notifications_cleared_at', clearedTimestamp);
        setNotifications([]);
        console.log('✅ All notifications cleared');
      } else {
        setError('Failed to clear notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear notifications');
      console.error('Error clearing notifications:', err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      setError(null);
      const success = await markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.notification_id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
        console.log(`✅ Notification ${notificationId} marked as read`);
      } else {
        setError('Failed to mark notification as read');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    clearAll,
    markAsRead,
    refresh
  };
}
