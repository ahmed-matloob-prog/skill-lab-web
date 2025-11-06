/**
 * User Roles Constants
 * Define all user roles used in the application
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
} as const;

// Type for user roles to ensure type safety
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    canManageUsers: true,
    canManageGroups: true,
    canViewAllData: true,
    canExportData: true,
    canDeleteData: true,
    canAccessAdminPanel: true,
  },
  [USER_ROLES.TRAINER]: {
    canManageUsers: false,
    canManageGroups: false,
    canViewAllData: false,
    canExportData: true,
    canDeleteData: false,
    canAccessAdminPanel: false,
  },
} as const;
