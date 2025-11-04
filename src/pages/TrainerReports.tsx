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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Download,
  Assessment,
  People,
  School,
  Person,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { exportCombinedReportToExcel } from '../utils/excelUtils';
import { Student } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`trainer-tabpanel-${index}`}
      aria-labelledby={`trainer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TrainerReports: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();
  
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [tabValue, setTabValue] = useState(0);
  const [trainerStats, setTrainerStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Get all trainers from the system
  const trainers = Array.from(new Set([
    ...attendance.map(a => ({ id: a.trainerId, name: `Trainer ${a.trainerId.slice(-4)}` })),
    ...assessments.map(a => ({ id: a.trainerId, name: `Trainer ${a.trainerId.slice(-4)}` }))
  ])).filter((trainer, index, self) => 
    index === self.findIndex(t => t.id === trainer.id)
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const generateTrainerStats = () => {
    setLoadingStats(true);
    
    const filteredAttendance = selectedTrainer !== 'all' ? 
      attendance.filter(a => a.trainerId === selectedTrainer) : attendance;
    const filteredAssessments = selectedTrainer !== 'all' ? 
      assessments.filter(a => a.trainerId === selectedTrainer) : assessments;
    
    const yearFilteredAttendance = selectedYear !== 'all' ? 
      filteredAttendance.filter(a => a.year === selectedYear) : filteredAttendance;
    const yearFilteredAssessments = selectedYear !== 'all' ? 
      filteredAssessments.filter(a => a.year === selectedYear) : filteredAssessments;

    // Group by trainer
    const trainerData = trainers.map(trainer => {
      const trainerAttendance = yearFilteredAttendance.filter(a => a.trainerId === trainer.id);
      const trainerAssessments = yearFilteredAssessments.filter(a => a.trainerId === trainer.id);
      
      // Get unique students for this trainer
      const trainerStudents = Array.from(new Set([
        ...trainerAttendance.map(a => a.studentId),
        ...trainerAssessments.map(a => a.studentId)
      ])).map(studentId => students.find(s => s.id === studentId)).filter(Boolean);

      // Calculate statistics
      const totalAttendanceRecords = trainerAttendance.length;
      const presentRecords = trainerAttendance.filter(a => 
        a.status === 'present' || a.status === 'late'
      ).length;
      const attendanceRate = totalAttendanceRecords > 0 ? 
        Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;

      const totalAssessments = trainerAssessments.length;
      const totalScore = trainerAssessments.reduce((sum, a) => sum + a.score, 0);
      const totalMaxScore = trainerAssessments.reduce((sum, a) => sum + a.maxScore, 0);
      const averageScore = totalMaxScore > 0 ? 
        Math.round((totalScore / totalMaxScore) * 100) : 0;

      // Get assessment types breakdown
      const assessmentTypes = trainerAssessments.reduce((acc, assessment) => {
        acc[assessment.assessmentType] = (acc[assessment.assessmentType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      return {
        trainerId: trainer.id,
        trainerName: trainer.name,
        totalStudents: trainerStudents.length,
        totalAttendanceRecords,
        attendanceRate,
        totalAssessments,
        averageScore,
        assessmentTypes,
        trainerAttendance,
        trainerAssessments,
      };
    });

    setTrainerStats(trainerData);
    setLoadingStats(false);
  };

  const handleExportTrainerReport = (trainerId: string) => {
    try {
      const trainer = trainers.find(t => t.id === trainerId);
      if (!trainer) return;

      // Filter data for this specific trainer
      const trainerAttendance = attendance.filter(a => a.trainerId === trainerId);
      const trainerAssessments = assessments.filter(a => a.trainerId === trainerId);
      const trainerStudents = Array.from(new Set([
        ...trainerAttendance.map(a => a.studentId),
        ...trainerAssessments.map(a => a.studentId)
      ])).map(studentId => students.find(s => s.id === studentId)).filter((student): student is Student => student !== undefined);

      // Create custom export for this trainer
      const year = selectedYear !== 'all' ? selectedYear as number : undefined;
      exportCombinedReportToExcel(trainerAttendance, trainerAssessments, trainerStudents, groups, year);
    } catch (error) {
      logger.error('Export failed:', error);
    }
  };

  useEffect(() => {
    if (selectedTrainer !== 'all' || selectedYear !== 'all') {
      generateTrainerStats();
    } else {
      setTrainerStats([]);
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
        Trainer Reports
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Select Trainer</InputLabel>
                <Select
                  value={selectedTrainer}
                  label="Select Trainer"
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                >
                  <MenuItem value="all">All Trainers</MenuItem>
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>{trainer.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Select Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Select Year"
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
              <Button
                variant="contained"
                onClick={generateTrainerStats}
                disabled={loadingStats}
              >
                Generate Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedTrainer === 'all' && selectedYear === 'all' ? (
        <Alert severity="info">
          Please select a specific trainer or year to view reports.
        </Alert>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="trainer report tabs">
              <Tab label="Overview" />
              <Tab label="Detailed Reports" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {/* Overview Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Person sx={{ color: 'primary.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">{trainers.length}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Trainers
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
                      <People sx={{ color: 'success.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {trainerStats.reduce((sum, t) => sum + t.totalStudents, 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Students
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
                      <Assessment sx={{ color: 'warning.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {trainerStats.reduce((sum, t) => sum + t.totalAttendanceRecords, 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Attendance Records
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
                      <School sx={{ color: 'error.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h4">
                          {trainerStats.reduce((sum, t) => sum + t.totalAssessments, 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Assessment Records
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Trainer Statistics Table */}
            {loadingStats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Trainer Performance Summary
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Trainer</TableCell>
                          <TableCell align="center">Students</TableCell>
                          <TableCell align="center">Attendance Rate</TableCell>
                          <TableCell align="center">Avg Score</TableCell>
                          <TableCell align="center">Assessments</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trainerStats.map((trainer) => (
                          <TableRow key={trainer.trainerId}>
                            <TableCell>{trainer.trainerName}</TableCell>
                            <TableCell align="center">{trainer.totalStudents}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${trainer.attendanceRate}%`}
                                color={trainer.attendanceRate >= 80 ? 'success' : trainer.attendanceRate >= 60 ? 'warning' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${trainer.averageScore}%`}
                                color={trainer.averageScore >= 80 ? 'success' : trainer.averageScore >= 70 ? 'primary' : trainer.averageScore >= 60 ? 'warning' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="center">{trainer.totalAssessments}</TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={() => handleExportTrainerReport(trainer.trainerId)}
                              >
                                Export
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Detailed Reports */}
            {trainerStats.map((trainer) => (
              <Card key={trainer.trainerId} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{trainer.trainerName}</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => handleExportTrainerReport(trainer.trainerId)}
                    >
                      Export Report
                    </Button>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Students: {trainer.totalStudents}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Attendance Rate: {trainer.attendanceRate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Score: {trainer.averageScore}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Assessments: {trainer.totalAssessments}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Assessment Types:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {Object.entries(trainer.assessmentTypes).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type}: ${count}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </TabPanel>
        </>
      )}
    </Box>
  );
};

export default TrainerReports;
