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
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Assessment,
  People,
  School,
  TrendingUp,
  BarChart,
  ViewList,
  TableChart,
  CalendarToday,
  ViewModule,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { exportSimplifiedReportToExcel, exportUnitWeeklyPerformanceWithTrendsAndCharts, exportGroupPerformanceSummary, exportGrandReportDetailedToExcel, exportGrandReportWeeklyToExcel } from '../utils/excelUtils';
import { Student, User } from '../types';
import AuthService from '../services/authService';

const AdminReport: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [detailedReportData, setDetailedReportData] = useState<any[]>([]);
  const [uniqueAssessments, setUniqueAssessments] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'weekly'>('summary');
  const [weeklyReportData, setWeeklyReportData] = useState<any[]>([]);
  const [sortedWeeks, setSortedWeeks] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalAttendance: 0,
    totalAssessments: 0,
    averageAttendanceRate: 0,
    averageScore: 0,
  });

  // Available units for Years 2 and 3
  const units = ['MSK', 'HEM', 'CVS', 'Resp', 'GIT', 'GUT', 'Neuro', 'END'];

  // Filter students based on selected filters
  const filteredStudents = students.filter(student => {
    if (selectedYear !== 'all' && student.year !== selectedYear) return false;
    if (selectedGroup !== 'all' && student.groupId !== selectedGroup) return false;
    if (selectedUnit && student.unit !== selectedUnit) return false;
    return true;
  });

  // Filter groups based on selected year
  const filteredGroups = groups.filter(group => {
    if (selectedYear !== 'all' && group.year !== selectedYear) return false;
    return true;
  });

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  // Helper function to get score color based on percentage
  const getScoreColor = (score: number, maxScore: number): 'success' | 'warning' | 'error' | 'default' => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return 'success';  // Green
    if (percentage >= 60) return 'warning';  // Yellow
    return 'error';  // Red
  };

  // Helper function to get background color for score cells
  const getScoreBgColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return '#e8f5e9';  // Light green
    if (percentage >= 60) return '#fff9c4';  // Light yellow
    return '#ffebee';  // Light red
  };

  const generateGrandReport = () => {
    setLoadingReport(true);

    try {
      const filteredAttendance = selectedYear !== 'all' ?
        attendance.filter(a => a.year === selectedYear) : attendance;
      // Admin should only see exported assessments (no drafts)
      const filteredAssessments = selectedYear !== 'all' ?
        assessments.filter(a => a.year === selectedYear && a.exportedToAdmin === true) :
        assessments.filter(a => a.exportedToAdmin === true);

      const groupFilteredAttendance = selectedGroup !== 'all' ?
        filteredAttendance.filter(a => a.groupId === selectedGroup) : filteredAttendance;
      const groupFilteredAssessments = selectedGroup !== 'all' ?
        filteredAssessments.filter(a => a.groupId === selectedGroup) : filteredAssessments;

      // Calculate summary statistics
      const totalStudents = filteredStudents.length;
      const totalGroups = filteredGroups.length;
      const totalAttendance = groupFilteredAttendance.length;
      const totalAssessments = groupFilteredAssessments.length;

      // Calculate average attendance rate
      const presentCount = groupFilteredAttendance.filter(a =>
        a.status === 'present' || a.status === 'late'
      ).length;
      const averageAttendanceRate = totalAttendance > 0 ?
        Math.round((presentCount / totalAttendance) * 100) : 0;

      // Calculate average score
      const totalScore = groupFilteredAssessments.reduce((sum, a) => sum + a.score, 0);
      const totalMaxScore = groupFilteredAssessments.reduce((sum, a) => sum + a.maxScore, 0);
      const averageScore = totalMaxScore > 0 ?
        Math.round((totalScore / totalMaxScore) * 100) : 0;

      setSummaryStats({
        totalStudents,
        totalGroups,
        totalAttendance,
        totalAssessments,
        averageAttendanceRate,
        averageScore,
      });

      // Collect unique assessments (for detailed view)
      const assessmentMap = new Map();
      groupFilteredAssessments.forEach(assessment => {
        const key = `${assessment.assessmentName}_${assessment.assessmentType}_${assessment.maxScore}_${assessment.date}`;
        if (!assessmentMap.has(key)) {
          assessmentMap.set(key, {
            name: assessment.assessmentName,
            type: assessment.assessmentType,
            maxScore: assessment.maxScore,
            date: assessment.date,
            key: key,
          });
        }
      });

      // Sort assessments by date
      const sortedAssessments = Array.from(assessmentMap.values()).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      setUniqueAssessments(sortedAssessments);

      // Generate summary report data
      const reportData = filteredStudents.map(student => {
        const studentAttendance = groupFilteredAttendance.filter(a => a.studentId === student.id);
        const studentAssessments = groupFilteredAssessments.filter(a => a.studentId === student.id);

        // Calculate student-specific stats
        const attendanceCount = studentAttendance.length;
        const presentCount = studentAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = attendanceCount > 0 ?
          Math.round((presentCount / attendanceCount) * 100) : 0;

        const totalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
        const totalMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
        const studentAverageScore = totalMaxScore > 0 ?
          Math.round((totalScore / totalMaxScore) * 100) : 0;

        return {
          studentName: student.name,
          studentId: student.studentId,
          year: student.year,
          unit: student.unit || '',
          group: getGroupName(student.groupId),
          attendanceRate,
          averageScore: studentAverageScore,
          totalAssessments: studentAssessments.length,
          totalAttendance: attendanceCount,
        };
      });

      setReportData(reportData);

      // Generate detailed report data with individual assessment scores
      const detailedData = filteredStudents.map((student, index) => {
        const studentAttendance = groupFilteredAttendance.filter(a => a.studentId === student.id);
        const studentAssessments = groupFilteredAssessments.filter(a => a.studentId === student.id);

        // Calculate student-specific stats
        const attendanceCount = studentAttendance.length;
        const presentCount = studentAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = attendanceCount > 0 ?
          Math.round((presentCount / attendanceCount) * 100) : 0;

        const totalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
        const totalMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
        const studentAverageScore = totalMaxScore > 0 ?
          Math.round((totalScore / totalMaxScore) * 100) : 0;

        // Create a map of assessment scores for this student
        const scoresMap: { [key: string]: { score: number; maxScore: number } } = {};
        studentAssessments.forEach(assessment => {
          const key = `${assessment.assessmentName}_${assessment.assessmentType}_${assessment.maxScore}_${assessment.date}`;
          scoresMap[key] = {
            score: assessment.score,
            maxScore: assessment.maxScore,
          };
        });

        return {
          rowNumber: index + 1,
          studentName: student.name,
          studentId: student.studentId,
          year: student.year,
          unit: student.unit || '-',
          groupName: getGroupName(student.groupId),
          assessmentScores: scoresMap,
          averageScore: studentAverageScore,
          attendancePercentage: attendanceRate,
        };
      });

      setDetailedReportData(detailedData);

      // ============= GENERATE WEEK-BASED REPORT DATA =============
      // Helper function to get week label (simplified - just show week number and unit)
      const getWeekLabel = (weekNumber: number, unit: string, assessmentDate: Date): string => {
        const formatDate = (d: Date) => {
          const month = d.toLocaleDateString('en-US', { month: 'short' });
          const day = d.getDate();
          return `${month} ${day}`;
        };

        if (unit) {
          return `Week ${weekNumber} (${unit}) - ${formatDate(assessmentDate)}`;
        }
        return `Week ${weekNumber} - ${formatDate(assessmentDate)}`;
      };

      // Group assessments by week number (from stored field)
      interface WeekData {
        weekNumber: number;
        assessment: any; // Single assessment per week
        date: Date;
        unit: string;
      }

      const weekMap = new Map<number, WeekData>();

      // Filter out assessments without week numbers
      groupFilteredAssessments
        .filter(assessment => assessment.week !== undefined && assessment.week !== null)
        .forEach(assessment => {
          const weekNumber = assessment.week!;
          const assessmentDate = new Date(assessment.date);

          // Since each week has exactly one assessment, just store it directly
          weekMap.set(weekNumber, {
            weekNumber,
            assessment,
            date: assessmentDate,
            unit: assessment.unit || '-'
          });
        });

      // Sort weeks by week number
      const sortedWeeksList = Array.from(weekMap.values())
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map(week => ({
          weekNumber: week.weekNumber,
          label: getWeekLabel(week.weekNumber, week.unit, week.date),
          unit: week.unit,
          assessmentName: week.assessment.assessmentName
        }));

      setSortedWeeks(sortedWeeksList);

      // Calculate weekly scores for each student (simplified - one assessment per week)
      const weeklyData = filteredStudents.map((student, index) => {
        const studentAssessments = groupFilteredAssessments.filter(a => a.studentId === student.id);
        const weeklyScores: { [key: number]: { percentage: number; assessmentCount: number } } = {};

        sortedWeeksList.forEach(week => {
          // Find the single assessment for this week
          const weekAssessment = studentAssessments.find(a => a.week === week.weekNumber);

          if (weekAssessment) {
            const percentage = Math.round((weekAssessment.score / weekAssessment.maxScore) * 100);

            weeklyScores[week.weekNumber] = {
              percentage,
              assessmentCount: 1 // Always 1 since each week has one assessment
            };
          }
        });

        // Calculate annual average
        const allPercentages = Object.values(weeklyScores).map(w => w.percentage);
        const annualAverage = allPercentages.length > 0
          ? Math.round(allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length)
          : 0;

        return {
          rowNumber: index + 1,
          studentName: student.name,
          year: student.year,
          unit: student.unit || '-',
          groupName: getGroupName(student.groupId),
          weeklyScores,
          annualAverage
        };
      });

      setWeeklyReportData(weeklyData);
    } catch (error) {
      logger.error('Error generating report:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportReport = () => {
    try {
      if (viewMode === 'weekly') {
        // Export week-based view
        exportGrandReportWeeklyToExcel(
          assessments,
          students,
          groups,
          selectedYear,
          selectedGroup
        );
      } else {
        // Export detailed view with all individual assessment columns (default for summary and detailed modes)
        exportGrandReportDetailedToExcel(
          detailedReportData,
          uniqueAssessments,
          students,
          groups,
          selectedYear
        );
      }
    } catch (error) {
      logger.error('Export failed:', error);
    }
  };

  const handleExportUnitWeeklyPerformance = () => {
    try {
      if (!selectedUnit) {
        logger.warn('Please select a unit first');
        return;
      }

      if (selectedYear === 'all') {
        logger.warn('Please select a specific year (2 or 3) for unit reports');
        return;
      }

      exportUnitWeeklyPerformanceWithTrendsAndCharts(
        selectedUnit,
        selectedYear as number,
        assessments,
        students,
        groups
      );
    } catch (error) {
      logger.error('Unit export failed:', error);
    }
  };

  const handleExportGroupPerformanceSummary = () => {
    try {
      const year = selectedYear !== 'all' ? selectedYear as number : undefined;
      exportGroupPerformanceSummary(
        attendance,
        assessments,
        students,
        groups,
        users,
        year
      );
    } catch (error) {
      logger.error('Group performance export failed:', error);
    }
  };

  // Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await AuthService.getAllUsers();
        setUsers(usersData);
      } catch (error) {
        logger.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedYear !== 'all' || selectedGroup !== 'all') {
      generateGrandReport();
    } else {
      setReportData([]);
      setSummaryStats({
        totalStudents: 0,
        totalGroups: 0,
        totalAttendance: 0,
        totalAssessments: 0,
        averageAttendanceRate: 0,
        averageScore: 0,
      });
    }
  }, [selectedYear, selectedGroup, students, groups, attendance, assessments]);

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Grand Report - Comprehensive Overview
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Filter by Year"
                  onChange={(e) => setSelectedYear(e.target.value as number | 'all')}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <MenuItem key={year} value={year}>Year {year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Group</InputLabel>
                <Select
                  value={selectedGroup}
                  label="Filter by Group"
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <MenuItem value="all">All Groups</MenuItem>
                  {filteredGroups.map(group => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Filter by Unit</InputLabel>
                <Select
                  value={selectedUnit}
                  label="Filter by Unit"
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={selectedYear === 'all' || (selectedYear !== 2 && selectedYear !== 3)}
                >
                  <MenuItem value="">All Units</MenuItem>
                  {units.map(unit => (
                    <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                onClick={generateGrandReport}
                disabled={loadingReport}
              >
                Generate Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportReport}
                disabled={loadingReport}
              >
                Export Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Group Performance Summary Export */}
      <Card sx={{ mb: 3, bgcolor: '#fff3e0' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <School sx={{ mr: 1 }} />
            Group Performance Summary
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Compare all groups with rankings, top performers, and detailed statistics across 3 comprehensive sheets
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                {selectedYear !== 'all'
                  ? `Export group comparison for Year ${selectedYear}`
                  : 'Export group comparison for All Years'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<School />}
                onClick={handleExportGroupPerformanceSummary}
                disabled={loadingReport}
                fullWidth
              >
                Export Group Summary
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                3 sheets: Comparison, Statistics, Rankings
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Unit Weekly Performance Export - Always visible with instruction */}
      <Card sx={{ mb: 3, bgcolor: selectedYear === 2 || selectedYear === 3 ? '#f0f7ff' : '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ mr: 1 }} />
            Unit Weekly Performance Report (With Trends & Charts)
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Export detailed weekly performance with trends, statistics, and visual dashboard for specific units (Week 1-10)
          </Typography>
          {(selectedYear !== 2 && selectedYear !== 3) && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <strong>Please select Year 2 or Year 3</strong> to access Unit Weekly Performance reports. Units are only available for these years.
            </Alert>
          )}
          {(selectedYear === 2 || selectedYear === 3) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Unit</InputLabel>
                    <Select
                      value={selectedUnit}
                      label="Select Unit"
                      onChange={(e) => setSelectedUnit(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Select a unit</em>
                      </MenuItem>
                      {units.map(unit => (
                        <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<BarChart />}
                    onClick={handleExportUnitWeeklyPerformance}
                    disabled={!selectedUnit || loadingReport}
                    fullWidth
                  >
                    Export Unit Report
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Includes: 4 sheets (Details, Weekly Summary, Statistics, Charts)
                  </Alert>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>

      {selectedYear === 'all' && selectedGroup === 'all' ? (
        <Alert severity="info">
          Please select a specific year or group to view the grand report.
        </Alert>
      ) : (
        <>
          {/* Summary Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.totalStudents}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Students
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <School sx={{ color: 'success.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.totalGroups}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Groups
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Assessment sx={{ color: 'warning.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.totalAttendance}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Attendance Records
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BarChart sx={{ color: 'error.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.totalAssessments}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Assessment Records
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ color: 'info.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.averageAttendanceRate}%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Attendance Rate
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ color: 'secondary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summaryStats.averageScore}%</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Score
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Report Table */}
          {loadingReport ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6">
                    Student Report ({reportData.length} students)
                  </Typography>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, newMode) => {
                      if (newMode !== null) {
                        setViewMode(newMode);
                      }
                    }}
                    size="small"
                  >
                    <ToggleButton value="summary">
                      <Tooltip title="Summary view with aggregated scores">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ViewList fontSize="small" />
                          <span>Summary</span>
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="detailed">
                      <Tooltip title="Detailed view with individual assessment scores">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TableChart fontSize="small" />
                          <span>By Assessment</span>
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="weekly">
                      <Tooltip title="Week-based view showing weekly performance">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday fontSize="small" />
                          <span>By Week</span>
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <TableContainer component={Paper} sx={{ maxHeight: 600, overflowX: 'auto' }}>
                  {viewMode === 'summary' && (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Student ID</TableCell>
                          <TableCell>Year</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Group</TableCell>
                          <TableCell align="center">Attendance Rate</TableCell>
                          <TableCell align="center">Average Score</TableCell>
                          <TableCell align="center">Total Assessments</TableCell>
                          <TableCell align="center">Total Attendance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((student, index) => (
                          <TableRow key={index}>
                            <TableCell>{student.studentName}</TableCell>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>
                              <Chip label={`Year ${student.year}`} size="small" />
                            </TableCell>
                            <TableCell>{student.unit || '-'}</TableCell>
                            <TableCell>{student.group}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${student.attendanceRate}%`}
                                color={student.attendanceRate >= 80 ? 'success' : student.attendanceRate >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${student.averageScore}%`}
                                color={student.averageScore >= 80 ? 'success' : student.averageScore >= 70 ? 'primary' : student.averageScore >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">{student.totalAssessments}</TableCell>
                            <TableCell align="center">{student.totalAttendance}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {viewMode === 'detailed' && (
                    <Table size="small" sx={{ minWidth: 1200 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>#</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Student Name</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 220, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Year</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 280, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Unit</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 340, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Group</TableCell>
                          {/* Dynamic assessment columns */}
                          {uniqueAssessments.map((assessment, idx) => (
                            <TableCell key={idx} align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                              <Box>
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                                  {assessment.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ({assessment.maxScore})
                                </Typography>
                              </Box>
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Average %</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Attendance %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailedReportData.map((student, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{student.rowNumber}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1 }}>{student.studentName}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 220, bgcolor: 'background.paper', zIndex: 1 }}>
                              <Chip label={student.year} size="small" />
                            </TableCell>
                            <TableCell sx={{ position: 'sticky', left: 280, bgcolor: 'background.paper', zIndex: 1 }}>{student.unit}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 340, bgcolor: 'background.paper', zIndex: 1 }}>{student.groupName}</TableCell>
                            {/* Dynamic assessment score columns */}
                            {uniqueAssessments.map((assessment, idx) => {
                              const scoreData = student.assessmentScores[assessment.key];
                              if (scoreData) {
                                const percentage = (scoreData.score / scoreData.maxScore) * 100;
                                return (
                                  <TableCell
                                    key={idx}
                                    align="center"
                                    sx={{
                                      bgcolor: getScoreBgColor(scoreData.score, scoreData.maxScore),
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {scoreData.score}
                                  </TableCell>
                                );
                              } else {
                                return (
                                  <TableCell key={idx} align="center" sx={{ color: 'text.disabled' }}>
                                    -
                                  </TableCell>
                                );
                              }
                            })}
                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                              <Chip
                                label={`${student.averageScore}%`}
                                color={student.averageScore >= 85 ? 'success' : student.averageScore >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                              <Chip
                                label={`${student.attendancePercentage}%`}
                                color={student.attendancePercentage >= 85 ? 'success' : student.attendancePercentage >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {viewMode === 'weekly' && (
                    <Table size="small" sx={{ minWidth: 1200 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>#</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Student Name</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 220, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Year</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 280, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Unit</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 340, bgcolor: 'background.paper', zIndex: 1, fontWeight: 'bold' }}>Group</TableCell>
                          {/* Dynamic week columns */}
                          {sortedWeeks.map((week, idx) => (
                            <TableCell key={idx} align="center" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                              <Tooltip title={`Assessment: ${week.assessmentName} | Unit: ${week.unit}`} arrow>
                                <Box>
                                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                                    {week.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {week.assessmentName}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Annual Avg</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {weeklyReportData.map((student, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{student.rowNumber}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1 }}>{student.studentName}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 220, bgcolor: 'background.paper', zIndex: 1 }}>
                              <Chip label={student.year} size="small" />
                            </TableCell>
                            <TableCell sx={{ position: 'sticky', left: 280, bgcolor: 'background.paper', zIndex: 1 }}>{student.unit}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 340, bgcolor: 'background.paper', zIndex: 1 }}>{student.groupName}</TableCell>
                            {/* Dynamic week score columns */}
                            {sortedWeeks.map((week, idx) => {
                              const weekScore = student.weeklyScores[week.weekNumber];
                              if (weekScore) {
                                const percentage = weekScore.percentage;
                                const bgColor = percentage >= 85 ? '#e8f5e9' : percentage >= 60 ? '#fff9c4' : '#ffebee';
                                return (
                                  <TableCell
                                    key={idx}
                                    align="center"
                                    sx={{
                                      bgcolor: bgColor,
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    <Tooltip title={`${weekScore.assessmentCount} assessment(s)`} arrow>
                                      <span>{percentage}%</span>
                                    </Tooltip>
                                  </TableCell>
                                );
                              } else {
                                return (
                                  <TableCell key={idx} align="center" sx={{ color: 'text.disabled' }}>
                                    -
                                  </TableCell>
                                );
                              }
                            })}
                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                              <Chip
                                label={`${student.annualAverage}%`}
                                color={student.annualAverage >= 85 ? 'success' : student.annualAverage >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default AdminReport;

