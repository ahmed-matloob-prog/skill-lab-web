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
  Person,
  TrendingUp,
  ViewList,
  TableChart,
  CalendarToday,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { exportGrandReportDetailedToExcel, exportGrandReportWeeklyToExcel } from '../utils/excelUtils';
import { Student, User } from '../types';
import AuthService from '../services/authService';

const TrainerReports: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();

  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [loadingStats, setLoadingStats] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Grand Report states
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'weekly'>('summary');
  const [reportData, setReportData] = useState<any[]>([]);
  const [detailedReportData, setDetailedReportData] = useState<any[]>([]);
  const [uniqueAssessments, setUniqueAssessments] = useState<any[]>([]);
  const [weeklyReportData, setWeeklyReportData] = useState<any[]>([]);
  const [sortedWeeks, setSortedWeeks] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalAttendance: 0,
    totalAssessments: 0,
    averageAttendanceRate: 0,
    averageScore: 0,
  });

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

  // Helper function to get trainer name by ID
  const getTrainerName = (trainerId: string): string => {
    const trainer = users.find(u => u.id === trainerId);
    return trainer ? trainer.username : `Unknown (${trainerId.slice(-4)})`;
  };

  // Get all unique trainer IDs from attendance and assessments
  const trainerIds = Array.from(new Set([
    ...attendance.map(a => a.trainerId),
    ...assessments.map(a => a.trainerId)
  ]));

  // Create trainers list with proper names
  const trainers = trainerIds.map(id => ({
    id,
    name: getTrainerName(id)
  }));

  const generateGrandReport = () => {
    setLoadingStats(true);

    try {
      // Filter by trainer and year
      const trainerFilteredAttendance = selectedTrainer !== 'all' ?
        attendance.filter(a => a.trainerId === selectedTrainer) : attendance;
      const trainerFilteredAssessments = selectedTrainer !== 'all' ?
        assessments.filter(a => a.trainerId === selectedTrainer && a.exportedToAdmin === true) :
        assessments.filter(a => a.exportedToAdmin === true);

      const yearFilteredAttendance = selectedYear !== 'all' ?
        trainerFilteredAttendance.filter(a => a.year === selectedYear) : trainerFilteredAttendance;
      const yearFilteredAssessments = selectedYear !== 'all' ?
        trainerFilteredAssessments.filter(a => a.year === selectedYear) : trainerFilteredAssessments;

      // Get all students who have attendance or assessment records
      const studentIds = Array.from(new Set([
        ...yearFilteredAttendance.map(a => a.studentId),
        ...yearFilteredAssessments.map(a => a.studentId)
      ]));
      const filteredStudents = students.filter(s => studentIds.includes(s.id));

      // Calculate summary statistics
      const totalStudents = filteredStudents.length;
      const uniqueGroups = Array.from(new Set(filteredStudents.map(s => s.groupId)));
      const totalGroups = uniqueGroups.length;
      const totalAttendance = yearFilteredAttendance.length;
      const totalAssessments = yearFilteredAssessments.length;

      const presentRecords = yearFilteredAttendance.filter(a =>
        a.status === 'present' || a.status === 'late'
      ).length;
      const averageAttendanceRate = totalAttendance > 0 ?
        Math.round((presentRecords / totalAttendance) * 100) : 0;

      const totalScore = yearFilteredAssessments.reduce((sum, a) => sum + a.score, 0);
      const totalMaxScore = yearFilteredAssessments.reduce((sum, a) => sum + a.maxScore, 0);
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

      // Collect unique assessments for detailed view
      const assessmentMap = new Map();
      yearFilteredAssessments.forEach(assessment => {
        const key = `${assessment.assessmentName}_${assessment.assessmentType}_${assessment.maxScore}_${assessment.date}`;
        if (!assessmentMap.has(key)) {
          assessmentMap.set(key, {
            name: assessment.assessmentName,
            type: assessment.assessmentType,
            maxScore: assessment.maxScore,
            date: assessment.date,
            unit: assessment.unit || '-',
            week: assessment.week || 0,
          });
        }
      });

      const sortedAssessments = Array.from(assessmentMap.values()).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
      setUniqueAssessments(sortedAssessments);

      // Generate summary report data
      const reportData = filteredStudents.map((student, index) => {
        const studentAttendance = yearFilteredAttendance.filter(a => a.studentId === student.id);
        const studentAssessments = yearFilteredAssessments.filter(a => a.studentId === student.id);

        const studentPresent = studentAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = studentAttendance.length > 0 ?
          Math.round((studentPresent / studentAttendance.length) * 100) : 0;

        const studentTotalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
        const studentMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
        const studentAverageScore = studentMaxScore > 0 ?
          Math.round((studentTotalScore / studentMaxScore) * 100) : 0;

        return {
          rowNumber: index + 1,
          studentId: student.id,
          studentName: student.name,
          groupName: groups.find(g => g.id === student.groupId)?.name || '-',
          year: student.year,
          attendanceRate,
          averageScore: studentAverageScore,
          totalAssessments: studentAssessments.length,
        };
      });
      setReportData(reportData);

      // Generate detailed report with assessment scores
      const detailedData = filteredStudents.map((student, index) => {
        const studentAttendance = yearFilteredAttendance.filter(a => a.studentId === student.id);
        const studentAssessments = yearFilteredAssessments.filter(a => a.studentId === student.id);

        const studentPresent = studentAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = studentAttendance.length > 0 ?
          Math.round((studentPresent / studentAttendance.length) * 100) : 0;

        const studentTotalScore = studentAssessments.reduce((sum, a) => sum + a.score, 0);
        const studentMaxScore = studentAssessments.reduce((sum, a) => sum + a.maxScore, 0);
        const studentAverageScore = studentMaxScore > 0 ?
          Math.round((studentTotalScore / studentMaxScore) * 100) : 0;

        // Map scores by assessment key
        const scoresMap: { [key: string]: { score: number; maxScore: number } } = {};
        studentAssessments.forEach(assessment => {
          const key = `${assessment.assessmentName}_${assessment.assessmentType}_${assessment.maxScore}_${assessment.date}`;
          scoresMap[key] = {
            score: assessment.score,
            maxScore: assessment.maxScore
          };
        });

        return {
          rowNumber: index + 1,
          studentId: student.id,
          studentName: student.name,
          groupName: groups.find(g => g.id === student.groupId)?.name || '-',
          year: student.year,
          attendanceRate,
          assessmentScores: scoresMap,
          averageScore: studentAverageScore,
          totalAssessments: studentAssessments.length,
        };
      });
      setDetailedReportData(detailedData);

      // Generate weekly report data
      interface WeekData {
        weekNumber: number;
        assessment: any;
        date: Date;
        unit: string;
      }

      const weekMap = new Map<number, WeekData>();
      yearFilteredAssessments
        .filter(assessment => assessment.week !== undefined)
        .forEach(assessment => {
          if (!weekMap.has(assessment.week!)) {
            weekMap.set(assessment.week!, {
              weekNumber: assessment.week!,
              assessment,
              date: new Date(assessment.date),
              unit: assessment.unit || '-'
            });
          }
        });

      const sortedWeeksList = Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
      setSortedWeeks(sortedWeeksList);

      const weeklyData = filteredStudents.map((student, index) => {
        const studentAttendance = yearFilteredAttendance.filter(a => a.studentId === student.id);
        const studentAssessments = yearFilteredAssessments.filter(a => a.studentId === student.id);

        const studentPresent = studentAttendance.filter(a =>
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = studentAttendance.length > 0 ?
          Math.round((studentPresent / studentAttendance.length) * 100) : 0;

        // Map weekly scores
        const weeklyScores: { [key: number]: { percentage: number; assessmentCount: number } } = {};
        let annualTotal = 0;
        let annualCount = 0;

        sortedWeeksList.forEach(week => {
          const weekAssessments = studentAssessments.filter(a => a.week === week.weekNumber);
          if (weekAssessments.length > 0) {
            const weekScore = weekAssessments.reduce((sum, a) => sum + a.score, 0);
            const weekMaxScore = weekAssessments.reduce((sum, a) => sum + a.maxScore, 0);
            const weekPercentage = weekMaxScore > 0 ?
              Math.round((weekScore / weekMaxScore) * 100) : 0;

            weeklyScores[week.weekNumber] = {
              percentage: weekPercentage,
              assessmentCount: weekAssessments.length
            };

            annualTotal += weekPercentage;
            annualCount += 1;
          }
        });

        const annualAverage = annualCount > 0 ? Math.round(annualTotal / annualCount) : 0;

        return {
          rowNumber: index + 1,
          studentId: student.id,
          studentName: student.name,
          groupName: groups.find(g => g.id === student.groupId)?.name || '-',
          year: student.year,
          attendanceRate,
          weeklyScores,
          annualAverage,
        };
      });
      setWeeklyReportData(weeklyData);

    } catch (error) {
      logger.error('Error generating grand report:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExportGrandReport = () => {
    try {
      // Get students that have assessments from selected trainer
      const trainerFilteredAttendance = selectedTrainer !== 'all' ?
        attendance.filter(a => a.trainerId === selectedTrainer) : attendance;
      const trainerFilteredAssessments = selectedTrainer !== 'all' ?
        assessments.filter(a => a.trainerId === selectedTrainer && a.exportedToAdmin === true) :
        assessments.filter(a => a.exportedToAdmin === true);

      const studentIds = Array.from(new Set([
        ...trainerFilteredAttendance.map(a => a.studentId),
        ...trainerFilteredAssessments.map(a => a.studentId)
      ]));
      const filteredStudents = students.filter(s => studentIds.includes(s.id));

      if (viewMode === 'weekly') {
        // Pass ALL assessments but only filtered students
        // The export function will match assessments to these students
        exportGrandReportWeeklyToExcel(
          assessments, // Pass all assessments, export function will filter by student
          filteredStudents, // Only students with trainer's data
          groups,
          selectedYear !== 'all' ? selectedYear as number : 'all',
          'all' // selectedGroup - using 'all' since we filter by trainer instead
        );
      } else {
        // Use detailed report data
        exportGrandReportDetailedToExcel(
          detailedReportData,
          uniqueAssessments,
          filteredStudents, // Only students with trainer's data
          groups,
          selectedYear !== 'all' ? selectedYear as number : 'all'
        );
      }
    } catch (error) {
      logger.error('Export failed:', error);
    }
  };

  useEffect(() => {
    if (selectedTrainer !== 'all' || selectedYear !== 'all') {
      generateGrandReport();
    } else {
      setReportData([]);
      setDetailedReportData([]);
      setWeeklyReportData([]);
    }
  }, [selectedTrainer, selectedYear, attendance, assessments, students]);

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
        Trainer Reports - Comprehensive Overview
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Trainer</InputLabel>
                <Select
                  value={selectedTrainer}
                  label="Filter by Trainer"
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                >
                  <MenuItem value="all">All Trainers</MenuItem>
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>{trainer.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
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
              <Button
                variant="contained"
                onClick={generateGrandReport}
                disabled={loadingStats}
                fullWidth
              >
                Generate Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportGrandReport}
                disabled={loadingStats || reportData.length === 0}
                fullWidth
              >
                Export Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedTrainer === 'all' && selectedYear === 'all' ? (
        <Alert severity="info">
          Please select a specific trainer or year to view the grand report.
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
                    <Person sx={{ color: 'error.main', mr: 2 }} />
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
            <Grid item xs={12} sm={6} md={2}>
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
            <Grid item xs={12} sm={6} md={2}>
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
          {loadingStats ? (
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
                          <span>Weekly</span>
                        </Box>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Summary View */}
                {viewMode === 'summary' && (
                  <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Group</TableCell>
                          <TableCell align="center">Year</TableCell>
                          <TableCell align="center">Attendance Rate</TableCell>
                          <TableCell align="center">Average Score</TableCell>
                          <TableCell align="center">Total Assessments</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.map((row) => (
                          <TableRow key={row.studentId}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>{row.groupName}</TableCell>
                            <TableCell align="center">{row.year}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${row.attendanceRate}%`}
                                color={row.attendanceRate >= 80 ? 'success' : row.attendanceRate >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${row.averageScore}%`}
                                color={row.averageScore >= 80 ? 'success' : row.averageScore >= 70 ? 'primary' : row.averageScore >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">{row.totalAssessments}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Detailed View - By Assessment */}
                {viewMode === 'detailed' && (
                  <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3 }}>#</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 3 }}>Student Name</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 3 }}>Group</TableCell>
                          <TableCell align="center">Year</TableCell>
                          <TableCell align="center">Attendance</TableCell>
                          {uniqueAssessments.map((assessment, idx) => (
                            <TableCell key={idx} align="center" sx={{ minWidth: 100 }}>
                              <Tooltip title={`${assessment.type} - ${assessment.unit} - ${new Date(assessment.date).toLocaleDateString()}`}>
                                <Box>
                                  <Typography variant="caption" display="block">
                                    {assessment.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    W{assessment.week} ({assessment.maxScore})
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>Avg %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailedReportData.map((row) => (
                          <TableRow key={row.studentId}>
                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{row.rowNumber}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1 }}>{row.studentName}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 1 }}>{row.groupName}</TableCell>
                            <TableCell align="center">{row.year}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${row.attendanceRate}%`}
                                color={row.attendanceRate >= 80 ? 'success' : row.attendanceRate >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            {uniqueAssessments.map((assessment, idx) => {
                              const key = `${assessment.name}_${assessment.type}_${assessment.maxScore}_${assessment.date}`;
                              const scoreData = row.assessmentScores[key];
                              return (
                                <TableCell key={idx} align="center">
                                  {scoreData ? (
                                    <Chip
                                      label={`${scoreData.score}/${scoreData.maxScore}`}
                                      color={
                                        (scoreData.score / scoreData.maxScore) >= 0.8 ? 'success' :
                                        (scoreData.score / scoreData.maxScore) >= 0.7 ? 'primary' :
                                        (scoreData.score / scoreData.maxScore) >= 0.6 ? 'warning' : 'error'
                                      }
                                      size="small"
                                    />
                                  ) : '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>
                              <Chip
                                label={`${row.averageScore}%`}
                                color={row.averageScore >= 80 ? 'success' : row.averageScore >= 70 ? 'primary' : row.averageScore >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Weekly View */}
                {viewMode === 'weekly' && (
                  <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3 }}>#</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 3 }}>Student Name</TableCell>
                          <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 3 }}>Group</TableCell>
                          <TableCell align="center">Year</TableCell>
                          <TableCell align="center">Attendance</TableCell>
                          {sortedWeeks.map((week) => (
                            <TableCell key={week.weekNumber} align="center" sx={{ minWidth: 80 }}>
                              <Tooltip title={`Unit: ${week.unit} - ${new Date(week.date).toLocaleDateString()}`}>
                                <Typography variant="caption">
                                  W{week.weekNumber}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>
                            Annual Avg
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {weeklyReportData.map((row) => (
                          <TableRow key={row.studentId}>
                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{row.rowNumber}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 40, bgcolor: 'background.paper', zIndex: 1 }}>{row.studentName}</TableCell>
                            <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 1 }}>{row.groupName}</TableCell>
                            <TableCell align="center">{row.year}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${row.attendanceRate}%`}
                                color={row.attendanceRate >= 80 ? 'success' : row.attendanceRate >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            {sortedWeeks.map((week) => {
                              const weekScore = row.weeklyScores[week.weekNumber];
                              return (
                                <TableCell key={week.weekNumber} align="center">
                                  {weekScore ? (
                                    <Chip
                                      label={`${weekScore.percentage}%`}
                                      color={
                                        weekScore.percentage >= 80 ? 'success' :
                                        weekScore.percentage >= 70 ? 'primary' :
                                        weekScore.percentage >= 60 ? 'warning' : 'error'
                                      }
                                      size="small"
                                    />
                                  ) : '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>
                              <Chip
                                label={`${row.annualAverage}%`}
                                color={row.annualAverage >= 80 ? 'success' : row.annualAverage >= 70 ? 'primary' : row.annualAverage >= 60 ? 'warning' : 'error'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default TrainerReports;
