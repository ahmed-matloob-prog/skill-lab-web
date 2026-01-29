import React, { createContext, useContext, useEffect, useState } from 'react';
import DatabaseService from '../services/databaseService';
import FirebaseSyncService from '../services/firebaseSyncService';
import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';
import { logger } from '../utils/logger';

/**
 * Safe localStorage wrapper that handles quota exceeded errors
 */
const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError' || error?.code === 22) {
      logger.error(`DatabaseContext: localStorage quota exceeded for key "${key}". Data will be kept in memory only.`);
      // Data is still in React state, just not persisted to localStorage
      return false;
    }
    logger.error(`DatabaseContext: Error saving to localStorage:`, error);
    return false;
  }
};

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncProgress {
  isInitialSync: boolean;
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
}

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
  syncProgress: SyncProgress;

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
  adminExportAssessment: (assessmentId: string, adminId: string) => Promise<void>;
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
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isInitialSync: false,
    currentStep: '',
    stepsCompleted: 0,
    totalSteps: 4
  });

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

        // First, do a full sync from Firebase and WAIT for it to complete
        await syncFromFirebase();

        // Only after initial sync is done, setup real-time listeners
        // This prevents empty snapshots from overwriting data during initial load
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
   * Fetches each collection separately to show real progress
   */
  const syncFromFirebase = async () => {
    try {
      // Read current localStorage data
      const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
      const localGroups = JSON.parse(localStorage.getItem('groups') || '[]');
      const localAttendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      const localAssessments = JSON.parse(localStorage.getItem('assessments') || '[]');

      // Step 1: Fetch and merge students & groups
      setSyncProgress({
        isInitialSync: true,
        currentStep: 'Fetching students & groups...',
        stepsCompleted: 0,
        totalSteps: 4
      });

      const [firebaseStudents, firebaseGroups] = await Promise.all([
        FirebaseSyncService.fetchStudents(),
        FirebaseSyncService.fetchGroups()
      ]);

      setSyncProgress({
        isInitialSync: true,
        currentStep: `Syncing ${firebaseStudents.length} students & ${firebaseGroups.length} groups...`,
        stepsCompleted: 1,
        totalSteps: 4
      });

      if (firebaseStudents.length > 0) {
        const mergedStudents = mergeDataWithConflictResolution(localStudents, firebaseStudents);
        safeLocalStorageSet('students', JSON.stringify(mergedStudents));
        setStudents(mergedStudents);
        logger.log(`DatabaseContext: Merged students: ${localStudents.length} local + ${firebaseStudents.length} firebase = ${mergedStudents.length} total`);
      }

      if (firebaseGroups.length > 0) {
        const mergedGroups = mergeDataWithConflictResolution(localGroups, firebaseGroups);
        safeLocalStorageSet('groups', JSON.stringify(mergedGroups));
        setGroups(mergedGroups);
        logger.log(`DatabaseContext: Merged groups: ${localGroups.length} local + ${firebaseGroups.length} firebase = ${mergedGroups.length} total`);
      }

      // Step 2: Fetch and merge attendance
      setSyncProgress({
        isInitialSync: true,
        currentStep: 'Fetching attendance records...',
        stepsCompleted: 1,
        totalSteps: 4
      });

      const firebaseAttendance = await FirebaseSyncService.fetchAttendance();

      setSyncProgress({
        isInitialSync: true,
        currentStep: `Syncing ${firebaseAttendance.length} attendance records...`,
        stepsCompleted: 2,
        totalSteps: 4
      });

      if (firebaseAttendance.length > 0) {
        const mergedAttendance = mergeDataWithConflictResolution(localAttendance, firebaseAttendance);
        safeLocalStorageSet('attendance', JSON.stringify(mergedAttendance));
        setAttendance(mergedAttendance);
        logger.log(`DatabaseContext: Merged attendance: ${localAttendance.length} local + ${firebaseAttendance.length} firebase = ${mergedAttendance.length} total`);
      }

      // Step 3: Fetch and merge assessments (largest collection)
      setSyncProgress({
        isInitialSync: true,
        currentStep: 'Fetching assessments (this may take a moment)...',
        stepsCompleted: 2,
        totalSteps: 4
      });

      const firebaseAssessments = await FirebaseSyncService.fetchAssessments();

      setSyncProgress({
        isInitialSync: true,
        currentStep: `Syncing ${firebaseAssessments.length} assessments...`,
        stepsCompleted: 3,
        totalSteps: 4
      });

      if (firebaseAssessments.length > 0) {
        const mergedAssessments = mergeDataWithConflictResolution(localAssessments, firebaseAssessments);
        safeLocalStorageSet('assessments', JSON.stringify(mergedAssessments));
        setAssessments(mergedAssessments);
        logger.log(`DatabaseContext: Merged assessments: ${localAssessments.length} local + ${firebaseAssessments.length} firebase = ${mergedAssessments.length} total`);
      }

      // Step 4: Complete
      setSyncProgress({
        isInitialSync: false,
        currentStep: 'Sync complete!',
        stepsCompleted: 4,
        totalSteps: 4
      });

      logger.log('DatabaseContext: Firebase sync completed with conflict resolution');
    } catch (error) {
      logger.error('DatabaseContext: Error syncing from Firebase:', error);
      setSyncProgress({
        isInitialSync: false,
        currentStep: 'Sync error',
        stepsCompleted: 0,
        totalSteps: 4
      });
    }
  };

  /**
   * Setup real-time listeners for multi-user collaboration
   * Uses conflict resolution to merge Firebase updates with local data
   * to prevent data loss from unsynced local changes
   */
  const setupRealtimeListeners = () => {
    // Subscribe to students with conflict resolution
    FirebaseSyncService.subscribeToStudents((firebaseStudents) => {
      // Skip if Firebase returns empty but we have local data (prevents data loss)
      const localStudents = JSON.parse(localStorage.getItem('students') || '[]');
      if (firebaseStudents.length === 0 && localStudents.length > 0) {
        logger.log('DatabaseContext: Skipping empty Firebase students update (local has data)');
        return;
      }
      const mergedStudents = mergeDataWithConflictResolution(localStudents, firebaseStudents);
      safeLocalStorageSet('students', JSON.stringify(mergedStudents));
      setStudents(mergedStudents);
      logger.log(`DatabaseContext: Merged ${firebaseStudents.length} Firebase students with ${localStudents.length} local = ${mergedStudents.length}`);
    });

    // Subscribe to groups with conflict resolution
    FirebaseSyncService.subscribeToGroups((firebaseGroups) => {
      const localGroups = JSON.parse(localStorage.getItem('groups') || '[]');
      if (firebaseGroups.length === 0 && localGroups.length > 0) {
        logger.log('DatabaseContext: Skipping empty Firebase groups update (local has data)');
        return;
      }
      const mergedGroups = mergeDataWithConflictResolution(localGroups, firebaseGroups);
      safeLocalStorageSet('groups', JSON.stringify(mergedGroups));
      setGroups(mergedGroups);
      logger.log(`DatabaseContext: Merged ${firebaseGroups.length} Firebase groups with ${localGroups.length} local = ${mergedGroups.length}`);
    });

    // Subscribe to attendance with conflict resolution
    FirebaseSyncService.subscribeToAttendance((firebaseAttendance) => {
      const localAttendance = JSON.parse(localStorage.getItem('attendance') || '[]');
      if (firebaseAttendance.length === 0 && localAttendance.length > 0) {
        logger.log('DatabaseContext: Skipping empty Firebase attendance update (local has data)');
        return;
      }
      const mergedAttendance = mergeDataWithConflictResolution(localAttendance, firebaseAttendance);
      safeLocalStorageSet('attendance', JSON.stringify(mergedAttendance));
      setAttendance(mergedAttendance);
      logger.log(`DatabaseContext: Merged ${firebaseAttendance.length} Firebase attendance with ${localAttendance.length} local = ${mergedAttendance.length}`);
    });

    // Subscribe to assessments with conflict resolution
    FirebaseSyncService.subscribeToAssessments((firebaseAssessments) => {
      const localAssessments = JSON.parse(localStorage.getItem('assessments') || '[]');
      if (firebaseAssessments.length === 0 && localAssessments.length > 0) {
        logger.log('DatabaseContext: Skipping empty Firebase assessments update (local has data)');
        return;
      }
      const mergedAssessments = mergeDataWithConflictResolution(localAssessments, firebaseAssessments);
      safeLocalStorageSet('assessments', JSON.stringify(mergedAssessments));
      setAssessments(mergedAssessments);
      logger.log(`DatabaseContext: Merged ${firebaseAssessments.length} Firebase assessments with ${localAssessments.length} local = ${mergedAssessments.length}`);
    });

    logger.log('DatabaseContext: Real-time listeners established with conflict resolution');
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
    // Use React state instead of localStorage (which may be empty due to quota)
    return students.filter(student => student.groupId === groupId);
  };

  const getStudentsByYear = async (year: number): Promise<Student[]> => {
    // Use React state instead of localStorage (which may be empty due to quota)
    return students.filter(student => student.year === year);
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
    // Use React state instead of localStorage (which may be empty due to quota)
    return groups.filter(group => group.year === year);
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
    // Use React state instead of localStorage (which may be empty due to quota)
    return attendance.filter(record => record.date === date);
  };

  const getAttendanceByStudent = async (studentId: string): Promise<AttendanceRecord[]> => {
    // Use React state instead of localStorage (which may be empty due to quota)
    return attendance.filter(record => record.studentId === studentId);
  };

  const getAttendanceByGroup = async (groupId: string, date?: string): Promise<AttendanceRecord[]> => {
    // Use React state instead of localStorage (which may be empty due to quota)
    return attendance.filter(record => {
      if (record.groupId !== groupId) return false;
      if (date && record.date !== date) return false;
      return true;
    });
  };

  // Assessment operations
  const addAssessmentRecord = async (record: Omit<AssessmentRecord, 'id' | 'timestamp'>): Promise<string> => {
    // Add to localStorage first
    const id = await DatabaseService.addAssessmentRecord(record);
    await refreshAssessments();

    // Sync to Firebase in background and mark as synced if successful
    const fullRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === id));
    if (fullRecord) {
      FirebaseSyncService.syncAssessment(fullRecord)
        .then(async (synced) => {
          if (synced) {
            // Mark as synced in localStorage
            await DatabaseService.markAssessmentsSynced([id]);
            logger.log(`DatabaseContext: Assessment ${id} marked as synced`);
          }
        })
        .catch(error => {
          logger.error('Error syncing assessment to Firebase:', error);
        });
    }

    return id;
  };

  const updateAssessmentRecord = async (id: string, updates: Partial<AssessmentRecord>): Promise<void> => {
    // Update localStorage first
    await DatabaseService.updateAssessmentRecord(id, updates);
    await refreshAssessments();

    // Sync to Firebase in background and mark as synced if successful
    const updatedRecord = await DatabaseService.getAssessmentRecords().then(a => a.find(ar => ar.id === id));
    if (updatedRecord) {
      FirebaseSyncService.syncAssessment(updatedRecord)
        .then(async (synced) => {
          if (synced) {
            // Mark as synced in localStorage
            await DatabaseService.markAssessmentsSynced([id]);
            logger.log(`DatabaseContext: Assessment ${id} marked as synced after update`);
          }
        })
        .catch(error => {
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
    // Use React state (which has data from Firebase) instead of localStorage
    // This fixes issues when localStorage quota is exceeded
    return assessments.filter(record => record.studentId === studentId);
  };

  const getAssessmentsByGroup = async (groupId: string): Promise<AssessmentRecord[]> => {
    // Use React state (which has data from Firebase) instead of localStorage
    // This fixes issues when localStorage quota is exceeded
    return assessments.filter(record => record.groupId === groupId);
  };

  // Export to Admin operations
  const exportAssessmentToAdmin = async (assessmentId: string, trainerId: string): Promise<void> => {
    // Find assessment in React state (not localStorage which may be empty)
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Validate: Must be the creator
    if (assessment.trainerId !== trainerId) {
      throw new Error('Only the creator can export this assessment');
    }

    // Validate: Must not be already exported
    if (assessment.exportedToAdmin === true) {
      throw new Error('Assessment already exported');
    }

    // Create updated record
    const updatedAssessment: AssessmentRecord = {
      ...assessment,
      exportedToAdmin: true,
      exportedAt: new Date().toISOString(),
      exportedBy: trainerId,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: trainerId
    };

    // Update React state
    setAssessments(prev => prev.map(a => a.id === assessmentId ? updatedAssessment : a));

    // Try to save to localStorage (may fail due to quota)
    safeLocalStorageSet('assessments', JSON.stringify(
      assessments.map(a => a.id === assessmentId ? updatedAssessment : a)
    ));

    // Sync to Firebase
    FirebaseSyncService.syncAssessment(updatedAssessment)
      .then(synced => {
        if (synced) {
          logger.log(`Assessment ${assessmentId} exported and synced to Firebase`);
        }
      })
      .catch(error => {
        logger.error('Error syncing exported assessment to Firebase:', error);
      });

    logger.log(`Assessment ${assessmentId} exported to admin (locked)`);
  };

  const exportMultipleAssessmentsToAdmin = async (
    assessmentIds: string[],
    trainerId: string
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const id of assessmentIds) {
      try {
        await exportAssessmentToAdmin(id, trainerId);
        success++;
      } catch (error) {
        logger.error(`Failed to export assessment ${id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  };

  const adminExportAssessment = async (assessmentId: string, adminId: string): Promise<void> => {
    // Find assessment in React state (not localStorage which may be empty)
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Validate: Must not be already exported
    if (assessment.exportedToAdmin === true) {
      throw new Error('Assessment already exported');
    }

    // Create updated record (admin export uses same fields as trainer export)
    const updatedAssessment: AssessmentRecord = {
      ...assessment,
      exportedToAdmin: true,
      exportedAt: new Date().toISOString(),
      exportedBy: adminId,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: adminId
    };

    // Update React state
    setAssessments(prev => prev.map(a => a.id === assessmentId ? updatedAssessment : a));

    // Try to save to localStorage (may fail due to quota)
    safeLocalStorageSet('assessments', JSON.stringify(
      assessments.map(a => a.id === assessmentId ? updatedAssessment : a)
    ));

    // Sync to Firebase
    FirebaseSyncService.syncAssessment(updatedAssessment)
      .then(synced => {
        if (synced) {
          logger.log(`Assessment ${assessmentId} admin-exported and synced to Firebase`);
        }
      })
      .catch(error => {
        logger.error('Error syncing admin-exported assessment to Firebase:', error);
      });
  };

  const unlockAssessment = async (assessmentId: string, adminId: string): Promise<void> => {
    // Find assessment in React state (not localStorage which may be empty)
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Only unlock if currently exported
    if (assessment.exportedToAdmin !== true) {
      throw new Error('Assessment is not locked');
    }

    // Create updated record
    const updatedAssessment: AssessmentRecord = {
      ...assessment,
      exportedToAdmin: false,
      exportedAt: undefined,
      exportedBy: undefined,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: adminId
    };

    // Update React state
    setAssessments(prev => prev.map(a => a.id === assessmentId ? updatedAssessment : a));

    // Try to save to localStorage (may fail due to quota)
    safeLocalStorageSet('assessments', JSON.stringify(
      assessments.map(a => a.id === assessmentId ? updatedAssessment : a)
    ));

    // Sync to Firebase
    FirebaseSyncService.syncAssessment(updatedAssessment)
      .then(synced => {
        if (synced) {
          logger.log(`Assessment ${assessmentId} unlocked and synced to Firebase`);
        }
      })
      .catch(error => {
        logger.error('Error syncing unlocked assessment to Firebase:', error);
      });
  };

  const getExportedAssessments = async (): Promise<AssessmentRecord[]> => {
    // Use React state instead of localStorage (which may be empty due to quota)
    return assessments.filter(a => a.exportedToAdmin === true);
  };

  const getDraftAssessments = async (trainerId: string): Promise<AssessmentRecord[]> => {
    // Use React state instead of localStorage (which may be empty due to quota)
    return assessments.filter(a => a.trainerId === trainerId && a.exportedToAdmin !== true);
  };

  const markAssessmentReviewedByAdmin = async (assessmentId: string, adminId: string): Promise<void> => {
    // Find assessment in React state (not localStorage which may be empty)
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Create updated record
    const updatedAssessment: AssessmentRecord = {
      ...assessment,
      reviewedByAdmin: true,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminId
    };

    // Update React state
    setAssessments(prev => prev.map(a => a.id === assessmentId ? updatedAssessment : a));

    // Try to save to localStorage (may fail due to quota)
    safeLocalStorageSet('assessments', JSON.stringify(
      assessments.map(a => a.id === assessmentId ? updatedAssessment : a)
    ));

    // Sync to Firebase
    FirebaseSyncService.syncAssessment(updatedAssessment)
      .then(synced => {
        if (synced) {
          logger.log(`Assessment ${assessmentId} marked as reviewed and synced to Firebase`);
        }
      })
      .catch(error => {
        logger.error('Error syncing reviewed assessment to Firebase:', error);
      });
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
    syncProgress,

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
    adminExportAssessment,
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
