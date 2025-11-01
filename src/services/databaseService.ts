import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';

class DatabaseService {
  private studentsKey = 'students';
  private groupsKey = 'groups';
  private attendanceKey = 'attendance';
  private assessmentsKey = 'assessments';

  async initDatabase(): Promise<void> {
    try {
      // Initialize with empty arrays if they don't exist
      const students = localStorage.getItem(this.studentsKey);
      if (!students) {
        // Start with empty students array for production
        localStorage.setItem(this.studentsKey, JSON.stringify([]));
      }
      
      // Always ensure we have all 30 groups available
      await this.ensureAllGroupsExist();
      
      const attendance = localStorage.getItem(this.attendanceKey);
      if (!attendance) {
        // Start with empty attendance array for production
        localStorage.setItem(this.attendanceKey, JSON.stringify([]));
      }
      
      const assessments = localStorage.getItem(this.assessmentsKey);
      if (!assessments) {
        localStorage.setItem(this.assessmentsKey, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Group operations
  async addGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `group-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newGroup: Group = {
      ...group,
      id,
      createdAt: now,
      updatedAt: now
    };

    const groups = await this.getGroups();
    groups.push(newGroup);
    localStorage.setItem(this.groupsKey, JSON.stringify(groups));

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
      localStorage.setItem(this.groupsKey, JSON.stringify(groups));
    }
  }

  async deleteGroup(id: string): Promise<void> {
    // Don't actually delete the group - just clear its data
    // Groups should be persistent and available for all years
    
    // Only delete related students, attendance and assessment records
    await this.deleteStudentsByGroup(id);
    await this.deleteAttendanceByGroup(id);
    await this.deleteAssessmentsByGroup(id);
    
    // Ensure the group still exists in the system
    await this.ensureAllGroupsExist();
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
    localStorage.setItem(this.studentsKey, JSON.stringify(students));

    return id;
  }

  // Add multiple students with duplicate checking
  async addStudents(students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ added: number; skipped: number; errors: string[] }> {
    const existingStudents = await this.getStudents();
    const groups = await this.getGroups();
    const groupMap = new Map(groups.map(g => [g.id, g.name]));
    const addedStudents: Student[] = [];
    const errors: string[] = [];
    let skipped = 0;
    
    for (const student of students) {
      try {
        // Check for duplicates by name (case-insensitive)
        const normalizedName = student.name.toLowerCase().trim();
        const existingStudent = existingStudents.find(s => 
          s.name.toLowerCase().trim() === normalizedName &&
          s.year === student.year &&
          s.groupId === student.groupId
        );
        
        if (existingStudent) {
          skipped++;
          const groupName = groupMap.get(student.groupId) || student.groupId;
          errors.push(`Skipped "${student.name}" - already exists in Year ${student.year}, ${groupName}`);
          continue;
        }
        
        // Check for duplicate student ID if provided
        if (student.studentId) {
          const existingById = existingStudents.find(s => s.studentId === student.studentId);
          if (existingById) {
            skipped++;
            errors.push(`Skipped "${student.name}" - Student ID "${student.studentId}" already exists`);
            continue;
          }
        }
        
        // Check against students we're about to add
        const duplicateInBatch = addedStudents.find(s => 
          s.name.toLowerCase().trim() === normalizedName &&
          s.year === student.year &&
          s.groupId === student.groupId
        );
        
        if (duplicateInBatch) {
          skipped++;
          errors.push(`Skipped "${student.name}" - duplicate in import file`);
          continue;
        }
        
        const id = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        const newStudent: Student = {
          ...student,
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
      localStorage.setItem(this.studentsKey, JSON.stringify(existingStudents));
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
      localStorage.setItem(this.studentsKey, JSON.stringify(students));
    }
  }

  async deleteStudent(id: string): Promise<void> {
    const students = await this.getStudents();
    const filteredStudents = students.filter(s => s.id !== id);
    localStorage.setItem(this.studentsKey, JSON.stringify(filteredStudents));
    
    // Also delete related attendance and assessment records
    await this.deleteAttendanceByStudent(id);
    await this.deleteAssessmentsByStudent(id);
  }

  async deleteStudentsByGroup(groupId: string): Promise<void> {
    const students = await this.getStudents();
    const filteredStudents = students.filter(s => s.groupId !== groupId);
    localStorage.setItem(this.studentsKey, JSON.stringify(filteredStudents));
  }

  // Attendance operations
  async addAttendanceRecord(record: Omit<AttendanceRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = `attendance-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const newRecord: AttendanceRecord = {
      ...record,
      id,
      timestamp
    };

    const attendance = await this.getAttendanceRecords();
    attendance.push(newRecord);
    localStorage.setItem(this.attendanceKey, JSON.stringify(attendance));

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
      localStorage.setItem(this.attendanceKey, JSON.stringify(attendance));
    }
  }

  async deleteAttendanceByStudent(studentId: string): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const filteredAttendance = attendance.filter(r => r.studentId !== studentId);
    localStorage.setItem(this.attendanceKey, JSON.stringify(filteredAttendance));
  }

  async deleteAttendanceByGroup(groupId: string): Promise<void> {
    const attendance = await this.getAttendanceRecords();
    const filteredAttendance = attendance.filter(r => r.groupId !== groupId);
    localStorage.setItem(this.attendanceKey, JSON.stringify(filteredAttendance));
  }

  // Assessment operations
  async addAssessmentRecord(record: Omit<AssessmentRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = `assessment-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const newRecord: AssessmentRecord = {
      ...record,
      id,
      timestamp
    };

    const assessments = await this.getAssessmentRecords();
    assessments.push(newRecord);
    localStorage.setItem(this.assessmentsKey, JSON.stringify(assessments));

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
      localStorage.setItem(this.assessmentsKey, JSON.stringify(assessments));
    }
  }

  async deleteAssessmentRecord(id: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.id !== id);
    localStorage.setItem(this.assessmentsKey, JSON.stringify(filteredAssessments));
  }

  async deleteAssessmentsByStudent(studentId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.studentId !== studentId);
    localStorage.setItem(this.assessmentsKey, JSON.stringify(filteredAssessments));
  }

  async deleteAssessmentsByGroup(groupId: string): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    const filteredAssessments = assessments.filter(r => r.groupId !== groupId);
    localStorage.setItem(this.assessmentsKey, JSON.stringify(filteredAssessments));
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
    localStorage.setItem(this.attendanceKey, JSON.stringify(attendance));
  }

  async markAssessmentsSynced(ids: string[]): Promise<void> {
    const assessments = await this.getAssessmentRecords();
    assessments.forEach(record => {
      if (ids.includes(record.id)) {
        record.synced = true;
      }
    });
    localStorage.setItem(this.assessmentsKey, JSON.stringify(assessments));
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
    localStorage.setItem(this.groupsKey, JSON.stringify(allGroups));
  }

  // Update groups to include all Group1-Group30
  async updateGroupsToFullSet(): Promise<void> {
    const demoGroups: Group[] = [];
    
    // Generate groups 1-30 - available for all years
    for (let i = 1; i <= 30; i++) {
      const year = 1; // Default year, but groups are available for all years
      const description = `Group ${i} - Available for all years`;
      
      demoGroups.push({
        id: `group-${i}`,
        name: `Group${i}`,
        year: year,
        description: description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    localStorage.setItem(this.groupsKey, JSON.stringify(demoGroups));
  }
}

export default new DatabaseService();


