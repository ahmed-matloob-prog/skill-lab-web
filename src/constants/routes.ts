/**
 * Application Routes Constants
 * Define all route paths used in the application
 */

export const ROUTES = {
  // Public Routes
  LOGIN: '/',

  // Private Routes
  DASHBOARD: '/dashboard',
  STUDENTS: '/students',
  ATTENDANCE: '/attendance',
  ASSESSMENTS: '/assessments',
  COMBINED_INPUT: '/combined-input',
  ATTENDANCE_ASSESSMENT: '/attendance-assessment',
  REPORTS: '/reports',
  TRAINER_REPORTS: '/trainer-reports',
  ADMIN_REPORTS: '/admin-reports',
  SYNC: '/sync',

  // Admin Only Routes
  ADMIN: '/admin',

  // Error Routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/unauthorized',
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Route names for display purposes
export const ROUTE_NAMES = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  [ROUTES.STUDENTS]: 'Students',
  [ROUTES.ATTENDANCE]: 'Attendance',
  [ROUTES.ASSESSMENTS]: 'Assessments',
  [ROUTES.COMBINED_INPUT]: 'Combined Input',
  [ROUTES.ATTENDANCE_ASSESSMENT]: 'Attendance & Assessment',
  [ROUTES.REPORTS]: 'Reports',
  [ROUTES.TRAINER_REPORTS]: 'Trainer Reports',
  [ROUTES.ADMIN_REPORTS]: 'Admin Reports',
  [ROUTES.SYNC]: 'Sync',
  [ROUTES.ADMIN]: 'Admin Panel',
} as const;
