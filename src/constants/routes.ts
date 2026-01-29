/**
 * Application Routes Constants
 * Define all route paths used in the application
 */

export const ROUTES = {
  // Public Routes
  LOGIN: '/login',

  // Private Routes
  DASHBOARD: '/dashboard',
  STUDENTS: '/students',
  INPUT: '/input',
  ASSESSMENTS: '/assessments',
  ATTENDANCE_REPORT: '/attendance-report',

  // Admin Only Routes
  ADMIN: '/admin',
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Route names for display purposes
export const ROUTE_NAMES = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.STUDENTS]: 'Students',
  [ROUTES.INPUT]: 'Input Data',
  [ROUTES.ASSESSMENTS]: 'Assessments',
  [ROUTES.ATTENDANCE_REPORT]: 'Attendance Report',
  [ROUTES.ADMIN]: 'Admin Panel',
} as const;
