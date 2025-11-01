import React, { createContext, useContext, useEffect, useState } from 'react';
import DatabaseService from '../services/databaseService';
import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';

interface DatabaseContextType {
  // Data
  students: Student[];
  groups: Group[];
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
  loading: boolean;

  // Student operations
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  getStudentsByGroup: (groupId: string) => Promise<Student[]>;
  getStudentsByYear: (year: number) => Promise<Student[]>;

  // Group operations
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroupsByYear: (year: number) => Promise<Group[]>;

  // Attendance operations
  addAttendanceRecord: (record: Omit<AttendanceRecord, 'id' | 'timestamp'>) => Promise<string>;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  getAttendanceByDate: (date: string) => Promise<AttendanceRecord[]>;
  getAttendanceByStudent: (studentId: string) => Promise<AttendanceRecord[]>;
  getAttendanceByGroup: (groupId: string, date?: string) => Promise<AttendanceRecord[]>;

  // Assessment operations
  addAssessmentRecord: (record: Omit<AssessmentRecord, 'id' | 'timestamp'>) => Promise<string>;
  updateAssessmentRecord: (id: string, updates: Partial<AssessmentRecord>) => Promise<void>;
  deleteAssessmentRecord: (id: string) => Promise<void>;
  getAssessmentsByStudent: (studentId: string) => Promise<AssessmentRecord[]>;
  getAssessmentsByGroup: (groupId: string) => Promise<AssessmentRecord[]>;

  // Refresh operations
  refreshStudents: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshAttendance: () => Promise<void>;
  refreshAssessments: () => Promise<void>;
  forceRefresh: () => Promise<void>;

  // Sync operations
  getUnsyncedRecords: () => Promise<{
    groups: Group[];
    students: Student[];
    attendance: AttendanceRecord[];
    assessments: AssessmentRecord[];
  }>;
  markAttendanceSynced: (ids: string[]) => Promise<void>;
  markAssessmentsSynced: (ids: string[]) => Promise<void>;

  // Clear operations
  clearAllData: () => Promise<void>;
  clearStudentsData: () => Promise<void>;

