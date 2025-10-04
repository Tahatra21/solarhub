/**
 * Utility functions for handling notifications
 */

/**
 * Clear all notifications
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export async function clearAllNotifications(): Promise<boolean> {
  try {
    const response = await fetch('/api/license-notifications?clear_all=true', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ All notifications cleared successfully');
      return true;
    } else {
      console.error('❌ Failed to clear notifications:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    return false;
  }
}

/**
 * Mark a specific notification as read
 * @param notificationId - The ID of the notification to mark as read
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/license-notifications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification_id: notificationId
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Notification ${notificationId} marked as read`);
      return true;
    } else {
      console.error('❌ Failed to mark notification as read:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return false;
  }
}

/**
 * Get all notifications
 * @returns Promise<any[]> - Returns array of notifications or empty array if error
 */
export async function getAllNotifications(): Promise<any[]> {
  try {
    const response = await fetch('/api/license-notifications');
    const result = await response.json();
    
    if (result.success) {
      const notifications = result.data || [];
      
      // Additional client-side filtering for 30-day expiry (only future dates)
      const filteredNotifications = notifications.filter((notification: any) => {
        const expiryDate = new Date(notification.akhir_layanan);
        const now = new Date();
        const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Only return notifications that expire within 30 days AND are not expired yet
        return daysDiff >= 0 && daysDiff <= 30;
      });
      
      return filteredNotifications;
    } else {
      console.error('❌ Failed to fetch notifications:', result.message);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notifications count
 * @returns Promise<number> - Returns count of unread notifications
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const notifications = await getAllNotifications();
    // Since notifications are real-time, we can count all as unread
    // or implement a more sophisticated read/unread tracking
    return notifications.length;
  } catch (error) {
    console.error('❌ Error getting unread notifications count:', error);
    return 0;
  }
}
