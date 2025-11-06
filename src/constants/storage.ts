/**
 * LocalStorage Keys Constants
 * Centralized storage keys for localStorage operations
 */

export const STORAGE_KEYS = {
  // User Authentication
  USERS: 'users',
  CURRENT_USER: 'currentUser',
  USER_PASSWORDS: 'userPasswords',

  // Database Collections
  STUDENTS: 'students',
  GROUPS: 'groups',
  ATTENDANCE: 'attendance',
  ASSESSMENTS: 'assessments',

  // Sync Management
  LAST_SYNC: 'lastSync',
} as const;

// Type for storage keys to ensure type safety
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
