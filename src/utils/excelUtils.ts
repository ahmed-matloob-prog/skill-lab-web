import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Student, Group, AttendanceRecord, AssessmentRecord } from '../types';

// Excel Import Functions
export const importStudentsFromExcel = (file: File): Promise<{
  students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        const errors: string[] = [];
        const seenNames = new Set<string>();
        const seenIds = new Set<string>();

        jsonData.forEach((row: any, index: number) => {
          const rowNumber = index + 2; // +2 because Excel is 1-indexed and we skip header
          
          try {
            
            // Get student name from various possible column names
            const studentName = row.name || row['Student Name'] || row['student name'] || row['Name'] || row['NAME'] || row['StudentName'] || row['STUDENT NAME'];
            
            // Validate required fields - only Name, Year, and Group are mandatory
            if (!studentName) {
              errors.push(`Row ${rowNumber}: Student Name is required (look for columns: name, Student Name, Name)`);
              return;
            }

            // Get year from various possible column names
            const yearValue = row.year || row['Year'] || row['YEAR'] || row['Academic Year'] || row['Year Level'] || row['YEAR LEVEL'];
            const year = parseInt(yearValue);
            if (isNaN(year) || year < 1 || year > 6) {
              errors.push(`Row ${rowNumber}: Year must be a number between 1 and 6 (look for columns: year, Year, Academic Year). Found: "${yearValue}"`);
              return;
            }

            // Get group from various possible column names
            const groupValue = row.group || row['Group'] || row['GROUP'] || row['Group ID'] || row['GroupID'] || row.groupId || row['Group Name'] || row['GROUP NAME'];
            let groupId = '';
            
            if (groupValue) {
              const groupStr = groupValue.toString().trim();
              
              // Handle Group1, Group2, etc. format
              const groupMatch = groupStr.match(/^Group(\d+)$/i);
              if (groupMatch) {
                const groupNum = parseInt(groupMatch[1]);
                if (groupNum >= 1 && groupNum <= 30) {
                  groupId = `group-${groupNum}`;
                } else {
                  errors.push(`Row ${rowNumber}: Group must be Group1-Group30`);
                  return;
                }
              } else {
                // Handle group-1, group-2, etc. format
                const groupIdMatch = groupStr.match(/^group-(\d+)$/i);
                if (groupIdMatch) {
                  const groupNum = parseInt(groupIdMatch[1]);
                  if (groupNum >= 1 && groupNum <= 30) {
                    groupId = groupStr;
                  } else {
                    errors.push(`Row ${rowNumber}: Group ID must be group-1 to group-30`);
                    return;
                  }
                } else {
                  errors.push(`Row ${rowNumber}: Group must be in format Group1-Group30 or group-1-group-30`);
                  return;
                }
              }
            } else {
              errors.push(`Row ${rowNumber}: Group is required (look for columns: group, Group, Group ID)`);
              return;
            }

            // Validate email format if provided
            if (row.email && !isValidEmail(row.email)) {
              errors.push(`Row ${rowNumber}: Invalid email format`);
              return;
            }

            const finalStudentId = row.studentId || row['Student ID'] || row['StudentID'] ? 
              (row.studentId || row['Student ID'] || row['StudentID']).toString().trim() : 
              `ST${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`; // Auto-generate unique ID

            // Check for duplicates within the same file
            const normalizedName = studentName.toString().trim().toLowerCase();
            
            // Check for duplicate names (case-insensitive, trimmed)
            if (seenNames.has(normalizedName)) {
              errors.push(`Row ${rowNumber}: Duplicate student name "${studentName}" found in the same file`);
              return;
            }
            
            // Check for duplicate IDs (only if provided, not auto-generated)
            const providedStudentId = row.studentId || row['Student ID'] || row['StudentID'];
            if (providedStudentId && seenIds.has(providedStudentId.toString().trim())) {
              errors.push(`Row ${rowNumber}: Duplicate student ID "${providedStudentId}" found in the same file`);
              return;
            }

            seenNames.add(normalizedName);
            if (providedStudentId) {
              seenIds.add(providedStudentId.toString().trim());
            }

            const student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
              name: studentName.toString().trim(),
              studentId: finalStudentId,
              email: row.email || row['Email'] ? (row.email || row['Email']).toString().trim() : undefined,
              phone: row.phone || row['Phone'] ? (row.phone || row['Phone']).toString().trim() : undefined,
              year: year,
              groupId: groupId,
              unit: row.unit || row['Unit'] ? (row.unit || row['Unit']).toString().trim() : undefined,
            };

            students.push(student);
          } catch (error) {
            errors.push(`Row ${rowNumber}: Error processing data - ${error}`);
          }
        });

        resolve({ students, errors });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Excel Export Functions
