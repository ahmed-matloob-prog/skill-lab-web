import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Students',
    'nav.inputData': 'Input Data',
    'nav.sync': 'Sync',
    'nav.adminPanel': 'Admin Panel',
    'nav.trainerReports': 'Trainer Reports',
    'nav.grandReport': 'Grand Report',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.refresh': 'Refresh',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    
    // Students
    'students.title': 'Students',
    'students.addStudent': 'Add Student',
    'students.editStudent': 'Edit Student',
    'students.studentName': 'Student Name',
    'students.studentId': 'Student ID',
    'students.email': 'Email',
    'students.phone': 'Phone',
    'students.year': 'Year',
    'students.group': 'Group',
    'students.actions': 'Actions',
    'students.importExcel': 'Import Excel',
    'students.downloadTemplate': 'Download Template',
    
    // Input Data
    'input.title': 'Combined Input - Attendance & Assessment',
    'input.selectDate': 'Select Date',
    'input.filterByYear': 'Filter by Year',
    'input.filterByGroup': 'Filter by Group',
    'input.assessmentDetails': 'Assessment Details',
    'input.assessmentName': 'Assessment Name',
    'input.assessmentType': 'Assessment Type',
    'input.maxScore': 'Max Score',
    'input.students': 'Students - Combined Input',
    'input.attendance': 'Attendance',
    'input.score': 'Score',
    'input.present': 'Present',
    'input.late': 'Late',
    'input.absent': 'Absent',
    'input.saveAllData': 'Save All Data',
    'input.exportCombinedReport': 'Export Combined Report',
    
    // Assessment Types
    'assessment.exam': 'Exam',
    'assessment.quiz': 'Quiz',
    'assessment.assignment': 'Assignment',
    'assessment.project': 'Project',
    'assessment.presentation': 'Presentation',
    
    // Admin
    'admin.title': 'Admin Panel',
    'admin.overview': 'Overview',
    'admin.userManagement': 'User Management',
    'admin.groupManagement': 'Group Management',
    'admin.systemStatistics': 'System Statistics',
    'admin.grandReport': 'Grand Report',
    'admin.trainerReports': 'Trainer Reports',
    'admin.totalStudents': 'Total Students',
    'admin.totalGroups': 'Total Groups',
    'admin.totalAttendance': 'Total Attendance',
    'admin.totalAssessments': 'Total Assessments',
    'admin.attendanceRate': 'Attendance Rate',
    'admin.averageScore': 'Average Score',
    
    // Trainer Reports
    'trainer.title': 'Trainer Reports',
    'trainer.selectTrainer': 'Select Trainer',
    'trainer.selectYear': 'Select Year',
    'trainer.generateReport': 'Generate Report',
    'trainer.overview': 'Overview',
    'trainer.detailedReports': 'Detailed Reports',
    'trainer.totalTrainers': 'Total Trainers',
    'trainer.performanceSummary': 'Trainer Performance Summary',
    'trainer.trainer': 'Trainer',
    'trainer.students': 'Students',
    'trainer.attendanceRate': 'Attendance Rate',
    'trainer.avgScore': 'Avg Score',
    'trainer.assessments': 'Assessments',
    'trainer.actions': 'Actions',
    'trainer.exportReport': 'Export Report',
    'trainer.assessmentTypes': 'Assessment Types',
    
    // Grand Report
    'grand.title': 'Admin Grand Report',
    'grand.selectYear': 'Select Year',
    'grand.exportExcelReport': 'Export Excel Report',
    'grand.totalGroups': 'Total Groups',
    'grand.totalStudents': 'Total Students',
    'grand.attendanceRecords': 'Attendance Records',
    'grand.assessmentRecords': 'Assessment Records',
    'grand.groupReports': 'Group Reports',
    'grand.studentPerformance': 'Student Performance',
    'grand.attendanceRate': 'Attendance Rate',
    'grand.avgScore': 'Avg Score',
    'grand.assessments': 'Assessments',
    
    // Years
    'year.all': 'All Years',
    'year.1': 'Year 1',
    'year.2': 'Year 2',
    'year.3': 'Year 3',
    'year.4': 'Year 4',
    'year.5': 'Year 5',
    'year.6': 'Year 6',
    
    // Groups
    'group.all': 'All Groups',
    
    // Messages
    'message.noStudentsFound': 'No students found for the selected filters.',
    'message.pleaseSelectYear': 'Please select a specific year to view the grand report.',
    'message.pleaseSelectTrainerOrYear': 'Please select a specific trainer or year to view reports.',
    'message.accessDenied': 'Access denied. Admin privileges required.',
    'message.dataSavedSuccessfully': 'Data saved successfully!',
    'message.failedToSaveData': 'Failed to save data:',
    'message.pleaseEnterAssessmentName': 'Please enter assessment name',
    'message.pleaseEnterValidMaxScore': 'Please enter a valid maximum score',
    'message.invalidScore': 'Invalid score for',
    'message.scoreMustBeBetween': 'Score must be between',
    'message.failedToExportReport': 'Failed to export combined report',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.students': 'الطلاب',
    'nav.inputData': 'إدخال البيانات',
    'nav.sync': 'المزامنة',
    'nav.adminPanel': 'لوحة الإدارة',
    'nav.trainerReports': 'تقارير المدربين',
    'nav.grandReport': 'التقرير الشامل',
    
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.add': 'إضافة',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.download': 'تحميل',
    'common.upload': 'رفع',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.refresh': 'تحديث',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.warning': 'تحذير',
    'common.info': 'معلومات',
    
    // Students
    'students.title': 'الطلاب',
    'students.addStudent': 'إضافة طالب',
    'students.editStudent': 'تعديل الطالب',
    'students.studentName': 'اسم الطالب',
    'students.studentId': 'رقم الطالب',
    'students.email': 'البريد الإلكتروني',
    'students.phone': 'الهاتف',
    'students.year': 'السنة',
    'students.group': 'المجموعة',
    'students.actions': 'الإجراءات',
    'students.importExcel': 'استيراد إكسل',
    'students.downloadTemplate': 'تحميل القالب',
    
    // Input Data
    'input.title': 'إدخال مشترك - الحضور والتقييم',
    'input.selectDate': 'اختر التاريخ',
    'input.filterByYear': 'تصفية حسب السنة',
    'input.filterByGroup': 'تصفية حسب المجموعة',
    'input.assessmentDetails': 'تفاصيل التقييم',
    'input.assessmentName': 'اسم التقييم',
    'input.assessmentType': 'نوع التقييم',
    'input.maxScore': 'الدرجة العظمى',
    'input.students': 'الطلاب - إدخال مشترك',
    'input.attendance': 'الحضور',
    'input.score': 'الدرجة',
    'input.present': 'حاضر',
    'input.late': 'متأخر',
    'input.absent': 'غائب',
    'input.saveAllData': 'حفظ جميع البيانات',
    'input.exportCombinedReport': 'تصدير التقرير المشترك',
    
    // Assessment Types
    'assessment.exam': 'امتحان',
    'assessment.quiz': 'اختبار قصير',
    'assessment.assignment': 'واجب',
    'assessment.project': 'مشروع',
    'assessment.presentation': 'عرض تقديمي',
    
    // Admin
    'admin.title': 'لوحة الإدارة',
    'admin.overview': 'نظرة عامة',
    'admin.userManagement': 'إدارة المستخدمين',
    'admin.groupManagement': 'إدارة المجموعات',
    'admin.systemStatistics': 'إحصائيات النظام',
    'admin.grandReport': 'التقرير الشامل',
    'admin.trainerReports': 'تقارير المدربين',
    'admin.totalStudents': 'إجمالي الطلاب',
    'admin.totalGroups': 'إجمالي المجموعات',
    'admin.totalAttendance': 'إجمالي الحضور',
    'admin.totalAssessments': 'إجمالي التقييمات',
    'admin.attendanceRate': 'معدل الحضور',
    'admin.averageScore': 'متوسط الدرجات',
    
    // Trainer Reports
    'trainer.title': 'تقارير المدربين',
    'trainer.selectTrainer': 'اختر المدرب',
    'trainer.selectYear': 'اختر السنة',
    'trainer.generateReport': 'إنشاء التقرير',
    'trainer.overview': 'نظرة عامة',
    'trainer.detailedReports': 'التقارير التفصيلية',
    'trainer.totalTrainers': 'إجمالي المدربين',
    'trainer.performanceSummary': 'ملخص أداء المدربين',
    'trainer.trainer': 'المدرب',
    'trainer.students': 'الطلاب',
    'trainer.attendanceRate': 'معدل الحضور',
    'trainer.avgScore': 'متوسط الدرجات',
    'trainer.assessments': 'التقييمات',
    'trainer.actions': 'الإجراءات',
    'trainer.exportReport': 'تصدير التقرير',
    'trainer.assessmentTypes': 'أنواع التقييم',
    
    // Grand Report
    'grand.title': 'التقرير الشامل للإدارة',
    'grand.selectYear': 'اختر السنة',
    'grand.exportExcelReport': 'تصدير تقرير إكسل',
    'grand.totalGroups': 'إجمالي المجموعات',
    'grand.totalStudents': 'إجمالي الطلاب',
    'grand.attendanceRecords': 'سجلات الحضور',
    'grand.assessmentRecords': 'سجلات التقييم',
    'grand.groupReports': 'تقارير المجموعات',
    'grand.studentPerformance': 'أداء الطلاب',
    'grand.attendanceRate': 'معدل الحضور',
    'grand.avgScore': 'متوسط الدرجات',
    'grand.assessments': 'التقييمات',
    
    // Years
    'year.all': 'جميع السنوات',
    'year.1': 'السنة الأولى',
    'year.2': 'السنة الثانية',
    'year.3': 'السنة الثالثة',
    'year.4': 'السنة الرابعة',
    'year.5': 'السنة الخامسة',
    'year.6': 'السنة السادسة',
    
    // Groups
    'group.all': 'جميع المجموعات',
    
    // Messages
    'message.noStudentsFound': 'لم يتم العثور على طلاب للفلاتر المحددة.',
    'message.pleaseSelectYear': 'يرجى اختيار سنة محددة لعرض التقرير الشامل.',
    'message.pleaseSelectTrainerOrYear': 'يرجى اختيار مدرب أو سنة محددة لعرض التقارير.',
    'message.accessDenied': 'تم رفض الوصول. مطلوب صلاحيات الإدارة.',
    'message.dataSavedSuccessfully': 'تم حفظ البيانات بنجاح!',
    'message.failedToSaveData': 'فشل في حفظ البيانات:',
    'message.pleaseEnterAssessmentName': 'يرجى إدخال اسم التقييم',
    'message.pleaseEnterValidMaxScore': 'يرجى إدخال درجة عظمى صحيحة',
    'message.invalidScore': 'درجة غير صحيحة لـ',
    'message.scoreMustBeBetween': 'يجب أن تكون الدرجة بين',
    'message.failedToExportReport': 'فشل في تصدير التقرير المشترك',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  const isRTL = language === 'ar';

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};


