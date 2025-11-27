import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';
import { logger } from '../utils/logger';
import { STORAGE_KEYS } from '../constants';

/**
 * Safely saves data to localStorage with quota exceeded error handling.
 * Throws a user-friendly error message when storage quota is exceeded.
 */
function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' // Firefox
    )) {
      logger.error('Storage quota exceeded:', error);
      throw new Error(
        'Storage quota exceeded. Your browser storage is full. ' +
        'Please clear some browser data or contact your administrator to export and clear old records.'
      );
    }
    throw error;
  }
}

class DatabaseService {
  private studentsKey = STORAGE_KEYS.STUDENTS;
  private groupsKey = STORAGE_KEYS.GROUPS;
  private attendanceKey = STORAGE_KEYS.ATTENDANCE;
  private assessmentsKey = STORAGE_KEYS.ASSESSMENTS;

  async initDatabase(): Promise<void> {
    try {
      // Initialize with empty arrays if they don't exist
      const students = localStorage.getItem(this.studentsKey);
      if (!students) {
        // Start with empty students array for production
        safeLocalStorageSet(this.studentsKey, JSON.stringify([]));
      }

      // Initialize groups with empty array if they don't exist
      // Groups are now managed manually through Admin Panel (custom groups)
      const groups = localStorage.getItem(this.groupsKey);
      if (!groups) {
        safeLocalStorageSet(this.groupsKey, JSON.stringify([]));
      }

      const attendance = localStorage.getItem(this.attendanceKey);
      if (!attendance) {
        // Start with empty attendance array for production
        safeLocalStorageSet(this.attendanceKey, JSON.stringify([]));
      }

      const assessments = localStorage.getItem(this.assessmentsKey);
      if (!assessments) {
        safeLocalStorageSet(this.assessmentsKey, JSON.stringify([]));
      }
    } catch (error) {
      logger.error('Error initializing database:', error);
      throw error;
    }
  }

  // Group operations
  async addGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const groups = await this.getGroups();

    // Check for duplicate: same name and same year
    const duplicate = groups.find(g =>
      g.name.toLowerCase().trim() === group.name.toLowerCase().trim() &&
      g.year === group.year
    );

    if (duplicate) {
      logger.warn(`Group "${group.name}" for Year ${group.year} already exists - preventing duplicate`);
      throw new Error(`Group "${group.name}" already exists for Year ${group.year}. Please use a different name or delete the existing group first.`);
    }

    const id = `group-${Date.now()}`;
    const now = new Date().toISOString();

    const newGroup: Group = {
      ...group,
      id,
      createdAt: now,
      updatedAt: now
    };

    groups.push(newGroup);
    safeLocalStorageSet(this.groupsKey, JSON.stringify(groups));

    logger.log(`Group created: "${group.name}" (Year ${group.year})`);

