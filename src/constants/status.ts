/**
 * Status Constants
 * Define all status values used throughout the application
 */

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
} as const;

export type AttendanceStatusType = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// Assessment Types
export const ASSESSMENT_TYPES = {
  EXAM: 'exam',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  PROJECT: 'project',
  PRESENTATION: 'presentation',
} as const;

export type AssessmentType = typeof ASSESSMENT_TYPES[keyof typeof ASSESSMENT_TYPES];

// Year 2 Units
export const YEAR_2_UNITS = {
  MSK: 'MSK',
  HEM: 'HEM',
  CVS: 'CVS',
  RESP: 'Resp',
} as const;

// Year 3 Units
export const YEAR_3_UNITS = {
  GIT: 'GIT',
  GUT: 'GUT',
  NEURO: 'Neuro',
  END: 'END',
} as const;

// Combined Units
export const UNITS = {
  ...YEAR_2_UNITS,
  ...YEAR_3_UNITS,
} as const;

export type UnitType = typeof UNITS[keyof typeof UNITS];

// Year Numbers
export const YEARS = {
  YEAR_1: 1,
  YEAR_2: 2,
  YEAR_3: 3,
  YEAR_4: 4,
  YEAR_5: 5,
  YEAR_6: 6,
} as const;

export type YearNumber = typeof YEARS[keyof typeof YEARS];

// Week Numbers (for assessments)
export const WEEKS = {
  MIN: 1,
  MAX: 10,
} as const;
