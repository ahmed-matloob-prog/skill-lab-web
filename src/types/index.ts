export interface Student {
  id: string;
  name: string;
  studentId: string;
  email?: string;
  phone?: string;
  year: number; // 1-6
  groupId: string; // Required reference to group
  unit?: string; // For Year 2: MSK, HEM, CVS, Resp | For Year 3: GIT, GUT, Neuro, END
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  year: number; // 1-6
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // Only date needed
  status: 'present' | 'absent' | 'late';
  timestamp: string;
  synced: boolean;
  trainerId: string;
  year: number;
  groupId: string;
  notes?: string;
}

export interface AssessmentRecord {
  id: string;
  studentId: string;
  assessmentName: string;
  assessmentType: 'exam' | 'quiz' | 'assignment' | 'project' | 'presentation';
  score: number;
  maxScore: number;
  date: string;
  year: number;
  groupId: string;
  unit?: string; // Unit for Year 2/3 students
  week?: number; // Week number (1-10)
  notes?: string;
  timestamp: string;
  synced: boolean;
  trainerId: string;
}

export interface SyncData {
  students: Student[];
  groups: Group[];
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
}

export interface NetworkStatus {
  isConnected: boolean;
  lastChecked: string;
}

// Updated types for authentication and user management
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'trainer';
  assignedGroups?: string[]; // Array of group IDs the trainer is assigned to
  assignedYears?: number[]; // Array of years (1-6) the trainer is assigned to
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TrainerStats {
  trainerId: string;
  trainerName: string;
  totalStudents: number;
  totalGroups: number;
  totalAttendanceRecords: number;
  totalAssessments: number;
  lastSync: string;
}

// Excel import types
export interface ExcelStudentData {
  name: string;
  studentId: string;
  email?: string;
  phone?: string;
}

