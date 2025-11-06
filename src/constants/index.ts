/**
 * Constants Index
 * Central export point for all application constants
 *
 * Usage:
 * import { STORAGE_KEYS, USER_ROLES, ATTENDANCE_STATUS } from '@/constants';
 */

// Storage Keys
export * from './storage';

// User Roles
export * from './roles';

// Status Values
export * from './status';

// Validation Rules
export * from './validation';

// Default Values
export * from './defaults';

// Routes
export * from './routes';

// Application-wide Constants
export const APP_CONFIG = {
  APP_NAME: 'Skill Lab',
  APP_VERSION: '2.0.0',
  APP_DESCRIPTION: 'Student Attendance and Assessment Management System',
  ORGANIZATION: 'Skill Lab',
  SUPPORT_EMAIL: 'support@skilllab.com',
} as const;

// Environment
export const ENV = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

// API Configuration (for future backend integration)
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Firebase Collections (matching firestore.rules)
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  PASSWORDS: 'passwords',
  STUDENTS: 'students',
  GROUPS: 'groups',
  ATTENDANCE: 'attendance',
  ASSESSMENTS: 'assessments',
  SYNC_STATUS: 'syncStatus',
} as const;

// UI Constants
export const UI_CONSTANTS = {
  DRAWER_WIDTH: 240,
  APP_BAR_HEIGHT: 64,
  SIDEBAR_COLLAPSED_WIDTH: 60,
  MOBILE_BREAKPOINT: 'sm',
  TABLET_BREAKPOINT: 'md',
  DESKTOP_BREAKPOINT: 'lg',
} as const;

// Time Constants (in milliseconds)
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Notification Messages
export const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    SAVE: 'Data saved successfully',
    DELETE: 'Data deleted successfully',
    UPDATE: 'Data updated successfully',
    IMPORT: 'Data imported successfully',
    EXPORT: 'Data exported successfully',
    SYNC: 'Data synced successfully',
  },
  ERROR: {
    LOGIN_FAILED: 'Invalid username or password',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    NETWORK_ERROR: 'Network error. Please check your connection',
    VALIDATION_ERROR: 'Please check the form for errors',
    SAVE_FAILED: 'Failed to save data',
    DELETE_FAILED: 'Failed to delete data',
    UPDATE_FAILED: 'Failed to update data',
    IMPORT_FAILED: 'Failed to import data',
    EXPORT_FAILED: 'Failed to export data',
    SYNC_FAILED: 'Failed to sync data',
    GENERIC: 'An error occurred. Please try again',
  },
  WARNING: {
    UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
    DELETE_CONFIRMATION: 'Are you sure you want to delete this item?',
    CLEAR_DATA: 'This will clear all data. Are you sure?',
  },
  INFO: {
    NO_DATA: 'No data available',
    LOADING: 'Loading...',
    SYNCING: 'Syncing data...',
    PROCESSING: 'Processing...',
  },
} as const;