    return id;
  }

  async getGroups(): Promise<Group[]> {
    const groups = localStorage.getItem(this.groupsKey);
    return groups ? JSON.parse(groups) : [];
  }

  async getGroupsByYear(year: number): Promise<Group[]> {
    const groups = await this.getGroups();
    // Groups are available for all years, so return all groups regardless of year
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    const groups = await this.getGroups();
    const index = groups.findIndex(g => g.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
      safeLocalStorageSet(this.groupsKey, JSON.stringify(groups));
    }
  }

  async deleteGroup(id: string): Promise<void> {
    // Delete the group and all related data
    const groups = await this.getGroups();
    const filteredGroups = groups.filter(g => g.id !== id);
    safeLocalStorageSet(this.groupsKey, JSON.stringify(filteredGroups));

    // Also delete related students, attendance and assessment records
    await this.deleteStudentsByGroup(id);
    await this.deleteAttendanceByGroup(id);
    await this.deleteAssessmentsByGroup(id);
  }

  // Student operations
  async addStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const students = await this.getStudents();
    const groups = await this.getGroups();
    const groupMap = new Map(groups.map(g => [g.id, g.name]));
    
    // Check for duplicates by name (case-insensitive)
    const normalizedName = student.name.toLowerCase().trim();
    const existingStudent = students.find(s => 
      s.name.toLowerCase().trim() === normalizedName &&
      s.year === student.year &&
      s.groupId === student.groupId
    );
    
    if (existingStudent) {
      const groupName = groupMap.get(student.groupId) || student.groupId;
      throw new Error(`Student "${student.name}" already exists in Year ${student.year}, ${groupName}`);
    }
    
    // Check for duplicate student ID if provided
    if (student.studentId) {
      const existingById = students.find(s => s.studentId === student.studentId);
      if (existingById) {
        throw new Error(`Student ID "${student.studentId}" already exists`);
      }
    }
    
    const id = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newStudent: Student = {
      ...student,
      id,
      createdAt: now,
      updatedAt: now
    };

    students.push(newStudent);
    safeLocalStorageSet(this.studentsKey, JSON.stringify(students));

    return id;
  }

  // Add multiple students with duplicate checking
  async addStudents(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ added: number; skipped: number; errors: string[] }> {
    const existingStudents = await this.getStudents();
    const groups = await this.getGroups();
    const groupMap = new Map(groups.map(g => [g.id, g.name]));
    // Create reverse map: groupName (lowercase) -> groupId for flexible matching
    const groupNameToIdMap = new Map(groups.map(g => [g.name.toLowerCase().trim(), g.id]));
    const addedStudents: Student[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const student of students) {
      try {
        // Try to resolve group ID if user provided a group name instead
        let resolvedGroupId = student.groupId;

        // Check if the provided value is a group ID (exists in groupMap)
        if (!groupMap.has(student.groupId)) {
          // Not a valid ID, try to match by name
          const normalizedInput = student.groupId.toLowerCase().trim();
          const matchedGroupId = groupNameToIdMap.get(normalizedInput);

          if (matchedGroupId) {
            // Found a match by name, use the actual group ID
            resolvedGroupId = matchedGroupId;
          }
        }

        // Update student with resolved group ID
        const studentWithResolvedGroup = { ...student, groupId: resolvedGroupId };

        // Check for duplicates by name (case-insensitive)
        const normalizedName = studentWithResolvedGroup.name.toLowerCase().trim();
        const existingStudent = existingStudents.find(s =>
          s.name.toLowerCase().trim() === normalizedName &&
          s.year === studentWithResolvedGroup.year &&
          s.groupId === studentWithResolvedGroup.groupId
        );

        if (existingStudent) {
          skipped++;
          const groupName = groupMap.get(studentWithResolvedGroup.groupId) || studentWithResolvedGroup.groupId;
          errors.push(`Skipped "${studentWithResolvedGroup.name}" - already exists in Year ${studentWithResolvedGroup.year}, ${groupName}`);
          continue;
        }

        // Check for duplicate student ID if provided
        if (studentWithResolvedGroup.studentId) {
          const existingById = existingStudents.find(s => s.studentId === studentWithResolvedGroup.studentId);
          if (existingById) {
            skipped++;
            errors.push(`Skipped "${studentWithResolvedGroup.name}" - Student ID "${studentWithResolvedGroup.studentId}" already exists`);
            continue;
          }
        }

        // Check against students we're about to add
        const duplicateInBatch = addedStudents.find(s =>
          s.name.toLowerCase().trim() === normalizedName &&
          s.year === studentWithResolvedGroup.year &&
          s.groupId === studentWithResolvedGroup.groupId
        );

        if (duplicateInBatch) {
          skipped++;
          errors.push(`Skipped "${studentWithResolvedGroup.name}" - duplicate in import file`);
          continue;
        }

        // Validate that the group exists in Firebase (after resolution)
        if (!groupMap.has(studentWithResolvedGroup.groupId)) {
          skipped++;
          errors.push(`Skipped "${studentWithResolvedGroup.name}" - Group "${student.groupId}" does not exist. Please create the group in Admin Panel → Group Management first.`);
          continue;
        }

        const id = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newStudent: Student = {
          ...studentWithResolvedGroup,
          id,
          createdAt: now,
          updatedAt: now
        };
        
        addedStudents.push(newStudent);
        existingStudents.push(newStudent); // Add to existing list for next iteration
        
      } catch (error) {
        skipped++;
        errors.push(`Error adding "${student.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Save all added students at once
    if (addedStudents.length > 0) {
      // Use the existingStudents array which already has the new students added
      safeLocalStorageSet(this.studentsKey, JSON.stringify(existingStudents));
    }
    
    return {
      added: addedStudents.length,
      skipped,
      errors
    };
  }

  async getStudents(): Promise<Student[]> {
    const students = localStorage.getItem(this.studentsKey);
    return students ? JSON.parse(students) : [];
  }

  async getStudentsByGroup(groupId: string): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter(student => student.groupId === groupId).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getStudentsByYear(year: number): Promise<Student[]> {
    const students = await this.getStudents();
    return students.filter(student => student.year === year).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Debug method to get student summary
  async getStudentsSummary(): Promise<{ total: number; byYear: { [year: number]: number }; byGroup: { [groupId: string]: number } }> {
    const students = await this.getStudents();
    const groups = await this.getGroups();
    const groupMap = new Map(groups.map(g => [g.id, g.name]));
    
    const byYear: { [year: number]: number } = {};
    const byGroup: { [groupId: string]: number } = {};
    
    students.forEach(student => {
      byYear[student.year] = (byYear[student.year] || 0) + 1;
      byGroup[student.groupId] = (byGroup[student.groupId] || 0) + 1;
    });
    
    return {
      total: students.length,
      byYear,
      byGroup
    };
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<void> {
    const students = await this.getStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index] = { ...students[index], ...updates, updatedAt: new Date().toISOString() };
      safeLocalStorageSet(this.studentsKey, JSON.stringify(students));
    }
  }

  async deleteStudent(id: string): Promise<void> {
    const students = await this.getStudents();
    const filteredStudents = students.filter(s => s.id !== id);
    safeLocalStorageSet(this.studentsKey, JSON.stringify(filteredStudents));
    
    // Also delete related attendance and assessment records
    await this.deleteAttendanceByStudent(id);
    await this.deleteAssessmentsByStudent(id);
  }

  async deleteStudentsByGroup(groupId: string): Promise<void> {
    const students = await this.getStudents();
    const filteredStudents = students.filter(s => s.groupId !== groupId);
    safeLocalStorageSet(this.studentsKey, JSON.stringify(filteredStudents));
  }

  // Attendance operations
  async addAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = `attendance-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRecord: AttendanceRecord = {
      ...record,
      id,
      timestamp,
      synced: false // Mark as unsynced initially
    };

    const attendance = await this.getAttendanceRecords();
    attendance.push(newRecord);
    safeLocalStorageSet(this.attendanceKey, JSON.stringify(attendance));

    return id;
  }

  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const attendance = localStorage.getItem(this.attendanceKey);
    return attendance ? JSON.parse(attendance) : [];
  }

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendanceRecords();
    return attendance.filter(record => record.date === date);
  }

  async getAttendanceByStudent(studentId: string): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendanceRecords();
    return attendance.filter(record => record.studentId === studentId);
  }

  async getAttendanceByGroup(groupId: string, date?: string): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendanceRecords();
    let filtered = attendance.filter(record => record.groupId === groupId);
    if (date) {
      filtered = filtered.filter(record => record.date === date);
    }
    return filtered;
  }

  async updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const index = attendance.findIndex(r => r.id === id);
    if (index !== -1) {
      attendance[index] = { ...attendance[index], ...updates };
      safeLocalStorageSet(this.attendanceKey, JSON.stringify(attendance));
    }
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const filteredAttendance = attendance.filter(r => r.id !== id);
    safeLocalStorageSet(this.attendanceKey, JSON.stringify(filteredAttendance));
  }

  async deleteAttendanceByStudent(studentId: string): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const filteredAttendance = attendance.filter(r => r.studentId !== studentId);
    safeLocalStorageSet(this.attendanceKey, JSON.stringify(filteredAttendance));
  }

  async deleteAttendanceByGroup(groupId: string): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const filteredAttendance = attendance.filter(r => r.groupId !== groupId);
    safeLocalStorageSet(this.attendanceKey, JSON.stringify(filteredAttendance));
  }

  // Assessment operations
  async addAssessmentRecord(record: Omit<AssessmentRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = `assessment-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRecord: AssessmentRecord = {
      ...record,
      id,
      timestamp,
      synced: false, // Mark as unsynced initially

      // Initialize export fields
      exportedToAdmin: false,
      editCount: 0,
      lastEditedAt: timestamp,
      lastEditedBy: record.trainerId
    };

    const assessments = await this.getAssessmentRecords();
    assessments.push(newRecord);
    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));

    return id;
  }

  async getAssessmentRecords(): Promise<AssessmentRecord[]> {
    const assessments = localStorage.getItem(this.assessmentsKey);
    return assessments ? JSON.parse(assessments) : [];
  }

  async getAssessmentsByStudent(studentId: string): Promise<AssessmentRecord[]> {
    const assessments = await this.getAssessmentRecords();
    return assessments.filter(record => record.studentId === studentId);
  }

  async getAssessmentsByGroup(groupId: string): Promise<AssessmentRecord[]> {
    const assessments = await this.getAssessmentRecords();
    return assessments.filter(record => record.groupId === groupId);
  }

  async updateAssessmentRecord(id: string, updates: Partial<AssessmentRecord>): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const index = assessments.findIndex(r => r.id === id);
    if (index !== -1) {
      assessments[index] = { ...assessments[index], ...updates };
      safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
    }
  }

  async deleteAssessmentRecord(id: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.id !== id);
    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(filteredAssessments));
  }

  async deleteAssessmentsByStudent(studentId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.studentId !== studentId);
    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(filteredAssessments));
  }

  async deleteAssessmentsByGroup(groupId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.groupId !== groupId);
    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(filteredAssessments));
  }

  // Export to Admin operations
  async exportAssessmentToAdmin(assessmentId: string, trainerId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const index = assessments.findIndex(a => a.id === assessmentId);

    if (index === -1) {
      throw new Error('Assessment not found');
    }

    const assessment = assessments[index];

    // Validate: Must be the creator
    if (assessment.trainerId !== trainerId) {
      throw new Error('Only the creator can export this assessment');
    }

    // Validate: Must not be already exported
    if (assessment.exportedToAdmin === true) {
      throw new Error('Assessment already exported');
    }

    // Mark as exported (LOCK IT)
    assessments[index] = {
      ...assessment,
      exportedToAdmin: true,
      exportedAt: new Date().toISOString(),
      exportedBy: trainerId,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: trainerId
    };

    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
    logger.log(`Assessment ${assessmentId} exported to admin (locked)`);
  }

  // Admin can export any draft assessment (for orphaned drafts)
  async adminExportAssessment(assessmentId: string, adminId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const index = assessments.findIndex(a => a.id === assessmentId);

    if (index === -1) {
      throw new Error('Assessment not found');
    }

    const assessment = assessments[index];

    // Validate: Must not be already exported
    if (assessment.exportedToAdmin === true) {
      throw new Error('Assessment already exported');
    }

    // Mark as exported by admin
    assessments[index] = {
      ...assessment,
      exportedToAdmin: true,
      exportedAt: new Date().toISOString(),
      exportedBy: adminId,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: adminId
    };

    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
    logger.log(`Assessment ${assessmentId} exported by admin ${adminId}`);
  }

  async exportMultipleAssessmentsToAdmin(
    assessmentIds: string[],
    trainerId: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of assessmentIds) {
      try {
        await this.exportAssessmentToAdmin(id, trainerId);
        success++;
      } catch (error) {
        logger.error(`Failed to export ${id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  async unlockAssessment(assessmentId: string, adminId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const index = assessments.findIndex(a => a.id === assessmentId);

    if (index === -1) {
      throw new Error('Assessment not found');
    }

    const assessment = assessments[index];

    // Only unlock if currently exported
    if (assessment.exportedToAdmin !== true) {
      throw new Error('Assessment is not locked');
    }

    assessments[index] = {
      ...assessment,
      exportedToAdmin: false,
      exportedAt: undefined,
      exportedBy: undefined,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: adminId
    };

    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
    logger.log(`Assessment ${assessmentId} unlocked by admin ${adminId}`);
  }

  async getExportedAssessments(): Promise<AssessmentRecord[]> {
    const assessments = await this.getAssessmentRecords();
    return assessments.filter(a => a.exportedToAdmin === true);
  }

  async getDraftAssessments(trainerId: string): Promise<AssessmentRecord[]> {
    const assessments = await this.getAssessmentRecords();
    return assessments.filter(a => a.trainerId === trainerId && a.exportedToAdmin !== true);
  }

  async markAssessmentReviewedByAdmin(
    assessmentId: string,
    adminId: string
  ): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const index = assessments.findIndex(a => a.id === assessmentId);

    if (index !== -1) {
      assessments[index] = {
        ...assessments[index],
        reviewedByAdmin: true,
        reviewedAt: new Date().toISOString(),
        reviewedBy: adminId
      };

      safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
      logger.log(`Assessment ${assessmentId} marked as reviewed by admin ${adminId}`);
    }
  }

  // Sync operations
  async getUnsyncedRecords(): Promise<{
    groups: Group[];
    students: Student[];
    attendance: AttendanceRecord[];
    assessments: AssessmentRecord[];
  }> {
    const groups = await this.getGroups();
    const students = await this.getStudents();
    const attendance = await this.getAttendanceRecords();
    const assessments = await this.getAssessmentRecords();
    
    return {
      groups,
      students,
      attendance: attendance.filter(r => !r.synced),
      assessments: assessments.filter(r => !r.synced)
    };
  }

  async markAttendanceSynced(ids: string[]): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    attendance.forEach(record => {
      if (ids.includes(record.id)) {
        record.synced = true;
      }
    });
    safeLocalStorageSet(this.attendanceKey, JSON.stringify(attendance));
  }

  async markAssessmentsSynced(ids: string[]): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    assessments.forEach(record => {
      if (ids.includes(record.id)) {
        record.synced = true;
      }
    });
    safeLocalStorageSet(this.assessmentsKey, JSON.stringify(assessments));
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    localStorage.removeItem(this.groupsKey);
    localStorage.removeItem(this.studentsKey);
    localStorage.removeItem(this.attendanceKey);
    localStorage.removeItem(this.assessmentsKey);
  }

  // Clear only students data
  async clearStudentsData(): Promise<void> {
    localStorage.removeItem(this.studentsKey);
  }

  // Ensure all 30 groups exist (add missing ones if needed)
  async ensureAllGroupsExist(): Promise<void> {
    const existingGroups = await this.getGroups();
    const existingGroupIds = new Set(existingGroups.map(g => g.id));
    
    const allGroups: Group[] = [];
    
    // Generate all groups 1-30 - always available for all years
    for (let i = 1; i <= 30; i++) {
      const groupId = `group-${i}`;
      
      // If group already exists, use it; otherwise create new one
      if (existingGroupIds.has(groupId)) {
        const existingGroup = existingGroups.find(g => g.id === groupId);
        if (existingGroup) {
          // Update existing group to ensure it's available for all years
          allGroups.push({
            ...existingGroup,
            year: 1, // Set to year 1 but available for all years
            description: `Group ${i} - Available for all years`,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // Create new group - available for all years
        const description = `Group ${i} - Available for all years`;
        
        allGroups.push({
          id: groupId,
          name: `Group${i}`,
          year: 1, // Set to year 1 but available for all years
          description: description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    
    // Save all groups (existing + new)
    safeLocalStorageSet(this.groupsKey, JSON.stringify(allGroups));
  }

  // Legacy method - no longer auto-generates groups
  // Groups are now created manually by admin through Group Management UI
  async updateGroupsToFullSet(): Promise<void> {
    // This method is kept for backward compatibility but does nothing
    // Admin can create custom groups through the UI instead
    logger.log('updateGroupsToFullSet called - groups are now managed manually');
  }

  // Bulk update current unit for all groups in a specific year
  async bulkUpdateCurrentUnit(year: number, currentUnit: string): Promise<number> {
    const groups = await this.getGroups();
    let updatedCount = 0;

    const updatedGroups = groups.map(group => {
      if (group.year === year) {
        updatedCount++;
        return {
          ...group,
          currentUnit: currentUnit || undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return group;
    });

    safeLocalStorageSet(this.groupsKey, JSON.stringify(updatedGroups));
    return updatedCount;
  }
}

export default new DatabaseService();


