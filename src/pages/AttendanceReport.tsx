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
  Assessment,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { exportAttendanceGridToExcel } from '../utils/excelUtils';

interface AttendanceGridData {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  groupName: string;
  year: number;
  attendanceByDate: { [date: string]: 1 | 0 | '-' };
  totalDays: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

const AttendanceReport: React.FC = () => {
  const { students, groups, attendance, loading } = useDatabase();
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
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    averageAttendanceRate: 0,
    totalDays: 0,
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

      // Filter students based on permissions and selections
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

      // Filter attendance records
      let filteredAttendance = attendance.filter(record => {
        const recordDate = dayjs(record.date);
        const inDateRange = (recordDate.isAfter(startDate, 'day') || recordDate.isSame(startDate, 'day')) &&
                           (recordDate.isBefore(endDate, 'day') || recordDate.isSame(endDate, 'day'));

        if (!inDateRange) return false;

        // For trainers, filter by their assigned groups/years
        if (user?.role === 'trainer') {
          if (user?.assignedGroups && !user.assignedGroups.includes(record.groupId)) {
            return false;
          }
          if (user?.assignedYears && !user.assignedYears.includes(record.year)) {
            return false;
          }
        }

        // Filter by trainer (admin only)
        if (selectedTrainer !== 'all' && record.trainerId !== selectedTrainer) return false;

        return true;
      });

      // Generate list of unique dates in range
      const dates: string[] = [];
      let currentDate = startDate.clone();
      while (currentDate.isBefore(endDate, 'day') || currentDate.isSame(endDate, 'day')) {
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate = currentDate.add(1, 'day');
      }
      setUniqueDates(dates);

      // Build attendance grid data
      const gridData: AttendanceGridData[] = filteredStudents.map(student => {
        const studentAttendance = filteredAttendance.filter(a => a.studentId === student.id);
        const attendanceByDate: { [date: string]: 1 | 0 | '-' } = {};
        let presentCount = 0;
        let absentCount = 0;
        let totalDays = 0;

        dates.forEach(date => {
          const record = studentAttendance.find(a => a.date === date);
          if (record) {
            totalDays++;
            if (record.status === 'present' || record.status === 'late') {
              attendanceByDate[date] = 1;
              presentCount++;
            } else {
              attendanceByDate[date] = 0;
              absentCount++;
            }
          } else {
            attendanceByDate[date] = '-';
          }
        });

        const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
        const group = groups.find(g => g.id === student.groupId);

        return {
          studentId: student.id,
          studentName: student.name,
          studentIdNumber: student.studentId,
          groupName: group ? group.name : 'Unknown',
          year: student.year,
          attendanceByDate,
          totalDays,
          presentCount,
          absentCount,
          attendanceRate,
        };
      });

      setReportData(gridData);

      // Calculate summary statistics
      const totalStudents = gridData.length;
      const totalDays = dates.length;
      const avgAttendanceRate = totalStudents > 0
        ? Math.round(gridData.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents)
        : 0;

      setSummaryStats({
        totalStudents,
        averageAttendanceRate: avgAttendanceRate,
        totalDays,
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
      const groupText = selectedGroup !== 'all'
        ? groups.find(g => g.id === selectedGroup)?.name.replace(/\s+/g, '')
        : 'AllGroups';
      const monthText = startDate.format('MMM YYYY');
      const filename = `Attendance_Report_${yearText}_${groupText}_${monthText}`;

      exportAttendanceGridToExcel(
        reportData,
        uniqueDates,
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
          Attendance Report
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
                      <MenuItem key={year} value={year}>Year {year}</MenuItem>
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
                      <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth disabled={selectedYear === 'all' || (selectedYear !== 2 && selectedYear !== 3)}>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={selectedUnit}
                    label="Unit"
                    onChange={(e) => setSelectedUnit(e.target.value)}
                  >
                    <MenuItem value="all">All Units</MenuItem>
                    {getUnitOptions(selectedYear as number).map(unit => (
                      <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
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
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Assessment sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Avg Attendance Rate
                    </Typography>
                  </Box>
                  <Typography variant="h4">{summaryStats.averageAttendanceRate}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarToday sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Days
                    </Typography>
                  </Box>
                  <Typography variant="h4">{summaryStats.totalDays}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarToday sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="body2" color="text.secondary">
                      Date Range
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {startDate.format('MMM DD')} - {endDate.format('MMM DD, YYYY')}
                  </Typography>
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
                Attendance Grid ({reportData.length} students)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 600, overflowX: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 50, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 3 }}>#</TableCell>
                      <TableCell sx={{ minWidth: 200, position: 'sticky', left: 50, backgroundColor: 'background.paper', zIndex: 3 }}>Student Name</TableCell>
                      <TableCell sx={{ minWidth: 120, position: 'sticky', left: 250, backgroundColor: 'background.paper', zIndex: 3 }}>Student ID</TableCell>
                      <TableCell sx={{ minWidth: 100, position: 'sticky', left: 370, backgroundColor: 'background.paper', zIndex: 3 }}>Group</TableCell>
                      {uniqueDates.map(date => (
                        <TableCell key={date} align="center" sx={{ minWidth: 60 }}>
                          {dayjs(date).format('M/D')}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ minWidth: 80, backgroundColor: 'background.paper' }}>Total Days</TableCell>
                      <TableCell align="center" sx={{ minWidth: 80, backgroundColor: 'background.paper' }}>Present</TableCell>
                      <TableCell align="center" sx={{ minWidth: 80, backgroundColor: 'background.paper' }}>Absent</TableCell>
                      <TableCell align="center" sx={{ minWidth: 100, backgroundColor: 'background.paper' }}>Attendance %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((student, index) => (
                      <TableRow key={student.studentId} hover>
                        <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 2 }}>{index + 1}</TableCell>
                        <TableCell sx={{ position: 'sticky', left: 50, backgroundColor: 'background.paper', zIndex: 2 }}>{student.studentName}</TableCell>
                        <TableCell sx={{ position: 'sticky', left: 250, backgroundColor: 'background.paper', zIndex: 2 }}>{student.studentIdNumber}</TableCell>
                        <TableCell sx={{ position: 'sticky', left: 370, backgroundColor: 'background.paper', zIndex: 2 }}>{student.groupName}</TableCell>
                        {uniqueDates.map(date => (
                          <TableCell
                            key={date}
                            align="center"
                            sx={{
                              backgroundColor: getCellColor(student.attendanceByDate[date]),
                              fontWeight: 'bold'
                            }}
                          >
                            {student.attendanceByDate[date]}
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
