"use client";

import React from 'react';
import { canPerformCRUD, canManageUsers, UserRole } from '@/utils/rbac';

interface CRUDButtonProps {
  userRole: string;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  addLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  viewLabel?: string;
  className?: string;
}

export default function CRUDButtons({ 
  userRole, 
  onAdd, 
  onEdit, 
  onDelete, 
  onView,
  addLabel = "Add New",
  editLabel = "Edit",
  deleteLabel = "Delete",
  viewLabel = "View",
  className = ""
}: CRUDButtonProps) {
  const canCRUD = canPerformCRUD(userRole);
  const canManage = canManageUsers(userRole);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* View Button - Always visible for all roles */}
      {onView && (
        <button
          onClick={onView}
          className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          title={viewLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="ml-1 hidden sm:inline">{viewLabel}</span>
        </button>
      )}

      {/* Add Button - Only for Contributor and Admin */}
      {canCRUD && onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          title={addLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="ml-1 hidden sm:inline">{addLabel}</span>
        </button>
      )}

      {/* Edit Button - Only for Contributor and Admin */}
      {canCRUD && onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          title={editLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="ml-1 hidden sm:inline">{editLabel}</span>
        </button>
      )}

      {/* Delete Button - Only for Contributor and Admin */}
      {canCRUD && onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          title={deleteLabel}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="ml-1 hidden sm:inline">{deleteLabel}</span>
        </button>
      )}
    </div>
  );
}

interface RoleBadgeProps {
  userRole: string;
  className?: string;
}

export function RoleBadge({ userRole, className = "" }: RoleBadgeProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800 border-red-200';
      case UserRole.CONTRIBUTOR:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.USER:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return '🔴';
      case UserRole.CONTRIBUTOR:
        return '🔵';
      case UserRole.USER:
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(userRole)} ${className}`}>
      <span className="mr-1">{getRoleIcon(userRole)}</span>
      {userRole}
    </span>
  );
}

interface PermissionGateProps {
  userRole: string;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ userRole, permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = require('@/utils/rbac');
  
  if (hasPermission(userRole, permission)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