  // Update operations
  updateGroupsToFullSet: () => Promise<void>;
  ensureAllGroupsExist: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      await DatabaseService.initDatabase();
      await Promise.all([
        refreshStudents(),
        refreshGroups(),
        refreshAttendance(),
        refreshAssessments(),
      ]);
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      setLoading(false);
    }
  };

  // Student operations
  const addStudent = async (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = await DatabaseService.addStudent(student);
    await refreshStudents();
    return id;
  };

  const updateStudent = async (id: string, updates: Partial<Student>): Promise<void> => {
    await DatabaseService.updateStudent(id, updates);
    await refreshStudents();
  };

  const deleteStudent = async (id: string): Promise<void> => {
    await DatabaseService.deleteStudent(id);
    await refreshStudents();
  };

  const getStudentsByGroup = async (groupId: string): Promise<Student[]> => {
    return await DatabaseService.getStudentsByGroup(groupId);
  };

  const getStudentsByYear = async (year: number): Promise<Student[]> => {
    return await DatabaseService.getStudentsByYear(year);
  };

  // Group operations
  const addGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = await DatabaseService.addGroup(group);
    await refreshGroups();
    return id;
  };

  const updateGroup = async (id: string, updates: Partial<Group>): Promise<void> => {
    await DatabaseService.updateGroup(id, updates);
    await refreshGroups();
  };

  const deleteGroup = async (id: string): Promise<void> => {
    await DatabaseService.deleteGroup(id);
    await refreshGroups();
  };

  const getGroupsByYear = async (year: number): Promise<Group[]> => {
    return await DatabaseService.getGroupsByYear(year);
  };

  // Attendance operations
  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<string> => {
    const id = await DatabaseService.addAttendanceRecord(record);
    await refreshAttendance();
    return id;
  };

  const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
    await DatabaseService.updateAttendanceRecord(id, updates);
    await refreshAttendance();
  };

  const getAttendanceByDate = async (date: string): Promise<AttendanceRecord[]> => {
    return await DatabaseService.getAttendanceByDate(date);
  };

  const getAttendanceByStudent = async (studentId: string): Promise<AttendanceRecord[]> => {
    return await DatabaseService.getAttendanceByStudent(studentId);
  };

  const getAttendanceByGroup = async (groupId: string, date?: string): Promise<AttendanceRecord[]> => {
    return await DatabaseService.getAttendanceByGroup(groupId, date);
  };

  // Assessment operations
  const addAssessmentRecord = async (record: Omit<AssessmentRecord, 'id' | 'timestamp'>): Promise<string> => {
    const id = await DatabaseService.addAssessmentRecord(record);
    await refreshAssessments();
    return id;
  };

  const updateAssessmentRecord = async (id: string, updates: Partial<AssessmentRecord>): Promise<void> => {
    await DatabaseService.updateAssessmentRecord(id, updates);
    await refreshAssessments();
  };

  const deleteAssessmentRecord = async (id: string): Promise<void> => {
    await DatabaseService.deleteAssessmentRecord(id);
    await refreshAssessments();
  };

  const getAssessmentsByStudent = async (studentId: string): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getAssessmentsByStudent(studentId);
  };

  const getAssessmentsByGroup = async (groupId: string): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getAssessmentsByGroup(groupId);
  };

  // Refresh operations
  const refreshStudents = async (): Promise<void> => {
    try {
      const studentsData = await DatabaseService.getStudents();
      console.log('DatabaseContext: Refreshing students, found:', studentsData.length);
      setStudents(studentsData);
    } catch (error) {
      console.error('DatabaseContext: Error refreshing students:', error);
    }
  };

  const refreshGroups = async (): Promise<void> => {
    const groupsData = await DatabaseService.getGroups();
    setGroups(groupsData);
  };

  const refreshAttendance = async (): Promise<void> => {
    const attendanceData = await DatabaseService.getAttendanceRecords();
    setAttendance(attendanceData);
  };

  const refreshAssessments = async (): Promise<void> => {
    const assessmentsData = await DatabaseService.getAssessmentRecords();
    setAssessments(assessmentsData);
  };

  const forceRefresh = async (): Promise<void> => {
    console.log('DatabaseContext: Force refreshing all data...');
    await Promise.all([
      refreshStudents(),
      refreshGroups(),
      refreshAttendance(),
      refreshAssessments(),
    ]);
    console.log('DatabaseContext: Force refresh completed');
  };

  // Sync operations
  const getUnsyncedRecords = async () => {
    return await DatabaseService.getUnsyncedRecords();
  };

  const markAttendanceSynced = async (ids: string[]) => {
    await DatabaseService.markAttendanceSynced(ids);
    await refreshAttendance();
  };

  const markAssessmentsSynced = async (ids: string[]) => {
    await DatabaseService.markAssessmentsSynced(ids);
    await refreshAssessments();
  };

  // Clear operations
  const clearAllData = async () => {
    await DatabaseService.clearAllData();
    await Promise.all([
      refreshStudents(),
      refreshGroups(),
      refreshAttendance(),
      refreshAssessments(),
    ]);
  };

  const clearStudentsData = async () => {
    await DatabaseService.clearStudentsData();
    await refreshStudents();
  };

  // Update operations
  const updateGroupsToFullSet = async () => {
    await DatabaseService.updateGroupsToFullSet();
    await refreshGroups();
  };

  // Force ensure all groups exist
  const ensureAllGroupsExist = async () => {
    await DatabaseService.ensureAllGroupsExist();
    await refreshGroups();
  };

  const value: DatabaseContextType = {
    // Data
    students,
    groups,
    attendance,
    assessments,
    loading,

    // Student operations
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentsByGroup,
    getStudentsByYear,

    // Group operations
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupsByYear,

    // Attendance operations
    addAttendanceRecord,
    updateAttendanceRecord,
    getAttendanceByDate,
    getAttendanceByStudent,
    getAttendanceByGroup,

    // Assessment operations
    addAssessmentRecord,
    updateAssessmentRecord,
    deleteAssessmentRecord,
    getAssessmentsByStudent,
    getAssessmentsByGroup,

    // Refresh operations
    refreshStudents,
    refreshGroups,
    refreshAttendance,
    refreshAssessments,
    forceRefresh,

    // Sync operations
    getUnsyncedRecords,
    markAttendanceSynced,
    markAssessmentsSynced,

    // Clear operations
    clearAllData,
    clearStudentsData,

    // Update operations
    updateGroupsToFullSet,
    ensureAllGroupsExist,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