export const exportStudentsToExcel = (students: Student[], groups: Group[]): void => {
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  const exportData = students.map(student => ({
    'Name': student.name,
    'Student ID': student.studentId,
    'Email': student.email || '',
    'Phone': student.phone || '',
    'Year': student.year,
    'Group': groupMap.get(student.groupId) || 'Unknown',
    'Group ID': student.groupId,
    'Created At': new Date(student.createdAt).toLocaleDateString(),
    'Updated At': new Date(student.updatedAt).toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Name
    { wch: 15 }, // Student ID
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 8 },  // Year
    { wch: 15 }, // Group
    { wch: 15 }, // Group ID
    { wch: 12 }, // Created At
    { wch: 12 }, // Updated At
  ];
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `students_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

export const exportAttendanceToExcel = (
  attendance: AttendanceRecord[], 
  students: Student[], 
  groups: Group[]
): void => {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  const exportData = attendance.map(record => {
    const student = studentMap.get(record.studentId);
    return {
      'Date': record.date,
      'Student Name': student?.name || 'Unknown',
      'Student ID': student?.studentId || 'Unknown',
      'Group': groupMap.get(record.groupId) || 'Unknown',
      'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
      'Notes': record.notes || '',
      'Recorded At': new Date(record.timestamp).toLocaleString(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Student Name
    { wch: 15 }, // Student ID
    { wch: 15 }, // Group
    { wch: 10 }, // Status
    { wch: 30 }, // Notes
    { wch: 20 }, // Recorded At
  ];
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `attendance_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

export const exportAssessmentsToExcel = (
  assessments: AssessmentRecord[], 
  students: Student[], 
  groups: Group[]
): void => {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  const exportData = assessments.map(record => {
    const student = studentMap.get(record.studentId);
    const percentage = Math.round((record.score / record.maxScore) * 100);
    
    return {
      'Date': record.date,
      'Student Name': student?.name || 'Unknown',
      'Student ID': student?.studentId || 'Unknown',
      'Group': groupMap.get(record.groupId) || 'Unknown',
      'Assessment Name': record.assessmentName,
      'Assessment Type': record.assessmentType.charAt(0).toUpperCase() + record.assessmentType.slice(1),
      'Score': record.score,
      'Max Score': record.maxScore,
      'Percentage': `${percentage}%`,
      'Notes': record.notes || '',
      'Recorded At': new Date(record.timestamp).toLocaleString(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessments');

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Student Name
    { wch: 15 }, // Student ID
    { wch: 15 }, // Group
    { wch: 25 }, // Assessment Name
    { wch: 15 }, // Assessment Type
    { wch: 8 },  // Score
    { wch: 10 }, // Max Score
    { wch: 12 }, // Percentage
    { wch: 30 }, // Notes
    { wch: 20 }, // Recorded At
  ];
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `assessments_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

// Utility Functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Combined Report Export (Attendance + Assessment) with detailed assessment scores
export const exportCombinedReportToExcel = (
  attendance: AttendanceRecord[], 
  assessments: AssessmentRecord[],
  students: Student[], 
  groups: Group[],
  year?: number
): void => {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  // Filter by year if specified
  const filteredStudents = year ? students.filter(s => s.year === year) : students;
  const filteredAttendance = year ? attendance.filter(a => a.year === year) : attendance;
  const filteredAssessments = year ? assessments.filter(a => a.year === year) : assessments;
  
  // Create detailed assessment data for each student
  const detailedExportData: any[] = [];
  
  filteredStudents.forEach(student => {
    // Get latest attendance record for this student
    const latestAttendance = filteredAttendance
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    // Get all assessments for this student, sorted by date
    const studentAssessments = filteredAssessments
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate average score
    const totalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
    const totalMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
    const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    
    // Count attendance
    const attendanceCount = filteredAttendance.filter(a => a.studentId === student.id).length;
    const presentCount = filteredAttendance.filter(a => a.studentId === student.id && (a.status === 'present' || a.status === 'late')).length;
    const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0;
    
    // If student has assessments, create a row for each assessment
    if (studentAssessments.length > 0) {
      studentAssessments.forEach((assessment, index) => {
        detailedExportData.push({
          'Student Name': student.name,
          'Student ID': student.studentId,
          'Email': student.email || '',
          'Phone': student.phone || '',
          'Year': student.year,
          'Group': groupMap.get(student.groupId) || 'Unknown',
          'Unit': student.unit || '',
          'Latest Attendance Date': latestAttendance ? latestAttendance.date : '',
          'Latest Attendance Status': latestAttendance ? latestAttendance.status.charAt(0).toUpperCase() + latestAttendance.status.slice(1) : '',
          'Total Attendance Records': attendanceCount,
          'Present/Late Count': presentCount,
          'Attendance Rate (%)': attendanceRate,
          'Total Assessments': studentAssessments.length,
          'Average Score (%)': averageScore,
          'Assessment Name': assessment.assessmentName,
          'Assessment Type': assessment.assessmentType.charAt(0).toUpperCase() + assessment.assessmentType.slice(1),
          'Assessment Date': assessment.date,
          'Week': assessment.week || '',
          'Score': assessment.score,
          'Max Score': assessment.maxScore,
          'Score Percentage': Math.round((assessment.score / assessment.maxScore) * 100),
          'Assessment Number': index + 1,
        });
      });
    } else {
      // If student has no assessments, create a single row
      detailedExportData.push({
        'Student Name': student.name,
        'Student ID': student.studentId,
        'Email': student.email || '',
        'Phone': student.phone || '',
        'Year': student.year,
        'Group': groupMap.get(student.groupId) || 'Unknown',
        'Unit': student.unit || '',
        'Latest Attendance Date': latestAttendance ? latestAttendance.date : '',
        'Latest Attendance Status': latestAttendance ? latestAttendance.status.charAt(0).toUpperCase() + latestAttendance.status.slice(1) : '',
        'Total Attendance Records': attendanceCount,
        'Present/Late Count': presentCount,
        'Attendance Rate (%)': attendanceRate,
        'Total Assessments': 0,
        'Average Score (%)': 0,
        'Assessment Name': '',
        'Assessment Type': '',
        'Assessment Date': '',
        'Week': '',
        'Score': '',
        'Max Score': '',
        'Score Percentage': '',
        'Assessment Number': '',
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(detailedExportData);
  const workbook = XLSX.utils.book_new();
  
  const sheetName = year ? `Year ${year} Detailed Report` : 'Detailed Combined Report';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Student Name
    { wch: 15 }, // Student ID
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 8 },  // Year
    { wch: 15 }, // Group
    { wch: 10 }, // Unit
    { wch: 18 }, // Latest Attendance Date
    { wch: 20 }, // Latest Attendance Status
    { wch: 20 }, // Total Attendance Records
    { wch: 18 }, // Present/Late Count
    { wch: 18 }, // Attendance Rate (%)
    { wch: 18 }, // Total Assessments
    { wch: 18 }, // Average Score (%)
    { wch: 25 }, // Assessment Name
    { wch: 15 }, // Assessment Type
    { wch: 15 }, // Assessment Date
    { wch: 8 },  // Week
    { wch: 8 },  // Score
    { wch: 10 }, // Max Score
    { wch: 15 }, // Score Percentage
    { wch: 15 }, // Assessment Number
  ];
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = year ? 
    `year_${year}_detailed_report_${new Date().toISOString().split('T')[0]}.xlsx` :
    `detailed_combined_report_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

// Template Generation - Simplified to essential columns only
export const downloadStudentTemplate = (): void => {
  const templateData = [
    {
      'Student Name': 'John Doe',
      'Year': 1,
      'Group': 'Section A',
    },
    {
      'Student Name': 'Jane Smith',
      'Year': 2,
      'Group': 'Morning Group',
    },
    {
      'Student Name': 'Ahmed Ali',
      'Year': 3,
      'Group': 'Advanced Class',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');

  // Add instructions sheet
  const instructionsData = [
    { 'Field': 'Student Name', 'Required': 'Yes', 'Description': 'Full name of the student' },
    { 'Field': 'Year', 'Required': 'Yes', 'Description': 'Academic year: 1, 2, 3, 4, 5, or 6' },
    { 'Field': 'Group', 'Required': 'Yes', 'Description': 'Group name - must match existing group name for the selected year (created in Admin Panel → Group Management)' },
    { 'Field': '', 'Required': '', 'Description': '' },
    { 'Field': 'Note', 'Required': '', 'Description': 'Student ID will be auto-generated' },
    { 'Field': 'Note', 'Required': '', 'Description': 'Units are assigned when recording attendance/assessments (students rotate through units)' },
    { 'Field': 'Note', 'Required': '', 'Description': 'Make sure groups are created in Admin Panel before importing students' },
  ];

  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Auto-size columns
  worksheet['!cols'] = [
    { wch: 25 }, // Student Name
    { wch: 8 },  // Year
    { wch: 20 }, // Group
  ];

  instructionsSheet['!cols'] = [
    { wch: 20 }, // Field
    { wch: 20 }, // Required
    { wch: 60 }, // Description
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  saveAs(data, 'student_import_template.xlsx');
};

// Simplified Report Export - Only shows: Student Name, Year, Unit, Group, Week, Score, Average Score
export const exportSimplifiedReportToExcel = (
  assessments: AssessmentRecord[],
  students: Student[], 
  groups: Group[],
  year?: number
): void => {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const groupMap = new Map(groups.map(g => [g.id, g.name]));
  
  // Filter by year if specified
  const filteredStudents = year ? students.filter(s => s.year === year) : students;
  const filteredAssessments = year ? assessments.filter(a => a.year === year) : assessments;
  
  // Create simplified report data
  const reportData: any[] = [];
  
  filteredStudents.forEach(student => {
    // Get all assessments for this student
    const studentAssessments = filteredAssessments
      .filter(a => a.studentId === student.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate average score
    const totalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
    const totalMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
    const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    
    // If student has assessments, create a row for each assessment
    if (studentAssessments.length > 0) {
      studentAssessments.forEach((assessment) => {
        reportData.push({
          'Student Name': student.name,
          'Year': student.year,
          'Unit': student.unit || '',
          'Group': groupMap.get(student.groupId) || 'Unknown',
          'Week': assessment.week || '',
          'Score': assessment.score,
          'Average Score': averageScore,
        });
      });
    } else {
      // If student has no assessments, create a single row
      reportData.push({
        'Student Name': student.name,
        'Year': student.year,
        'Unit': student.unit || '',
        'Group': groupMap.get(student.groupId) || 'Unknown',
        'Week': '',
        'Score': '',
        'Average Score': 0,
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  
  const sheetName = year ? `Year ${year} Report` : 'Student Report';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Student Name
    { wch: 8 },  // Year
    { wch: 10 }, // Unit
    { wch: 15 }, // Group
    { wch: 8 },  // Week
    { wch: 8 },  // Score
    { wch: 15 }, // Average Score
  ];
  worksheet['!cols'] = colWidths;

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = year ?
    `year_${year}_report_${new Date().toISOString().split('T')[0]}.xlsx` :
    `student_report_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

// Unit Weekly Performance Export with Trends and Visual Dashboard
// Option 3: Combined View with Trends (3 sheets)
// Option 4: Visual Dashboard with charts
export const exportUnitWeeklyPerformanceWithTrendsAndCharts = (
  unit: string,
  year: number,
  assessments: AssessmentRecord[],
  students: Student[],
  groups: Group[]
): void => {
  const groupMap = new Map(groups.map(g => [g.id, g.name]));

  // Filter for specific unit and year
  const unitStudents = students.filter(s =>
    s.unit === unit && s.year === year
  );

  const unitAssessments = assessments.filter(a =>
    a.year === year &&
    unitStudents.some(s => s.id === a.studentId)
  );

  // Get date range
  const assessmentDates = unitAssessments.map(a => new Date(a.date));
  const minDate = assessmentDates.length > 0
    ? new Date(Math.min(...assessmentDates.map(d => d.getTime())))
    : new Date();
  const maxDate = assessmentDates.length > 0
    ? new Date(Math.max(...assessmentDates.map(d => d.getTime())))
    : new Date();

  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dateRange = `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const workbook = XLSX.utils.book_new();

  // ============= SHEET 1: Student Details with Weekly Scores =============
  const studentDetailsData: any[] = [];

  // Add header row with export info
  studentDetailsData.push({
    'Student Name': `Unit Weekly Performance Report`,
    'Student ID': '',
    'Group': '',
    'Week 1': '',
    'Week 2': '',
    'Week 3': '',
    'Week 4': '',
    'Week 5': '',
    'Week 6': '',
    'Week 7': '',
    'Week 8': '',
    'Week 9': '',
    'Week 10': '',
    'Average Score': '',
    'Trend': '',
    'Performance': '',
  });

  studentDetailsData.push({
    'Student Name': `Unit: ${unit}`,
    'Student ID': `Year: ${year}`,
    'Group': `Date Range: ${dateRange}`,
    'Week 1': '',
    'Week 2': '',
    'Week 3': '',
    'Week 4': '',
    'Week 5': '',
    'Week 6': '',
    'Week 7': '',
    'Week 8': '',
    'Week 9': '',
    'Week 10': '',
    'Average Score': '',
    'Trend': '',
    'Performance': `Export Date: ${exportDate}`,
  });

  studentDetailsData.push({
    'Student Name': '',
    'Student ID': '',
    'Group': '',
    'Week 1': '',
    'Week 2': '',
    'Week 3': '',
    'Week 4': '',
    'Week 5': '',
    'Week 6': '',
    'Week 7': '',
    'Week 8': '',
    'Week 9': '',
    'Week 10': '',
    'Average Score': '',
    'Trend': '',
    'Performance': '',
  });

  unitStudents.forEach(student => {
    const studentAssessments = unitAssessments
      .filter(a => a.studentId === student.id)
      .sort((a, b) => (a.week || 0) - (b.week || 0));

    // Create week map with dates
    const weekScores: { [key: number]: { score: number, date: string } } = {};
    studentAssessments.forEach(assessment => {
      if (assessment.week) {
        const percentage = Math.round((assessment.score / assessment.maxScore) * 100);
        weekScores[assessment.week] = {
          score: percentage,
          date: assessment.date
        };
      }
    });

    // Calculate average
    const scores = Object.values(weekScores).map(w => w.score);
    const average = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    // Calculate trend
    let trend = '→ Stable';
    if (scores.length >= 3) {
      const firstThird = scores.slice(0, Math.ceil(scores.length / 3));
      const lastThird = scores.slice(-Math.ceil(scores.length / 3));
      const firstAvg = firstThird.reduce((sum, s) => sum + s, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, s) => sum + s, 0) / lastThird.length;

      if (lastAvg > firstAvg + 5) trend = '↑ Rising';
      else if (lastAvg < firstAvg - 5) trend = '↓ Falling';
    }

    // Performance status
    let performance = 'N/A';
    if (average >= 85) performance = 'Excellent';
    else if (average >= 75) performance = 'Good';
    else if (average >= 60) performance = 'Pass';
    else if (average > 0) performance = 'Need Improvement';

    const rowData: any = {
      'Student Name': student.name,
      'Student ID': student.studentId,
      'Group': groupMap.get(student.groupId) || 'Unknown',
    };

    // Add weekly scores with dates as tooltips
    for (let week = 1; week <= 10; week++) {
      if (weekScores[week]) {
        rowData[`Week ${week}`] = weekScores[week].score;
      } else {
        rowData[`Week ${week}`] = '';
      }
    }

    rowData['Average Score'] = average;
    rowData['Trend'] = trend;
    rowData['Performance'] = performance;

    studentDetailsData.push(rowData);
  });

  const sheet1 = XLSX.utils.json_to_sheet(studentDetailsData);

  // Auto-size columns for Sheet 1
  sheet1['!cols'] = [
    { wch: 25 }, // Student Name
    { wch: 15 }, // Student ID
    { wch: 15 }, // Group
    { wch: 10 }, // Week 1
    { wch: 10 }, // Week 2
    { wch: 10 }, // Week 3
    { wch: 10 }, // Week 4
    { wch: 10 }, // Week 5
    { wch: 10 }, // Week 6
    { wch: 10 }, // Week 7
    { wch: 10 }, // Week 8
    { wch: 10 }, // Week 9
    { wch: 10 }, // Week 10
    { wch: 15 }, // Average Score
    { wch: 12 }, // Trend
    { wch: 18 }, // Performance
  ];

  XLSX.utils.book_append_sheet(workbook, sheet1, 'Student Details');

  // ============= SHEET 2: Weekly Summary =============
  const weeklySummaryData: any[] = [];

  // Header with info
  weeklySummaryData.push({
    'Week': `Unit: ${unit} | Year: ${year}`,
    'Date Range': `Period: ${dateRange}`,
    'Students Assessed': '',
    'Average Score': '',
    'Highest Score': '',
    'Lowest Score': '',
    'Pass Rate (≥60%)': '',
    'Excellent Rate (≥85%)': `Export: ${exportDate}`,
  });

  weeklySummaryData.push({
    'Week': '',
    'Date Range': '',
    'Students Assessed': '',
    'Average Score': '',
    'Highest Score': '',
    'Lowest Score': '',
    'Pass Rate (≥60%)': '',
    'Excellent Rate (≥85%)': '',
  });

  // Calculate weekly statistics
  for (let week = 1; week <= 10; week++) {
    const weekAssessments = unitAssessments.filter(a => a.week === week);

    if (weekAssessments.length > 0) {
      const percentages = weekAssessments.map(a =>
        Math.round((a.score / a.maxScore) * 100)
      );

      const average = Math.round(
        percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      );
      const highest = Math.max(...percentages);
      const lowest = Math.min(...percentages);
      const passCount = percentages.filter(p => p >= 60).length;
      const excellentCount = percentages.filter(p => p >= 85).length;
      const passRate = Math.round((passCount / percentages.length) * 100);
      const excellentRate = Math.round((excellentCount / percentages.length) * 100);

      // Get date range for this week
      const weekDates = weekAssessments.map(a => new Date(a.date));
      const weekMinDate = new Date(Math.min(...weekDates.map(d => d.getTime())));
      const weekMaxDate = new Date(Math.max(...weekDates.map(d => d.getTime())));
      const weekDateRange = weekMinDate.getTime() === weekMaxDate.getTime()
        ? weekMinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `${weekMinDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekMaxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      weeklySummaryData.push({
        'Week': `Week ${week}`,
        'Date Range': weekDateRange,
        'Students Assessed': weekAssessments.length,
        'Average Score': average,
        'Highest Score': highest,
        'Lowest Score': lowest,
        'Pass Rate (≥60%)': `${passRate}%`,
        'Excellent Rate (≥85%)': `${excellentRate}%`,
      });
    }
  }

  const sheet2 = XLSX.utils.json_to_sheet(weeklySummaryData);

  // Auto-size columns for Sheet 2
  sheet2['!cols'] = [
    { wch: 12 }, // Week
    { wch: 20 }, // Date Range
    { wch: 18 }, // Students Assessed
    { wch: 15 }, // Average Score
    { wch: 15 }, // Highest Score
    { wch: 15 }, // Lowest Score
    { wch: 18 }, // Pass Rate
    { wch: 20 }, // Excellent Rate
  ];

  XLSX.utils.book_append_sheet(workbook, sheet2, 'Weekly Summary');

  // ============= SHEET 3: Statistics & Analysis =============
  const statsData: any[] = [];

  // Header
  statsData.push({
    'Metric': `Statistics & Analysis - ${unit} (Year ${year})`,
    'Value': `Export Date: ${exportDate}`,
    'Details': `Period: ${dateRange}`,
  });

  statsData.push({
    'Metric': '',
    'Value': '',
    'Details': '',
  });

  // Overall statistics
  const allScores = unitAssessments.map(a =>
    Math.round((a.score / a.maxScore) * 100)
  );

  if (allScores.length > 0) {
    const overallAverage = Math.round(
      allScores.reduce((sum, s) => sum + s, 0) / allScores.length
    );
    const overallHighest = Math.max(...allScores);
    const overallLowest = Math.min(...allScores);
    const totalPass = allScores.filter(s => s >= 60).length;
    const totalExcellent = allScores.filter(s => s >= 85).length;
    const overallPassRate = Math.round((totalPass / allScores.length) * 100);
    const overallExcellentRate = Math.round((totalExcellent / allScores.length) * 100);

    statsData.push({ 'Metric': '=== Overall Performance ===', 'Value': '', 'Details': '' });
    statsData.push({ 'Metric': 'Total Students', 'Value': unitStudents.length, 'Details': `Enrolled in ${unit}` });
    statsData.push({ 'Metric': 'Total Assessments', 'Value': unitAssessments.length, 'Details': 'All weeks combined' });
    statsData.push({ 'Metric': 'Overall Average Score', 'Value': `${overallAverage}%`, 'Details': 'Across all weeks' });
    statsData.push({ 'Metric': 'Highest Score', 'Value': `${overallHighest}%`, 'Details': 'Best performance' });
    statsData.push({ 'Metric': 'Lowest Score', 'Value': `${overallLowest}%`, 'Details': 'Needs attention' });
    statsData.push({ 'Metric': 'Pass Rate (≥60%)', 'Value': `${overallPassRate}%`, 'Details': `${totalPass} of ${allScores.length} assessments` });
    statsData.push({ 'Metric': 'Excellent Rate (≥85%)', 'Value': `${overallExcellentRate}%`, 'Details': `${totalExcellent} of ${allScores.length} assessments` });

    statsData.push({ 'Metric': '', 'Value': '', 'Details': '' });
    statsData.push({ 'Metric': '=== Performance Distribution ===', 'Value': '', 'Details': '' });

    const excellentCount = allScores.filter(s => s >= 85).length;
    const goodCount = allScores.filter(s => s >= 75 && s < 85).length;
    const passCount = allScores.filter(s => s >= 60 && s < 75).length;
    const needImprovementCount = allScores.filter(s => s < 60).length;

    statsData.push({
      'Metric': 'Excellent (≥85%)',
      'Value': excellentCount,
      'Details': `${Math.round((excellentCount / allScores.length) * 100)}% of total`
    });
    statsData.push({
      'Metric': 'Good (75-84%)',
      'Value': goodCount,
      'Details': `${Math.round((goodCount / allScores.length) * 100)}% of total`
    });
    statsData.push({
      'Metric': 'Pass (60-74%)',
      'Value': passCount,
      'Details': `${Math.round((passCount / allScores.length) * 100)}% of total`
    });
    statsData.push({
      'Metric': 'Need Improvement (<60%)',
      'Value': needImprovementCount,
      'Details': `${Math.round((needImprovementCount / allScores.length) * 100)}% of total`
    });

    // Top performers
    statsData.push({ 'Metric': '', 'Value': '', 'Details': '' });
    statsData.push({ 'Metric': '=== Top Performers ===', 'Value': '', 'Details': 'Students with highest averages' });

    const studentAverages = unitStudents.map(student => {
      const studentAssessments = unitAssessments.filter(a => a.studentId === student.id);
      const scores = studentAssessments.map(a => Math.round((a.score / a.maxScore) * 100));
      const average = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
      return { name: student.name, average, assessmentCount: scores.length };
    }).sort((a, b) => b.average - a.average);

    studentAverages.slice(0, 5).forEach((student, index) => {
      statsData.push({
        'Metric': `${index + 1}. ${student.name}`,
        'Value': `${student.average}%`,
        'Details': `${student.assessmentCount} assessments`,
      });
    });

    // Students needing attention
    statsData.push({ 'Metric': '', 'Value': '', 'Details': '' });
    statsData.push({ 'Metric': '=== Students Needing Attention ===', 'Value': '', 'Details': 'Average below 60%' });

    const needAttention = studentAverages.filter(s => s.average < 60 && s.assessmentCount > 0);
    if (needAttention.length > 0) {
      needAttention.forEach((student, index) => {
        statsData.push({
          'Metric': `${index + 1}. ${student.name}`,
          'Value': `${student.average}%`,
          'Details': `${student.assessmentCount} assessments`,
        });
      });
    } else {
      statsData.push({
        'Metric': 'All students performing well!',
        'Value': '✓',
        'Details': 'No students below 60% average',
      });
    }
  } else {
    statsData.push({
      'Metric': 'No assessment data available',
      'Value': 'N/A',
      'Details': `No assessments found for ${unit} Year ${year}`,
    });
  }

  const sheet3 = XLSX.utils.json_to_sheet(statsData);

  // Auto-size columns for Sheet 3
  sheet3['!cols'] = [
    { wch: 35 }, // Metric
    { wch: 15 }, // Value
    { wch: 35 }, // Details
  ];

  XLSX.utils.book_append_sheet(workbook, sheet3, 'Statistics & Analysis');

  // ============= SHEET 4: Visual Dashboard Data =============
  // This sheet contains data formatted for easy chart creation
  const chartData: any[] = [];

  chartData.push({
    'Chart Type': `Visual Dashboard - ${unit} (Year ${year})`,
    'Data': `Export: ${exportDate}`,
    'Notes': `Period: ${dateRange}`,
  });

  chartData.push({
    'Chart Type': '',
    'Data': '',
    'Notes': '',
  });

  chartData.push({
    'Chart Type': '=== Weekly Average Trend (Line Chart) ===',
    'Data': '',
    'Notes': 'Select Week and Average columns to create line chart',
  });

  chartData.push({
    'Chart Type': 'Week',
    'Data': 'Average Score',
    'Notes': 'Students Assessed',
  });

  for (let week = 1; week <= 10; week++) {
    const weekAssessments = unitAssessments.filter(a => a.week === week);
    if (weekAssessments.length > 0) {
      const percentages = weekAssessments.map(a =>
        Math.round((a.score / a.maxScore) * 100)
      );
      const average = Math.round(
        percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      );

      chartData.push({
        'Chart Type': `Week ${week}`,
        'Data': average,
        'Notes': weekAssessments.length,
      });
    }
  }

  chartData.push({
    'Chart Type': '',
    'Data': '',
    'Notes': '',
  });

  chartData.push({
    'Chart Type': '=== Performance Distribution (Pie Chart) ===',
    'Data': '',
    'Notes': 'Select Category and Count columns to create pie chart',
  });

  chartData.push({
    'Chart Type': 'Category',
    'Data': 'Count',
    'Notes': 'Percentage',
  });

  if (allScores.length > 0) {
    const excellentCount = allScores.filter(s => s >= 85).length;
    const goodCount = allScores.filter(s => s >= 75 && s < 85).length;
    const passCount = allScores.filter(s => s >= 60 && s < 75).length;
    const needImprovementCount = allScores.filter(s => s < 60).length;

    chartData.push({
      'Chart Type': 'Excellent (≥85%)',
      'Data': excellentCount,
      'Notes': `${Math.round((excellentCount / allScores.length) * 100)}%`,
    });
    chartData.push({
      'Chart Type': 'Good (75-84%)',
      'Data': goodCount,
      'Notes': `${Math.round((goodCount / allScores.length) * 100)}%`,
    });
    chartData.push({
      'Chart Type': 'Pass (60-74%)',
      'Data': passCount,
      'Notes': `${Math.round((passCount / allScores.length) * 100)}%`,
    });
    chartData.push({
      'Chart Type': 'Need Improvement (<60%)',
      'Data': needImprovementCount,
      'Notes': `${Math.round((needImprovementCount / allScores.length) * 100)}%`,
    });
  }

  chartData.push({
    'Chart Type': '',
    'Data': '',
    'Notes': '',
  });

  chartData.push({
    'Chart Type': '=== Top 10 Students (Bar Chart) ===',
    'Data': '',
    'Notes': 'Select Student and Average columns to create bar chart',
  });

  chartData.push({
    'Chart Type': 'Student',
    'Data': 'Average Score',
    'Notes': 'Assessments',
  });

  if (allScores.length > 0) {
    const studentAverages = unitStudents.map(student => {
      const studentAssessments = unitAssessments.filter(a => a.studentId === student.id);
      const scores = studentAssessments.map(a => Math.round((a.score / a.maxScore) * 100));
      const average = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;
      return { name: student.name, average, assessmentCount: scores.length };
    }).sort((a, b) => b.average - a.average);

    studentAverages.slice(0, 10).forEach(student => {
      chartData.push({
        'Chart Type': student.name,
        'Data': student.average,
        'Notes': student.assessmentCount,
      });
    });
  }

  const sheet4 = XLSX.utils.json_to_sheet(chartData);

  // Auto-size columns for Sheet 4
  sheet4['!cols'] = [
    { wch: 35 }, // Chart Type
    { wch: 18 }, // Data
    { wch: 30 }, // Notes
  ];

  XLSX.utils.book_append_sheet(workbook, sheet4, 'Visual Dashboard');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const fileName = `${unit}_Year${year}_Weekly_Performance_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};

// Group Performance Summary Export
// Provides comparative analysis across all groups
export const exportGroupPerformanceSummary = (
  attendance: AttendanceRecord[],
  assessments: AssessmentRecord[],
  students: Student[],
  groups: Group[],
  year?: number
): void => {
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Filter by year if specified
  const filteredStudents = year ? students.filter(s => s.year === year) : students;
  const filteredAttendance = year ? attendance.filter(a => a.year === year) : attendance;
  const filteredAssessments = year ? assessments.filter(a => a.year === year) : assessments;
  const filteredGroups = year ? groups.filter(g => g.year === year) : groups;

  const workbook = XLSX.utils.book_new();

  // ============= SHEET 1: Group Comparison =============
  const groupComparisonData: any[] = [];

  // Header
  groupComparisonData.push({
    'Group': year ? `Group Performance Summary - Year ${year}` : 'Group Performance Summary - All Years',
    'Students': `Export Date: ${exportDate}`,
    'Avg Attendance': '',
    'Avg Score': '',
    'Top Student': '',
    'Top Score': '',
    'Need Attention': '',
    'Trainer': '',
    'Performance Status': '',
  });

  groupComparisonData.push({
    'Group': '',
    'Students': '',
    'Avg Attendance': '',
    'Avg Score': '',
    'Top Student': '',
    'Top Score': '',
    'Need Attention': '',
    'Trainer': '',
    'Performance Status': '',
  });

  // Calculate statistics for each group
  filteredGroups.forEach(group => {
    const groupStudents = filteredStudents.filter(s => s.groupId === group.id);
    const groupAttendance = filteredAttendance.filter(a => a.groupId === group.id);
    const groupAssessments = filteredAssessments.filter(a => a.groupId === group.id);

    // Calculate attendance rate
    const totalAttendance = groupAttendance.length;
    const presentCount = groupAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Calculate average score
    const totalScore = groupAssessments.reduce((sum, a) => sum + a.score, 0);
    const totalMaxScore = groupAssessments.reduce((sum, a) => sum + a.maxScore, 0);
    const avgScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    // Find top performer
    const studentAverages = groupStudents.map(student => {
      const studentAssessments = groupAssessments.filter(a => a.studentId === student.id);
      const scores = studentAssessments.map(a => Math.round((a.score / a.maxScore) * 100));
      const average = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
      return { name: student.name, average };
    }).sort((a, b) => b.average - a.average);

    const topStudent = studentAverages.length > 0 ? studentAverages[0] : { name: 'N/A', average: 0 };

    // Count students needing attention
    const needAttentionCount = studentAverages.filter(s => s.average < 60 && s.average > 0).length;

    // Get trainer (from attendance/assessment records)
    const trainerIdsSet = new Set([
      ...groupAttendance.map(a => a.trainerId),
      ...groupAssessments.map(a => a.trainerId)
    ]);
    const trainerIds = Array.from(trainerIdsSet);
    const trainerName = trainerIds.length > 0 ? `Trainer ${trainerIds[0].slice(-4)}` : 'Unassigned';

    // Performance status
    let performanceStatus = 'N/A';
    if (avgScore >= 85) performanceStatus = 'Excellent';
    else if (avgScore >= 75) performanceStatus = 'Good';
    else if (avgScore >= 60) performanceStatus = 'Pass';
    else if (avgScore > 0) performanceStatus = 'Need Improvement';

    groupComparisonData.push({
      'Group': group.name,
      'Students': groupStudents.length,
      'Avg Attendance': `${attendanceRate}%`,
      'Avg Score': `${avgScore}%`,
      'Top Student': topStudent.name,
      'Top Score': `${topStudent.average}%`,
      'Need Attention': needAttentionCount,
      'Trainer': trainerName,
      'Performance Status': performanceStatus,
    });
  });

  const sheet1 = XLSX.utils.json_to_sheet(groupComparisonData);

  // Auto-size columns
  sheet1['!cols'] = [
    { wch: 15 }, // Group
    { wch: 12 }, // Students
    { wch: 15 }, // Avg Attendance
    { wch: 12 }, // Avg Score
    { wch: 25 }, // Top Student
    { wch: 12 }, // Top Score
    { wch: 15 }, // Need Attention
    { wch: 15 }, // Trainer
    { wch: 18 }, // Performance Status
  ];

  XLSX.utils.book_append_sheet(workbook, sheet1, 'Group Comparison');

  // ============= SHEET 2: Detailed Statistics =============
  const detailedStatsData: any[] = [];

  detailedStatsData.push({
    'Group': year ? `Detailed Group Statistics - Year ${year}` : 'Detailed Group Statistics - All Years',
    'Total Students': `Export Date: ${exportDate}`,
    'Total Attendance': '',
    'Total Assessments': '',
    'Present Count': '',
    'Absent Count': '',
    'Late Count': '',
    'Excellent Count (≥85%)': '',
    'Pass Rate (≥60%)': '',
  });

  detailedStatsData.push({
    'Group': '',
    'Total Students': '',
    'Total Attendance': '',
    'Total Assessments': '',
    'Present Count': '',
    'Absent Count': '',
    'Late Count': '',
    'Excellent Count (≥85%)': '',
    'Pass Rate (≥60%)': '',
  });

  filteredGroups.forEach(group => {
    const groupStudents = filteredStudents.filter(s => s.groupId === group.id);
    const groupAttendance = filteredAttendance.filter(a => a.groupId === group.id);
    const groupAssessments = filteredAssessments.filter(a => a.groupId === group.id);

    // Attendance breakdown
    const presentCount = groupAttendance.filter(a => a.status === 'present').length;
    const absentCount = groupAttendance.filter(a => a.status === 'absent').length;
    const lateCount = groupAttendance.filter(a => a.status === 'late').length;

    // Assessment statistics
    const percentages = groupAssessments.map(a => Math.round((a.score / a.maxScore) * 100));
    const excellentCount = percentages.filter(p => p >= 85).length;
    const passCount = percentages.filter(p => p >= 60).length;
    const passRate = percentages.length > 0 ? Math.round((passCount / percentages.length) * 100) : 0;

    detailedStatsData.push({
      'Group': group.name,
      'Total Students': groupStudents.length,
      'Total Attendance': groupAttendance.length,
      'Total Assessments': groupAssessments.length,
      'Present Count': presentCount,
      'Absent Count': absentCount,
      'Late Count': lateCount,
      'Excellent Count (≥85%)': excellentCount,
      'Pass Rate (≥60%)': `${passRate}%`,
    });
  });

  const sheet2 = XLSX.utils.json_to_sheet(detailedStatsData);

  sheet2['!cols'] = [
    { wch: 15 }, // Group
    { wch: 15 }, // Total Students
    { wch: 18 }, // Total Attendance
    { wch: 18 }, // Total Assessments
    { wch: 15 }, // Present Count
    { wch: 15 }, // Absent Count
    { wch: 12 }, // Late Count
    { wch: 22 }, // Excellent Count
    { wch: 18 }, // Pass Rate
  ];

  XLSX.utils.book_append_sheet(workbook, sheet2, 'Detailed Statistics');

  // ============= SHEET 3: Rankings =============
  const rankingsData: any[] = [];

  rankingsData.push({
    'Metric': year ? `Group Rankings - Year ${year}` : 'Group Rankings - All Years',
    'Rank': '',
    'Group': '',
    'Value': `Export Date: ${exportDate}`,
  });

  rankingsData.push({
    'Metric': '',
    'Rank': '',
    'Group': '',
    'Value': '',
  });

  // Calculate all metrics for ranking
  const groupMetrics = filteredGroups.map(group => {
    const groupStudents = filteredStudents.filter(s => s.groupId === group.id);
    const groupAttendance = filteredAttendance.filter(a => a.groupId === group.id);
    const groupAssessments = filteredAssessments.filter(a => a.groupId === group.id);

    const presentCount = groupAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = groupAttendance.length > 0 ? Math.round((presentCount / groupAttendance.length) * 100) : 0;

    const totalScore = groupAssessments.reduce((sum, a) => sum + a.score, 0);
    const totalMaxScore = groupAssessments.reduce((sum, a) => sum + a.maxScore, 0);
    const avgScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return {
      groupName: group.name,
      studentCount: groupStudents.length,
      attendanceRate,
      avgScore,
    };
  });

  // Ranking by Average Score
  rankingsData.push({ 'Metric': '=== By Average Score ===', 'Rank': '', 'Group': '', 'Value': '' });
  const scoreRanking = [...groupMetrics].sort((a, b) => b.avgScore - a.avgScore);
  scoreRanking.forEach((group, index) => {
    rankingsData.push({
      'Metric': 'Average Score',
      'Rank': index + 1,
      'Group': group.groupName,
      'Value': `${group.avgScore}%`,
    });
  });

  rankingsData.push({ 'Metric': '', 'Rank': '', 'Group': '', 'Value': '' });

  // Ranking by Attendance Rate
  rankingsData.push({ 'Metric': '=== By Attendance Rate ===', 'Rank': '', 'Group': '', 'Value': '' });
  const attendanceRanking = [...groupMetrics].sort((a, b) => b.attendanceRate - a.attendanceRate);
  attendanceRanking.forEach((group, index) => {
    rankingsData.push({
      'Metric': 'Attendance Rate',
      'Rank': index + 1,
      'Group': group.groupName,
      'Value': `${group.attendanceRate}%`,
    });
  });

  rankingsData.push({ 'Metric': '', 'Rank': '', 'Group': '', 'Value': '' });

  // Ranking by Student Count
  rankingsData.push({ 'Metric': '=== By Student Count ===', 'Rank': '', 'Group': '', 'Value': '' });
  const studentCountRanking = [...groupMetrics].sort((a, b) => b.studentCount - a.studentCount);
  studentCountRanking.forEach((group, index) => {
    rankingsData.push({
      'Metric': 'Student Count',
      'Rank': index + 1,
      'Group': group.groupName,
      'Value': group.studentCount,
    });
  });

  const sheet3 = XLSX.utils.json_to_sheet(rankingsData);

  sheet3['!cols'] = [
    { wch: 25 }, // Metric
    { wch: 8 },  // Rank
    { wch: 15 }, // Group
    { wch: 15 }, // Value
  ];

  XLSX.utils.book_append_sheet(workbook, sheet3, 'Rankings');

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const fileName = year
    ? `Group_Performance_Summary_Year${year}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `Group_Performance_Summary_AllYears_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(data, fileName);
};
