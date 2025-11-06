/**
 * Validation Constants
 * Define validation rules and constraints
 */

// Password Requirements
export const PASSWORD_RULES = {
  MIN_LENGTH: 6,
  MIN_LENGTH_STRONG: 8,
  BCRYPT_SALT_ROUNDS: 10,
} as const;

// Username Requirements
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 50,
  PATTERN: /^[a-zA-Z0-9_]+$/,
} as const;

// Student Name Requirements
export const NAME_RULES = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 100,
  // Supports English letters, Arabic characters, spaces, hyphens, and apostrophes
  PATTERN: /^[\p{L}\s'-]+$/u,
} as const;

// Student ID Requirements
export const STUDENT_ID_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 20,
  PATTERN: /^[a-zA-Z0-9-]+$/,
} as const;

// Score Requirements
export const SCORE_RULES = {
  MIN: 0,
  MAX: 100,
} as const;

// File Upload Requirements
export const FILE_UPLOAD_RULES = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB in bytes
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
} as const;

// Date Format
export const DATE_FORMAT = {
  DISPLAY: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;
