/**
 * Default Values Constants
 * Define default values used throughout the application
 */

import { USER_ROLES } from './roles';

// Default Credentials (for initial setup only)
export const DEFAULT_CREDENTIALS = {
  ADMIN: {
    USERNAME: 'admin',
    PASSWORD: 'admin123',
    EMAIL: 'admin@skilllab.com',
  },
  TRAINER: {
    PASSWORD: 'trainer123',
    EMAIL_DOMAIN: '@skilllab.com',
  },
} as const;

// Default User IDs
export const DEFAULT_USER_IDS = {
  ADMIN: 'admin-1',
  TRAINER_1: 'trainer-1',
  TRAINER_2: 'trainer-2',
  TRAINER_3: 'trainer-3',
} as const;

// Default Group IDs
export const DEFAULT_GROUP_IDS = [
  'group-1', 'group-2', 'group-3',
  'group-4', 'group-5', 'group-6',
  'group-7', 'group-8', 'group-9',
] as const;

// Default Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

// Default Settings
export const DEFAULT_SETTINGS = {
  LANGUAGE: 'en',
  THEME: 'light',
  DATE_FORMAT: 'DD/MM/YYYY',
} as const;

// Export/Import Settings
export const EXPORT_SETTINGS = {
  EXCEL_SHEET_NAME: 'Students',
  CSV_DELIMITER: ',',
  FILENAME_DATE_FORMAT: 'YYYY-MM-DD',
} as const;
