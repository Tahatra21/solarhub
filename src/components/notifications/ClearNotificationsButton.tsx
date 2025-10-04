'use client';

import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface ClearNotificationsButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export default function ClearNotificationsButton({
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  showText = true,
  className = ''
}: ClearNotificationsButtonProps) {
  const { clearAll, unreadCount } = useNotifications();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    if (unreadCount === 0) {
      return; // No notifications to clear
    }

    setIsClearing(true);
    try {
      await clearAll();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-3 text-base';
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'outline':
        return 'border border-red-300 text-red-600 hover:bg-red-50';
      case 'ghost':
        return 'text-red-600 hover:bg-red-50';
      default:
        return 'border border-red-300 text-red-600 hover:bg-red-50';
    }
  };

  return (
    <button
      onClick={handleClearAll}
      disabled={isClearing || unreadCount === 0}
      className={`
        inline-flex items-center gap-1 rounded-md transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
      title={unreadCount === 0 ? 'No notifications to clear' : 'Clear all notifications'}
    >
      {isClearing ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : showIcon ? (
        <Trash2 className="w-3 h-3" />
      ) : null}
      
      {showText && (
        <span>
          {isClearing ? 'Clearing...' : 'Clear All'}
          {unreadCount > 0 && ` (${unreadCount})`}
        </span>
      )}
    </button>
  );
}
