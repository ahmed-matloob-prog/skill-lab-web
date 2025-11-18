import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  TextField,
} from '@mui/material';
import {
  Download,
  CalendarToday,
  People,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { exportAttendanceGridToExcel } from '../utils/excelUtils';

interface AssessmentColumn {
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  maxScore: number;
  date: string;
  trainerId: string;
  groupId: string;
  unit: string;
  week?: number;
}

interface AttendanceGridData {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  groupName: string;
  year: number;
  attendanceByAssessment: { [assessmentId: string]: 1 | 0 | '-' };
  totalDays: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

const AttendanceReport: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();

  // Filter states
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');

  // Report data states
  const [reportData, setReportData] = useState<AttendanceGridData[]>([]);
  const [assessmentColumns, setAssessmentColumns] = useState<AssessmentColumn[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    totalAssessments: 0,
    averageAttendanceRate: 0,
  });
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unit options based on year
  const getUnitOptions = (year: number) => {
    if (year === 2) {
      return [
        { value: 'MSK', label: 'MSK' },
        { value: 'HEM', label: 'HEM' },
        { value: 'CVS', label: 'CVS' },
        { value: 'Resp', label: 'Resp' },
      ];
    } else if (year === 3) {
      return [
        { value: 'GIT', label: 'GIT' },
        { value: 'GUT', label: 'GUT' },
        { value: 'Neuro', label: 'Neuro' },
        { value: 'END', label: 'END' },
      ];
    }
    return [];
  };

  // Filter groups based on user permissions
  const accessibleGroups = user?.role === 'admin' ? groups :
    groups.filter(group => user?.assignedGroups?.includes(group.id));

  // Get attendance value for a specific student and assessment
  const getAttendanceValue = (
    studentId: string,
    assessmentDate: string,
    assessmentTrainerId: string,
    assessmentGroupId: string
  ): 1 | 0 | '-' => {
    const record = attendance.find(
      a =>
        a.studentId === studentId &&
        a.date === assessmentDate &&
        a.trainerId === assessmentTrainerId &&
        a.groupId === assessmentGroupId
    );

    if (!record) return '-';
    if (record.status === 'present' || record.status === 'late') return 1;
    if (record.status === 'absent') return 0;
    return '-';
  };

  // Generate attendance report
  const generateAttendanceReport = () => {
    setLoadingReport(true);
    setError(null);

    try {
      // Validate date range
      if (endDate.isBefore(startDate)) {
        setError('End date must be after start date');
        setLoadingReport(false);
        return;
      }

      // Step 1: Filter assessments by permissions
      let filteredAssessments = assessments.filter(a => {
        // For trainers: only their assessments (both exported and not)
        if (user?.role === 'trainer') {
          if (a.trainerId !== user.id) return false;
          // Also filter by assigned groups/years
          if (user?.assignedGroups && !user.assignedGroups.includes(a.groupId)) return false;
          if (user?.assignedYears && !user.assignedYears.includes(a.year)) return false;
        }

        // For admin: only exported assessments
        if (user?.role === 'admin') {
          if (!a.exportedToAdmin) return false;
        }

        return true;
      });

      // Step 2: Filter by user selections (year, group, unit, date range, trainer)
      filteredAssessments = filteredAssessments.filter(a => {
        const assessmentDate = dayjs(a.date);
        const inDateRange =
          (assessmentDate.isAfter(startDate, 'day') || assessmentDate.isSame(startDate, 'day')) &&
          (assessmentDate.isBefore(endDate, 'day') || assessmentDate.isSame(endDate, 'day'));

        if (!inDateRange) return false;
        if (selectedYear !== 'all' && a.year !== selectedYear) return false;
        if (selectedGroup !== 'all' && a.groupId !== selectedGroup) return false;
        if (selectedUnit !== 'all' && a.unit !== selectedUnit) return false;
        if (selectedTrainer !== 'all' && a.trainerId !== selectedTrainer) return false;

        return true;
      });

      // Step 3: Sort by date (chronological)
      filteredAssessments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Step 4: Deduplicate assessments by unique characteristics
      // Since each assessment is saved per student, we need to group by name+date+type+group
      const uniqueAssessmentsMap = new Map<string, typeof filteredAssessments[0]>();
      filteredAssessments.forEach(a => {
        // Create a unique key based on assessment characteristics
        const key = `${a.assessmentName}|${a.date}|${a.assessmentType}|${a.groupId}|${a.trainerId}`;

        // Only keep the first occurrence of each unique assessment
        if (!uniqueAssessmentsMap.has(key)) {
          uniqueAssessmentsMap.set(key, a);
        }
      });

      const uniqueAssessments = Array.from(uniqueAssessmentsMap.values());

      // Step 5: Create assessment columns from unique assessments
      const columns: AssessmentColumn[] = uniqueAssessments.map(a => ({
        assessmentId: a.id,
        assessmentName: a.assessmentName,
        assessmentType: a.assessmentType,
        maxScore: a.maxScore,
        date: a.date,
        trainerId: a.trainerId,
        groupId: a.groupId,
        unit: a.unit || '-',
        week: a.week,
      }));

      logger.info(`Filtered assessments: ${filteredAssessments.length} total (with duplicates), ${uniqueAssessments.length} unique, creating ${columns.length} columns`);
      setAssessmentColumns(columns);

      // Step 6: Filter students based on permissions and selections
      let filteredStudents = students.filter(student => {
        // For trainers, only show students from their assigned groups AND assigned years
        if (user?.role === 'trainer') {
          if (user?.assignedGroups && !user.assignedGroups.includes(student.groupId)) {
            return false;
          }
          if (user?.assignedYears && !user.assignedYears.includes(student.year)) {
            return false;
          }
        }
        if (selectedYear !== 'all' && student.year !== selectedYear) return false;
        if (selectedGroup !== 'all' && student.groupId !== selectedGroup) return false;

        // Filter by unit
        if (selectedUnit !== 'all') {
          const studentGroup = groups.find(g => g.id === student.groupId);
          if (studentGroup?.currentUnit !== selectedUnit) return false;
        }

        return true;
      });

      // Step 7: Build attendance grid data
      const gridData: AttendanceGridData[] = filteredStudents.map(student => {
        const attendanceByAssessment: { [key: string]: 1 | 0 | '-' } = {};
        let totalDays = 0;
        let presentCount = 0;
        let absentCount = 0;

        // IMPORTANT: Only iterate over the FILTERED columns
        columns.forEach(assessment => {
          const value = getAttendanceValue(
            student.id,
            assessment.date,
            assessment.trainerId,
            assessment.groupId
          );

          attendanceByAssessment[assessment.assessmentId] = value;

          // Only count if there's an actual record (not '-')
          if (value !== '-') {
            totalDays++;
            if (value === 1) presentCount++;
            if (value === 0) absentCount++;
          }
        });

        const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
        const group = groups.find(g => g.id === student.groupId);

        logger.info(`Student ${student.name}: ${columns.length} assessments, ${totalDays} total days with records`);

        return {
          studentId: student.id,
          studentName: student.name,
          studentIdNumber: student.studentId,
          groupName: group ? group.name : 'Unknown',
          year: student.year,
          attendanceByAssessment,
          totalDays,
          presentCount,
          absentCount,
          attendanceRate,
        };
      });

      setReportData(gridData);

      // Step 8: Calculate summary statistics
      const totalStudents = gridData.length;
      const totalAssessments = columns.length;
      const avgAttendanceRate =
        totalStudents > 0
          ? Math.round(gridData.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents)
          : 0;

      setSummaryStats({
        totalStudents,
        totalAssessments,
        averageAttendanceRate: avgAttendanceRate,
      });
    } catch (error) {
      logger.error('Error generating attendance report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoadingReport(false);
    }
  };

  // Handle export to Excel
  const handleExport = () => {
    if (reportData.length === 0) {
      setError('No data to export. Please generate a report first.');
      return;
    }

    try {
      // Build filename with filters
      const yearText = selectedYear !== 'all' ? `Year${selectedYear}` : 'AllYears';
      const groupText =
        selectedGroup !== 'all'
          ? groups.find(g => g.id === selectedGroup)?.name.replace(/\s+/g, '')
          : 'AllGroups';
      const monthText = startDate.format('MMM YYYY');
      const filename = `Attendance_Assessment_Report_${yearText}_${groupText}_${monthText}`;

      exportAttendanceGridToExcel(
        reportData,
        assessmentColumns,
        startDate.format('MMM DD, YYYY'),
        endDate.format('MMM DD, YYYY'),
        filename
      );
    } catch (error) {
      logger.error('Export failed:', error);
      setError('Failed to export report. Please try again.');
    }
  };

  // Get attendance rate color
  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 75) return 'warning';
    return 'error';
  };

  // Get cell background color
  const getCellColor = (value: 1 | 0 | '-') => {
    if (value === 1) return '#e8f5e9'; // Light green
    if (value === 0) return '#ffebee'; // Light red
    return '#f5f5f5'; // Light gray
  };

  // Auto-generate report on load
  useEffect(() => {
    if (!loading) {
      generateAttendanceReport();
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Attendance Report (Assessment-Based)
        </Typography>

        {/* Filter Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="From Date"
                  value={startDate}
                  onChange={(newValue) => newValue && setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="To Date"
                  value={endDate}
                  onChange={(newValue) => newValue && setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => {
                      setSelectedYear(e.target.value as number | 'all');
                      setSelectedUnit('all'); // Reset unit when year changes
                    }}
                  >
                    <MenuItem value="all">All Years</MenuItem>
                    {[1, 2, 3, 4, 5, 6].map(year => (
                      <MenuItem key={year} value={year}>
                        Year {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Group</InputLabel>
                  <Select
                    value={selectedGroup}
                    label="Group"
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <MenuItem value="all">All Groups</MenuItem>
                    {accessibleGroups.map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl
                  fullWidth
                  disabled={
                    selectedYear === 'all' || (selectedYear !== 2 && selectedYear !== 3)
                  }
                >
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={selectedUnit}
                    label="Unit"
                    onChange={(e) => setSelectedUnit(e.target.value)}
                  >
                    <MenuItem value="all">All Units</MenuItem>
                    {getUnitOptions(selectedYear as number).map(unit => (
                      <MenuItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {user?.role === 'admin' && (
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Trainer</InputLabel>
                    <Select
                      value={selectedTrainer}
                      label="Trainer"
                      onChange={(e) => setSelectedTrainer(e.target.value)}
                    >
                      <MenuItem value="all">All Trainers</MenuItem>
                      {/* TODO: Add trainer list */}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={generateAttendanceReport}
                  disabled={loadingReport}
                  sx={{ height: 56 }}
                >
                  {loadingReport ? <CircularProgress size={24} /> : 'Generate Report'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Download />}
                  onClick={handleExport}
                  disabled={reportData.length === 0}
                  sx={{ height: 56 }}
                >
                  Export to Excel
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Summary Statistics */}
        {reportData.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <People sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Students
                    </Typography>
                  </Box>
                  <Typography variant="h4">{summaryStats.totalStudents}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AssessmentIcon sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Assessments
                    </Typography>
                  </Box>
                  <Typography variant="h4">{summaryStats.totalAssessments}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarToday sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Avg Attendance Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4">{summaryStats.averageAttendanceRate}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Attendance Grid Table */}
        {reportData.length === 0 && !loadingReport ? (
          <Alert severity="info">
            No data available. Please adjust filters and generate report.
          </Alert>
        ) : reportData.length > 0 ? (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Attendance Grid ({reportData.length} students, {assessmentColumns.length}{' '}
                assessments)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 600, overflowX: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        rowSpan={2}
                        sx={{
                          minWidth: 50,
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'background.paper',
                          zIndex: 4,
                        }}
                      >
                        #
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        sx={{
                          minWidth: 200,
                          position: 'sticky',
                          left: 50,
                          backgroundColor: 'background.paper',
                          zIndex: 4,
                        }}
                      >
                        Student Name
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        sx={{
                          minWidth: 120,
                          position: 'sticky',
                          left: 250,
                          backgroundColor: 'background.paper',
                          zIndex: 4,
                        }}
                      >
                        Student ID
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        sx={{
                          minWidth: 100,
                          position: 'sticky',
                          left: 370,
                          backgroundColor: 'background.paper',
                          zIndex: 4,
                        }}
                      >
                        Group
                      </TableCell>
                      {assessmentColumns.map(assessment => (
                        <TableCell
                          key={assessment.assessmentId}
                          align="center"
                          sx={{ minWidth: 80 }}
                        >
                          {assessment.assessmentName} ({assessment.maxScore})
                        </TableCell>
                      ))}
                      <TableCell
                        rowSpan={2}
                        align="center"
                        sx={{ minWidth: 80, backgroundColor: 'background.paper' }}
                      >
                        Total Days
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        align="center"
                        sx={{ minWidth: 80, backgroundColor: 'background.paper' }}
                      >
                        Present
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        align="center"
                        sx={{ minWidth: 80, backgroundColor: 'background.paper' }}
                      >
                        Absent
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        align="center"
                        sx={{ minWidth: 100, backgroundColor: 'background.paper' }}
                      >
                        Attendance %
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      {assessmentColumns.map(assessment => (
                        <TableCell
                          key={`date-${assessment.assessmentId}`}
                          align="center"
                          sx={{ minWidth: 80 }}
                        >
                          {dayjs(assessment.date).format('MMM DD')}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((student, index) => (
                      <TableRow key={student.studentId} hover>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'background.paper',
                            zIndex: 2,
                          }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 50,
                            backgroundColor: 'background.paper',
                            zIndex: 2,
                          }}
                        >
                          {student.studentName}
                        </TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 250,
                            backgroundColor: 'background.paper',
                            zIndex: 2,
                          }}
                        >
                          {student.studentIdNumber}
                        </TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 370,
                            backgroundColor: 'background.paper',
                            zIndex: 2,
                          }}
                        >
                          {student.groupName}
                        </TableCell>
                        {assessmentColumns.map(assessment => (
                          <TableCell
                            key={assessment.assessmentId}
                            align="center"
                            sx={{
                              backgroundColor: getCellColor(
                                student.attendanceByAssessment[assessment.assessmentId]
                              ),
                              fontWeight: 'bold',
                            }}
                          >
                            {student.attendanceByAssessment[assessment.assessmentId]}
                          </TableCell>
                        ))}
                        <TableCell align="center">{student.totalDays}</TableCell>
                        <TableCell align="center">{student.presentCount}</TableCell>
                        <TableCell align="center">{student.absentCount}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={student.attendanceRate}
                            color={getAttendanceColor(student.attendanceRate)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : null}
      </Box>
    </LocalizationProvider>
  );
};

export default AttendanceReport;
