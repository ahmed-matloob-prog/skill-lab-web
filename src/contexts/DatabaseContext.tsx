import React, { createContext, useContext, useEffect, useState } from 'react';
import DatabaseService from '../services/databaseService';
import FirebaseSyncService from '../services/firebaseSyncService';
import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';
import { logger } from '../utils/logger';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface DatabaseContextType {
  // Data
  students: Student[];
  groups: Group[];
  attendance: AttendanceRecord[];
  assessments: AssessmentRecord[];
  loading: boolean;

  // Sync status
  syncStatus: SyncStatus;
  pendingSyncCount: number;

  // Student operations
  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  addStudents: (students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<{ added: number; skipped: number; errors: string[] }>;
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

  // Export to Admin operations
  exportAssessmentToAdmin: (assessmentId: string, trainerId: string) => Promise<void>;
  exportMultipleAssessmentsToAdmin: (assessmentIds: string[], trainerId: string) => Promise<{ success: number; failed: number }>;
  unlockAssessment: (assessmentId: string, adminId: string) => Promise<void>;
  getExportedAssessments: () => Promise<AssessmentRecord[]>;
  getDraftAssessments: (trainerId: string) => Promise<AssessmentRecord[]>;
  markAssessmentReviewedByAdmin: (assessmentId: string, adminId: string) => Promise<void>;

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
  bulkUpdateCurrentUnit: (year: number, currentUnit: string) => Promise<number>;
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    initializeDatabase();
  }, []);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = () => {
      const status = FirebaseSyncService.getSyncStatus();
      const pendingCount = FirebaseSyncService.getPendingSyncCount();
      setSyncStatus(status);
      setPendingSyncCount(pendingCount);
    };

    // Update immediately
    updateSyncStatus();

    // Update every 2 seconds
    const interval = setInterval(updateSyncStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const initializeDatabase = async () => {
    try {
      setLoading(true);

      // Initialize localStorage
      await DatabaseService.initDatabase();

      // Load from localStorage first (instant display)
      await Promise.all([
        refreshStudents(),
        refreshGroups(),
        refreshAttendance(),
        refreshAssessments(),
      ]);

      // If Firebase is available, sync in background
      if (FirebaseSyncService.isAvailable()) {
        logger.log('DatabaseContext: Firebase available - syncing data');
        syncFromFirebase();

        // Subscribe to real-time updates for multi-user collaboration
        setupRealtimeListeners();
      } else {
        logger.log('DatabaseContext: Firebase not configured - using localStorage only');
      }
    } catch (error) {
      logger.error('Error initializing database:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Merge local and Firebase data with conflict resolution
   * Last-write-wins strategy based on updatedAt timestamp
   */
  const mergeDataWithConflictResolution = <T extends { id: string; updatedAt?: string; timestamp?: string }>(
    localData: T[],
    firebaseData: T[]
  ): T[] => {
    const merged = new Map<string, T>();

    // Add all local data first
    localData.forEach(item => merged.set(item.id, item));

    // Merge Firebase data, keeping newer items
    firebaseData.forEach(firebaseItem => {
      const localItem = merged.get(firebaseItem.id);

      if (!localItem) {
        // New item from Firebase
        merged.set(firebaseItem.id, firebaseItem);
      } else {
        // Compare timestamps - keep newer one
        const localTimestamp = localItem.updatedAt || localItem.timestamp || '1970-01-01';
        const firebaseTimestamp = firebaseItem.updatedAt || firebaseItem.timestamp || '1970-01-01';
        const localTime = new Date(localTimestamp).getTime();
        const firebaseTime = new Date(firebaseTimestamp).getTime();

        if (firebaseTime > localTime) {
          // Firebase version is newer
          merged.set(firebaseItem.id, firebaseItem);
        }
      }
    });

    return Array.from(merged.values());
  };

  /**
   * Sync data from Firebase to localStorage with conflict resolution
   */
  const syncFromFirebase = async () => {
    try {
      const firebaseData = await FirebaseSyncService.fetchAllFromFirebase();

      // Merge Firebase data with localStorage using conflict resolution
      // Strategy: Last-write-wins based on updatedAt/timestamp

      // Merge students
      if (firebaseData.students.length > 0) {
        const mergedStudents = mergeDataWithConflictResolution(students, firebaseData.students);
        localStorage.setItem('students', JSON.stringify(mergedStudents));
        setStudents(mergedStudents);
      }

      // Merge groups
      if (firebaseData.groups.length > 0) {
        const mergedGroups = mergeDataWithConflictResolution(groups, firebaseData.groups);
        localStorage.setItem('groups', JSON.stringify(mergedGroups));
        setGroups(mergedGroups);
      }

      // Merge attendance
      if (firebaseData.attendance.length > 0) {
        const mergedAttendance = mergeDataWithConflictResolution(attendance, firebaseData.attendance);
        localStorage.setItem('attendance', JSON.stringify(mergedAttendance));
        setAttendance(mergedAttendance);
      }

      // Merge assessments
      if (firebaseData.assessments.length > 0) {
        const mergedAssessments = mergeDataWithConflictResolution(assessments, firebaseData.assessments);
        localStorage.setItem('assessments', JSON.stringify(mergedAssessments));
        setAssessments(mergedAssessments);
      }

      logger.log('DatabaseContext: Firebase sync completed with conflict resolution');
    } catch (error) {
      logger.error('DatabaseContext: Error syncing from Firebase:', error);
    }
  };

  /**
   * Setup real-time listeners for multi-user collaboration
   */
  const setupRealtimeListeners = () => {
    // Subscribe to students
    FirebaseSyncService.subscribeToStudents((firebaseStudents) => {
      localStorage.setItem('students', JSON.stringify(firebaseStudents));
      setStudents(firebaseStudents);
    });

    // Subscribe to groups
    FirebaseSyncService.subscribeToGroups((firebaseGroups) => {
      localStorage.setItem('groups', JSON.stringify(firebaseGroups));
      setGroups(firebaseGroups);
    });

    // Subscribe to attendance
    FirebaseSyncService.subscribeToAttendance((firebaseAttendance) => {
      localStorage.setItem('attendance', JSON.stringify(firebaseAttendance));
      setAttendance(firebaseAttendance);
    });

    // Subscribe to assessments
    FirebaseSyncService.subscribeToAssessments((firebaseAssessments) => {
      localStorage.setItem('assessments', JSON.stringify(firebaseAssessments));
      setAssessments(firebaseAssessments);
    });

    logger.log('DatabaseContext: Real-time listeners established');
  };

  // Student operations
  const addStudent = async (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    // Add to localStorage first (instant UI update)
    const id = await DatabaseService.addStudent(student);
    await refreshStudents();

    // Sync to Firebase in background
    const fullStudent = await DatabaseService.getStudents().then(s => s.find(st => st.id === id));
    if (fullStudent) {
      FirebaseSyncService.syncStudent(fullStudent).catch(error => {
        logger.error('Error syncing student to Firebase:', error);
      });
    }

    return id;
  };

  const addStudents = async (students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ added: number; skipped: number; errors: string[] }> => {
    // Add to localStorage first (instant UI update)
    const result = await DatabaseService.addStudents(students);
    await refreshStudents();

    // Sync all added students to Firebase in background
    if (result.added > 0) {
      const allStudents = await DatabaseService.getStudents();
      // Get the newly added students (they'll be the most recent ones)
      const addedStudents = allStudents.slice(-result.added);

      // Sync each student to Firebase
      addedStudents.forEach(student => {
        FirebaseSyncService.syncStudent(student).catch(error => {
          logger.error(`Error syncing student ${student.name} to Firebase:`, error);
        });
      });

      logger.log(`DatabaseContext: Syncing ${result.added} students to Firebase`);
    }

    return result;
  };

  const updateStudent = async (id: string, updates: Partial<Student>): Promise<void> => {
    // Update localStorage first (instant UI update)
    await DatabaseService.updateStudent(id, updates);
    await refreshStudents();

    // Sync to Firebase in background
    const updatedStudent = await DatabaseService.getStudents().then(s => s.find(st => st.id === id));
    if (updatedStudent) {
      FirebaseSyncService.syncStudent(updatedStudent).catch(error => {
        logger.error('Error syncing student to Firebase:', error);
      });
    }
  };

  const deleteStudent = async (id: string): Promise<void> => {
    // Delete from localStorage first (instant UI update)
    await DatabaseService.deleteStudent(id);
    await refreshStudents();

    // Delete from Firebase in background
    FirebaseSyncService.deleteStudent(id).catch(error => {
      logger.error('Error deleting student from Firebase:', error);
    });
  };

  const getStudentsByGroup = async (groupId: string): Promise<Student[]> => {
    return await DatabaseService.getStudentsByGroup(groupId);
  };

  const getStudentsByYear = async (year: number): Promise<Student[]> => {
    return await DatabaseService.getStudentsByYear(year);
  };

  // Group operations
  const addGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    // Add to localStorage first
    const id = await DatabaseService.addGroup(group);
    await refreshGroups();

    // Sync to Firebase in background
    const fullGroup = await DatabaseService.getGroups().then(g => g.find(gr => gr.id === id));
    if (fullGroup) {
      FirebaseSyncService.syncGroup(fullGroup).catch(error => {
        logger.error('Error syncing group to Firebase:', error);
      });
    }

    return id;
  };

  const updateGroup = async (id: string, updates: Partial<Group>): Promise<void> => {
    // Update localStorage first
    await DatabaseService.updateGroup(id, updates);
    await refreshGroups();

    // Sync to Firebase in background
    const updatedGroup = await DatabaseService.getGroups().then(g => g.find(gr => gr.id === id));
    if (updatedGroup) {
      FirebaseSyncService.syncGroup(updatedGroup).catch(error => {
        logger.error('Error syncing group to Firebase:', error);
      });
    }
  };

  const deleteGroup = async (id: string): Promise<void> => {
    // Delete from localStorage first
    await DatabaseService.deleteGroup(id);
    await refreshGroups();

    // Delete from Firebase in background
    FirebaseSyncService.deleteGroup(id).catch(error => {
      logger.error('Error deleting group from Firebase:', error);
    });
  };

  const getGroupsByYear = async (year: number): Promise<Group[]> => {
    return await DatabaseService.getGroupsByYear(year);
  };

  // Attendance operations
  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<string> => {
    // Add to localStorage first
    const id = await DatabaseService.addAttendanceRecord(record);
    await refreshAttendance();

    // Sync to Firebase in background
    const fullRecord = await DatabaseService.getAttendanceRecords().then(a => a.find(ar => ar.id === id));
    if (fullRecord) {
      FirebaseSyncService.syncAttendance(fullRecord).catch(error => {
        logger.error('Error syncing attendance to Firebase:', error);
      });
    }

    return id;
  };

  const updateAttendanceRecord = async (id: string, updates: Partial<AttendanceRecord>): Promise<void> => {
    // Update localStorage first
    await DatabaseService.updateAttendanceRecord(id, updates);
    await refreshAttendance();

    // Sync to Firebase in background
    const updatedRecord = await DatabaseService.getAttendanceRecords().then(a => a.find(ar => ar.id === id));
    if (updatedRecord) {
      FirebaseSyncService.syncAttendance(updatedRecord).catch(error => {
        logger.error('Error syncing attendance to Firebase:', error);
      });
    }
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
    // Add to localStorage first
    const id = await DatabaseService.addAssessmentRecord(record);
    await refreshAssessments();

    // Sync to Firebase in background
    const fullRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === id));
    if (fullRecord) {
      FirebaseSyncService.syncAssessment(fullRecord).catch(error => {
        logger.error('Error syncing assessment to Firebase:', error);
      });
    }

    return id;
  };

  const updateAssessmentRecord = async (id: string, updates: Partial<AssessmentRecord>): Promise<void> => {
    // Update localStorage first
    await DatabaseService.updateAssessmentRecord(id, updates);
    await refreshAssessments();

    // Sync to Firebase in background
    const updatedRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === id));
    if (updatedRecord) {
      FirebaseSyncService.syncAssessment(updatedRecord).catch(error => {
        logger.error('Error syncing assessment to Firebase:', error);
      });
    }
  };

  const deleteAssessmentRecord = async (id: string): Promise<void> => {
    // Delete from localStorage first
    await DatabaseService.deleteAssessmentRecord(id);
    await refreshAssessments();

    // Delete from Firebase in background
    FirebaseSyncService.deleteAssessment(id).catch(error => {
      logger.error('Error deleting assessment from Firebase:', error);
    });
  };

  const getAssessmentsByStudent = async (studentId: string): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getAssessmentsByStudent(studentId);
  };

  const getAssessmentsByGroup = async (groupId: string): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getAssessmentsByGroup(groupId);
  };

  // Export to Admin operations
  const exportAssessmentToAdmin = async (assessmentId: string, trainerId: string): Promise<void> => {
    await DatabaseService.exportAssessmentToAdmin(assessmentId, trainerId);
    await refreshAssessments();

    // Sync to Firebase in background
    const exportedRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === assessmentId));
    if (exportedRecord) {
      FirebaseSyncService.syncAssessment(exportedRecord).catch(error => {
        logger.error('Error syncing exported assessment to Firebase:', error);
      });
    }
  };

  const exportMultipleAssessmentsToAdmin = async (
    assessmentIds: string[],
    trainerId: string
  ): Promise<{ success: number; failed: number }> => {
    const result = await DatabaseService.exportMultipleAssessmentsToAdmin(assessmentIds, trainerId);
    await refreshAssessments();

    // Sync all exported assessments to Firebase in background
    const exportedRecords = await DatabaseService.getAssessmentRecords().then(assessments =>
      assessments.filter(a => assessmentIds.includes(a.id))
    );

    exportedRecords.forEach(record => {
      FirebaseSyncService.syncAssessment(record).catch(error => {
        logger.error(`Error syncing exported assessment ${record.id} to Firebase:`, error);
      });
    });

    return result;
  };

  const unlockAssessment = async (assessmentId: string, adminId: string): Promise<void> => {
    await DatabaseService.unlockAssessment(assessmentId, adminId);
    await refreshAssessments();

    // Sync to Firebase in background
    const unlockedRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === assessmentId));
    if (unlockedRecord) {
      FirebaseSyncService.syncAssessment(unlockedRecord).catch(error => {
        logger.error('Error syncing unlocked assessment to Firebase:', error);
      });
    }
  };

  const getExportedAssessments = async (): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getExportedAssessments();
  };

  const getDraftAssessments = async (trainerId: string): Promise<AssessmentRecord[]> => {
    return await DatabaseService.getDraftAssessments(trainerId);
  };

  const markAssessmentReviewedByAdmin = async (assessmentId: string, adminId: string): Promise<void> => {
    await DatabaseService.markAssessmentReviewedByAdmin(assessmentId, adminId);
    await refreshAssessments();

    // Sync to Firebase in background
    const reviewedRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === assessmentId));
    if (reviewedRecord) {
      FirebaseSyncService.syncAssessment(reviewedRecord).catch(error => {
        logger.error('Error syncing reviewed assessment to Firebase:', error);
      });
    }
  };

  // Refresh operations
  const refreshStudents = async (): Promise<void> => {
    try {
      const studentsData = await DatabaseService.getStudents();
      logger.log('DatabaseContext: Refreshing students, found:', studentsData.length);
      setStudents(studentsData);
    } catch (error) {
      logger.error('DatabaseContext: Error refreshing students:', error);
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
    logger.log('DatabaseContext: Force refreshing all data...');
    await Promise.all([
      refreshStudents(),
      refreshGroups(),
      refreshAttendance(),
      refreshAssessments(),
    ]);
    logger.log('DatabaseContext: Force refresh completed');
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

  // Bulk update current unit for all groups in a year
  const bulkUpdateCurrentUnit = async (year: number, currentUnit: string): Promise<number> => {
    const updatedCount = await DatabaseService.bulkUpdateCurrentUnit(year, currentUnit);
    await refreshGroups();

    // Sync all updated groups to Firebase in background
    if (updatedCount > 0) {
      const allGroups = await DatabaseService.getGroups();
      const updatedGroups = allGroups.filter(g => g.year === year);

      updatedGroups.forEach(group => {
        FirebaseSyncService.syncGroup(group).catch(error => {
          logger.error(`Error syncing group ${group.name} to Firebase:`, error);
        });
      });

      logger.log(`DatabaseContext: Syncing ${updatedCount} groups to Firebase after bulk unit update`);
    }

    return updatedCount;
  };

  const value: DatabaseContextType = {
    // Data
    students,
    groups,
    attendance,
    assessments,
    loading,

    // Sync status
    syncStatus,
    pendingSyncCount,

    // Student operations
    addStudent,
    addStudents,
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

    // Export to Admin operations
    exportAssessmentToAdmin,
    exportMultipleAssessmentsToAdmin,
    unlockAssessment,
    getExportedAssessments,
    getDraftAssessments,
    markAssessmentReviewedByAdmin,

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
    bulkUpdateCurrentUnit,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
