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

// Template Generation
export const downloadStudentTemplate = (): void => {
  const templateData = [
    {
      'Student Name': 'John Doe',
      'Year': 1,
      'Group': 'Group1',
      'Student ID': 'ST001',
      'Email': 'john.doe@example.com',
      'Phone': '+1234567890',
      'Unit': 'MSK',
    },
    {
      'Student Name': 'Jane Smith',
      'Year': 2,
      'Group': 'Group6',
      'Student ID': 'ST002',
      'Email': 'jane.smith@example.com',
      'Phone': '+1234567891',
      'Unit': 'HEM',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');

  // Add instructions sheet
  const instructionsData = [
    { 'Field': 'Student Name', 'Required': 'Yes', 'Description': 'Full name of the student' },
    { 'Field': 'Year', 'Required': 'Yes', 'Description': 'Academic year (1-6)' },
    { 'Field': 'Group', 'Required': 'Yes', 'Description': 'Group name (Group1-Group30, available for all years)' },
    { 'Field': 'Student ID', 'Required': 'No', 'Description': 'Unique student identifier (auto-generated if empty)' },
    { 'Field': 'Email', 'Required': 'No', 'Description': 'Student email address' },
    { 'Field': 'Phone', 'Required': 'No', 'Description': 'Student phone number' },
    { 'Field': 'Unit', 'Required': 'No', 'Description': 'Unit for Year 2/3 students (MSK, HEM, CVS, Resp, GIT, GUT, Neuro, END)' },
  ];

  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

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
