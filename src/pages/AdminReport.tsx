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
} from '@mui/material';
import {
  Download,
  Assessment,
  People,
  School,
  TrendingUp,
  BarChart,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { exportSimplifiedReportToExcel } from '../utils/excelUtils';
import { Student } from '../types';

const AdminReport: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalAttendance: 0,
    totalAssessments: 0,
    averageAttendanceRate: 0,
    averageScore: 0,
  });

  // Filter students based on selected filters
  const filteredStudents = students.filter(student => {
    if (selectedYear !== 'all' && student.year !== selectedYear) return false;
    if (selectedGroup !== 'all' && student.groupId !== selectedGroup) return false;
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

  const generateGrandReport = () => {
    setLoadingReport(true);
    
    try {
      const filteredAttendance = selectedYear !== 'all' ? 
        attendance.filter(a => a.year === selectedYear) : attendance;
      const filteredAssessments = selectedYear !== 'all' ? 
        assessments.filter(a => a.year === selectedYear) : assessments;
      
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

      // Generate detailed report data
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
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportReport = () => {
    try {
      const year = selectedYear !== 'all' ? selectedYear as number : undefined;
      exportSimplifiedReportToExcel(assessments, students, groups, year);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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
                <Typography variant="h6" gutterBottom>
                  Detailed Student Report ({reportData.length} students)
                </Typography>
                <TableContainer component={Paper}>
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

