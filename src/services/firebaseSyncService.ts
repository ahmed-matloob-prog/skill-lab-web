/**
 * Firebase Sync Service
 * Handles bidirectional sync between localStorage and Firebase Firestore
 * Implements LocalStorage + Firebase Hybrid Architecture
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  onSnapshot,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db, isConfigured } from '../config/firebase';
import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';
import { logger } from '../utils/logger';

// Collection names
const COLLECTIONS = {
  STUDENTS: 'students',
  GROUPS: 'groups',
  ATTENDANCE: 'attendance',
  ASSESSMENTS: 'assessments',
  USERS: 'users'
} as const;

// Sync queue for offline operations
interface SyncQueueItem {
  collection: string;
  operation: 'create' | 'update' | 'delete';
  docId: string;
  data?: any;
  timestamp: number;
}

class FirebaseSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private listeners: Map<string, () => void> = new Map();

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.log('FirebaseSync: Network online - processing sync queue');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.log('FirebaseSync: Network offline - queuing operations');
    });

    // Load sync queue from localStorage
    this.loadSyncQueue();
  }

  /**
   * Check if Firebase is configured and available
   */
  isAvailable(): boolean {
    return isConfigured && db !== null;
  }

  /**
   * Get sync status
   */
  getSyncStatus(): 'online' | 'offline' | 'syncing' | 'error' {
    if (!this.isAvailable()) return 'offline';
    if (!this.isOnline) return 'offline';
    if (this.syncQueue.length > 0) return 'syncing';
    return 'online';
  }

  // ==================== SYNC QUEUE OPERATIONS ====================

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    try {
      const queueData = localStorage.getItem('firebase_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        logger.log(`FirebaseSync: Loaded ${this.syncQueue.length} queued operations`);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error loading sync queue:', error);
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem('firebase_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('FirebaseSync: Error saving sync queue:', error);
    }
  }

  /**
   * Add operation to sync queue
   */
  private queueOperation(
    collection: string,
    operation: 'create' | 'update' | 'delete',
    docId: string,
    data?: any
  ): void {
    this.syncQueue.push({
      collection,
      operation,
      docId,
      data,
      timestamp: Date.now()
    });
    this.saveSyncQueue();
  }

  /**
   * Process sync queue when online
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isAvailable() || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    logger.log(`FirebaseSync: Processing ${this.syncQueue.length} queued operations`);
    const queue = [...this.syncQueue];
    this.syncQueue = [];
    this.saveSyncQueue();

    for (const item of queue) {
      try {
        const collectionRef = collection(db!, item.collection);
        const docRef = doc(collectionRef, item.docId);

        switch (item.operation) {
          case 'create':
          case 'update':
            await setDoc(docRef, item.data, { merge: true });
            break;
          case 'delete':
            await deleteDoc(docRef);
            break;
        }

        logger.log(`FirebaseSync: Synced ${item.operation} for ${item.collection}/${item.docId}`);
      } catch (error) {
        logger.error(`FirebaseSync: Error syncing ${item.operation}:`, error);
        // Re-queue failed operation
        this.syncQueue.push(item);
      }
    }

    this.saveSyncQueue();
  }

  // ==================== STUDENT OPERATIONS ====================

  /**
   * Sync student to Firebase
   */
  async syncStudent(student: Student): Promise<void> {
    if (!this.isAvailable()) return;

    const studentData = {
      ...student,
      updatedAt: Timestamp.now()
    };

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.STUDENTS, student.id);
        await setDoc(docRef, studentData, { merge: true });
        logger.log(`FirebaseSync: Student synced - ${student.name}`);
      } else {
        this.queueOperation(COLLECTIONS.STUDENTS, 'update', student.id, studentData);
        logger.log(`FirebaseSync: Student queued - ${student.name}`);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error syncing student:', error);
      this.queueOperation(COLLECTIONS.STUDENTS, 'update', student.id, studentData);
    }
  }

  /**
   * Delete student from Firebase
   */
  async deleteStudent(studentId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.STUDENTS, studentId);
        await deleteDoc(docRef);
        logger.log(`FirebaseSync: Student deleted - ${studentId}`);
      } else {
        this.queueOperation(COLLECTIONS.STUDENTS, 'delete', studentId);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error deleting student:', error);
      this.queueOperation(COLLECTIONS.STUDENTS, 'delete', studentId);
    }
  }

  /**
   * Fetch all students from Firebase
   */
  async fetchStudents(): Promise<Student[]> {
    if (!this.isAvailable() || !this.isOnline) return [];

    try {
      const collectionRef = collection(db!, COLLECTIONS.STUDENTS);
      const snapshot = await getDocs(collectionRef);
      const students = snapshot.docs.map(doc => doc.data() as Student);
      logger.log(`FirebaseSync: Fetched ${students.length} students`);
      return students;
    } catch (error) {
      logger.error('FirebaseSync: Error fetching students:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time student updates
   */
  subscribeToStudents(callback: (students: Student[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    const collectionRef = collection(db!, COLLECTIONS.STUDENTS);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const students = snapshot.docs.map(doc => doc.data() as Student);
        logger.log(`FirebaseSync: Real-time update - ${students.length} students`);
        callback(students);
      },
      (error) => {
        logger.error('FirebaseSync: Error in students subscription:', error);
      }
    );

    this.listeners.set('students', unsubscribe);
    return unsubscribe;
  }

  // ==================== GROUP OPERATIONS ====================

  /**
   * Sync group to Firebase
   */
  async syncGroup(group: Group): Promise<void> {
    if (!this.isAvailable()) return;

    // Build group data, using deleteField() to remove currentUnit if it's undefined
    const groupData: Record<string, unknown> = {
      ...group,
      updatedAt: Timestamp.now()
    };

    // If currentUnit is undefined/empty, explicitly delete the field in Firebase
    if (!group.currentUnit) {
      groupData.currentUnit = deleteField();
    }

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.GROUPS, group.id);
        await setDoc(docRef, groupData, { merge: true });
        logger.log(`FirebaseSync: Group synced - ${group.name}`);
      } else {
        this.queueOperation(COLLECTIONS.GROUPS, 'update', group.id, groupData);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error syncing group:', error);
      this.queueOperation(COLLECTIONS.GROUPS, 'update', group.id, groupData);
    }
  }

  /**
   * Delete group from Firebase
   */
  async deleteGroup(groupId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.GROUPS, groupId);
        await deleteDoc(docRef);
        logger.log(`FirebaseSync: Group deleted - ${groupId}`);
      } else {
        this.queueOperation(COLLECTIONS.GROUPS, 'delete', groupId);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error deleting group:', error);
      this.queueOperation(COLLECTIONS.GROUPS, 'delete', groupId);
    }
  }

  /**
   * Fetch all groups from Firebase
   */
  async fetchGroups(): Promise<Group[]> {
    if (!this.isAvailable() || !this.isOnline) return [];

    try {
      const collectionRef = collection(db!, COLLECTIONS.GROUPS);
      const snapshot = await getDocs(collectionRef);
      const groups = snapshot.docs.map(doc => doc.data() as Group);
      logger.log(`FirebaseSync: Fetched ${groups.length} groups`);
      return groups;
    } catch (error) {
      logger.error('FirebaseSync: Error fetching groups:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time group updates
   */
  subscribeToGroups(callback: (groups: Group[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    const collectionRef = collection(db!, COLLECTIONS.GROUPS);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const groups = snapshot.docs.map(doc => doc.data() as Group);
        logger.log(`FirebaseSync: Real-time update - ${groups.length} groups`);
        callback(groups);
      },
      (error) => {
        logger.error('FirebaseSync: Error in groups subscription:', error);
      }
    );

    this.listeners.set('groups', unsubscribe);
    return unsubscribe;
  }

  // ==================== ATTENDANCE OPERATIONS ====================

  /**
   * Sync attendance record to Firebase
   */
  async syncAttendance(record: AttendanceRecord): Promise<void> {
    if (!this.isAvailable()) return;

    const attendanceData = {
      ...record,
      updatedAt: Timestamp.now()
    };

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.ATTENDANCE, record.id);
        await setDoc(docRef, attendanceData, { merge: true });
        logger.log(`FirebaseSync: Attendance synced - ${record.id}`);
      } else {
        this.queueOperation(COLLECTIONS.ATTENDANCE, 'update', record.id, attendanceData);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error syncing attendance:', error);
      this.queueOperation(COLLECTIONS.ATTENDANCE, 'update', record.id, attendanceData);
    }
  }

  /**
   * Fetch all attendance records from Firebase
   */
  async fetchAttendance(): Promise<AttendanceRecord[]> {
    if (!this.isAvailable() || !this.isOnline) return [];

    try {
      const collectionRef = collection(db!, COLLECTIONS.ATTENDANCE);
      const snapshot = await getDocs(collectionRef);
      const attendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      logger.log(`FirebaseSync: Fetched ${attendance.length} attendance records`);
      return attendance;
    } catch (error) {
      logger.error('FirebaseSync: Error fetching attendance:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time attendance updates
   */
  subscribeToAttendance(callback: (attendance: AttendanceRecord[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    const collectionRef = collection(db!, COLLECTIONS.ATTENDANCE);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const attendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
        logger.log(`FirebaseSync: Real-time update - ${attendance.length} attendance records`);
        callback(attendance);
      },
      (error) => {
        logger.error('FirebaseSync: Error in attendance subscription:', error);
      }
    );

    this.listeners.set('attendance', unsubscribe);
    return unsubscribe;
  }

  // ==================== ASSESSMENT OPERATIONS ====================

  /**
   * Sync assessment record to Firebase
   * Returns true if sync was successful (immediately synced to Firebase)
   */
  async syncAssessment(record: AssessmentRecord): Promise<boolean> {
    if (!this.isAvailable()) return false;

    const assessmentData = {
      ...record,
      updatedAt: Timestamp.now()
    };

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.ASSESSMENTS, record.id);
        await setDoc(docRef, assessmentData, { merge: true });
        logger.log(`FirebaseSync: Assessment synced - ${record.id}`);
        return true; // Successfully synced
      } else {
        this.queueOperation(COLLECTIONS.ASSESSMENTS, 'update', record.id, assessmentData);
        return false; // Queued, not immediately synced
      }
    } catch (error) {
      logger.error('FirebaseSync: Error syncing assessment:', error);
      this.queueOperation(COLLECTIONS.ASSESSMENTS, 'update', record.id, assessmentData);
      return false; // Failed, queued for retry
    }
  }

  /**
   * Delete assessment from Firebase
   */
  async deleteAssessment(assessmentId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      if (this.isOnline) {
        const docRef = doc(db!, COLLECTIONS.ASSESSMENTS, assessmentId);
        await deleteDoc(docRef);
        logger.log(`FirebaseSync: Assessment deleted - ${assessmentId}`);
      } else {
        this.queueOperation(COLLECTIONS.ASSESSMENTS, 'delete', assessmentId);
      }
    } catch (error) {
      logger.error('FirebaseSync: Error deleting assessment:', error);
      this.queueOperation(COLLECTIONS.ASSESSMENTS, 'delete', assessmentId);
    }
  }

  /**
   * Fetch all assessment records from Firebase
   */
  async fetchAssessments(): Promise<AssessmentRecord[]> {
    if (!this.isAvailable() || !this.isOnline) return [];

    try {
      const collectionRef = collection(db!, COLLECTIONS.ASSESSMENTS);
      const snapshot = await getDocs(collectionRef);
      const assessments = snapshot.docs.map(doc => doc.data() as AssessmentRecord);
      logger.log(`FirebaseSync: Fetched ${assessments.length} assessment records`);
      return assessments;
    } catch (error) {
      logger.error('FirebaseSync: Error fetching assessments:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time assessment updates
   */
  subscribeToAssessments(callback: (assessments: AssessmentRecord[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    const collectionRef = collection(db!, COLLECTIONS.ASSESSMENTS);

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const assessments = snapshot.docs.map(doc => doc.data() as AssessmentRecord);
        logger.log(`FirebaseSync: Real-time update - ${assessments.length} assessment records`);
        callback(assessments);
      },
      (error) => {
        logger.error('FirebaseSync: Error in assessments subscription:', error);
      }
    );

    this.listeners.set('assessments', unsubscribe);
    return unsubscribe;
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Sync all localStorage data to Firebase (initial sync)
   */
  async syncAllToFirebase(data: {
    students: Student[];
    groups: Group[];
    attendance: AttendanceRecord[];
    assessments: AssessmentRecord[];
  }): Promise<void> {
    if (!this.isAvailable() || !this.isOnline) {
      logger.log('FirebaseSync: Cannot sync - offline or not configured');
      return;
    }

    logger.log('FirebaseSync: Starting full sync to Firebase...');

    try {
      // Sync students
      for (const student of data.students) {
        await this.syncStudent(student);
      }

      // Sync groups
      for (const group of data.groups) {
        await this.syncGroup(group);
      }

      // Sync attendance
      for (const record of data.attendance) {
        await this.syncAttendance(record);
      }

      // Sync assessments
      for (const record of data.assessments) {
        await this.syncAssessment(record);
      }

      logger.log('FirebaseSync: Full sync completed');
    } catch (error) {
      logger.error('FirebaseSync: Error in full sync:', error);
      throw error;
    }
  }

  /**
   * Fetch all data from Firebase
   */
  async fetchAllFromFirebase(): Promise<{
    students: Student[];
    groups: Group[];
    attendance: AttendanceRecord[];
    assessments: AssessmentRecord[];
  }> {
    if (!this.isAvailable() || !this.isOnline) {
      return { students: [], groups: [], attendance: [], assessments: [] };
    }

    logger.log('FirebaseSync: Fetching all data from Firebase...');

    try {
      const [students, groups, attendance, assessments] = await Promise.all([
        this.fetchStudents(),
        this.fetchGroups(),
        this.fetchAttendance(),
        this.fetchAssessments()
      ]);

      logger.log('FirebaseSync: Fetch completed', {
        students: students.length,
        groups: groups.length,
        attendance: attendance.length,
        assessments: assessments.length
      });

      return { students, groups, attendance, assessments };
    } catch (error) {
      logger.error('FirebaseSync: Error fetching all data:', error);
      return { students: [], groups: [], attendance: [], assessments: [] };
    }
  }

  /**
   * Unsubscribe from all real-time listeners
   */
  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe, key) => {
      logger.log(`FirebaseSync: Unsubscribing from ${key}`);
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Get pending sync queue count
   */
  getPendingSyncCount(): number {
    return this.syncQueue.length;
  }
}

// Export singleton instance
export default new FirebaseSyncService();
