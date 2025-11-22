import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
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
  IconButton,
  Tabs,
  Tab,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Refresh,
  Save,
  Visibility,
  VisibilityOff,
  Assessment,
  People,
  Download,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { logger } from '../utils/logger';
import { Student, AttendanceRecord, AssessmentRecord } from '../types';
import { exportAttendanceToExcel, exportAssessmentsToExcel } from '../utils/excelUtils';

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
      id={`attendance-assessment-tabpanel-${index}`}
      aria-labelledby={`attendance-assessment-tab-${index}`}
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

const AttendanceAssessment: React.FC = () => {
  const { 
    students, 
    groups, 
    addAttendanceRecord, 
    updateAttendanceRecord, 
    getAttendanceByDate,
    addAssessmentRecord,
    getAssessmentsByGroup,
    loading 
  } = useDatabase();
  const { user } = useAuth();
  const location = useLocation();
  
  // Main state - set initial tab based on route
  const [tabValue, setTabValue] = useState(location.pathname === '/assessments' ? 1 : 0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // Assessment state
  const [showSavedScores, setShowSavedScores] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState<AssessmentRecord[]>([]);
  const [assessmentForm, setAssessmentForm] = useState({
    name: '',
    type: 'exam' as 'exam' | 'quiz' | 'assignment' | 'project' | 'presentation',
    maxScore: 100,
    date: dayjs(),
    unit: '',
    week: '' as string | number,
  });
  const [scores, setScores] = useState<{[studentId: string]: string}>({});
  const [loadingSave, setLoadingSave] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const assessmentTypes = [
    { value: 'exam', label: 'Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'project', label: 'Project' },
    { value: 'presentation', label: 'Presentation' },
  ];

  // Unit options based on year
  const getUnitOptions = (year: number | 'all') => {
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

  // Week options (1-12)
  const weekOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Week ${i + 1}`,
  }));

  // Get selected group's year for unit options
  const getSelectedGroupYear = (): number | 'all' => {
    if (selectedGroup !== 'all') {
      const group = groups.find(g => g.id === selectedGroup);
      return group?.year || 'all';
    }
    return selectedYear;
  };

  // Auto-fill unit from group when group changes
  useEffect(() => {
    if (selectedGroup !== 'all') {
      const group = groups.find(g => g.id === selectedGroup);
      if (group?.currentUnit) {
        setAssessmentForm(prev => ({ ...prev, unit: group.currentUnit || '' }));
      } else {
        // Clear unit if group has no currentUnit set
        setAssessmentForm(prev => ({ ...prev, unit: '' }));
      }
    }
  }, [selectedGroup, groups]);

  // Filter students based on user permissions and selected filters
  const filteredStudents = students.filter(student => {
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
    return true;
  });

  // Filter groups based on user permissions
  const accessibleGroups = user?.role === 'admin' ? groups : 
    groups.filter(group => user?.assignedGroups?.includes(group.id));

  const filteredGroups = accessibleGroups.filter(group => {
    if (selectedYear !== 'all' && group.year !== selectedYear) return false;
    return true;
  });

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  // Attendance functions
  const getAttendanceStatus = (studentId: string): 'present' | 'absent' | 'late' | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };

  const handleAttendanceChange = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const existingRecord = attendanceRecords.find(r => r.studentId === studentId);
      const dateString = selectedDate.format('YYYY-MM-DD');
      
      if (existingRecord) {
        await updateAttendanceRecord(existingRecord.id, { status });
        setAttendanceRecords(prev => 
          prev.map(r => r.id === existingRecord.id ? { ...r, status } : r)
        );
      } else {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        const newRecord: Omit<AttendanceRecord, 'id' | 'timestamp'> = {
          studentId,
          date: dateString,
          status,
          synced: false,
          trainerId: user?.id || '',
          year: student.year,
          groupId: student.groupId,
        };
        
        await addAttendanceRecord(newRecord);
        setAttendanceRecords(prev => [...prev, { ...newRecord, id: `temp-${Date.now()}`, timestamp: new Date().toISOString() }]);
      }
    } catch (error) {
      logger.error('Error updating attendance:', error);
    }
  };

  const loadAttendanceForDate = async (date: Dayjs) => {
    setLoadingAttendance(true);
    try {
      const dateString = date.format('YYYY-MM-DD');
      const records = await getAttendanceByDate(dateString);
      
      // Filter attendance records based on user permissions
      const filteredRecords = records.filter(record => {
        // For trainers, only show records from their assigned groups AND assigned years
        if (user?.role === 'trainer') {
          if (user?.assignedGroups && !user.assignedGroups.includes(record.groupId)) {
            return false;
          }
          if (user?.assignedYears && !user.assignedYears.includes(record.year)) {
            return false;
          }
        }
        return true;
      });
      
      setAttendanceRecords(filteredRecords);
    } catch (error) {
      logger.error('Error loading attendance:', error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Assessment functions
  const loadSavedAssessments = async () => {
    if (selectedGroup !== 'all') {
      try {
        const assessments = await getAssessmentsByGroup(selectedGroup);
        
        // Filter assessment records based on user permissions
        const filteredAssessments = assessments.filter(assessment => {
          // For trainers, only show assessments from their assigned groups AND assigned years
          if (user?.role === 'trainer') {
            if (user?.assignedGroups && !user.assignedGroups.includes(assessment.groupId)) {
              return false;
            }
            if (user?.assignedYears && !user.assignedYears.includes(assessment.year)) {
              return false;
            }
          }
          return true;
        });
        
        setSavedAssessments(filteredAssessments);
      } catch (error) {
        logger.error('Error loading saved assessments:', error);
      }
    } else {
      setSavedAssessments([]);
    }
  };

  const handleScoreChange = (studentId: string, score: string) => {
    setScores(prev => ({
      ...prev,
      [studentId]: score
    }));
  };

  const handleSaveAssessment = async () => {
    if (!assessmentForm.name.trim()) {
      setError('Please enter assessment name');
      return;
    }

    const maxScoreNum = assessmentForm.maxScore;
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      setError('Please enter a valid maximum score');
      return;
    }

    // Get the year of selected students to check if unit/week is required
    const groupYear = getSelectedGroupYear();
    const requiresUnitWeek = groupYear === 2 || groupYear === 3;

    // Validate unit for Year 2/3
    if (requiresUnitWeek && !assessmentForm.unit) {
      setError('Please select a Unit for Year 2/3 assessments');
      return;
    }

    // Validate week (mandatory for all years)
    if (!assessmentForm.week) {
      setError('Please select a Week number');
      return;
    }

    const studentsWithScores = Object.keys(scores).filter(studentId => {
      const score = scores[studentId];
      return score && score.trim() !== '';
    });

    if (studentsWithScores.length === 0) {
      setError('Please enter at least one score');
      return;
    }

    setLoadingSave(true);
    setError(null);

    try {
      let successCount = 0;

      for (const studentId of studentsWithScores) {
        const score = parseInt(scores[studentId]);
        if (isNaN(score) || score < 0 || score > maxScoreNum) {
          setError(`Invalid score for student. Score must be between 0 and ${maxScoreNum}`);
          setLoadingSave(false);
          return;
        }

        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        const assessmentData = {
          studentId,
          assessmentName: assessmentForm.name.trim(),
          assessmentType: assessmentForm.type,
          score,
          maxScore: maxScoreNum,
          date: assessmentForm.date.format('YYYY-MM-DD'),
          year: student.year,
          groupId: student.groupId,
          trainerId: user?.id || '',
          synced: false,
          unit: assessmentForm.unit || undefined,
          week: typeof assessmentForm.week === 'number' ? assessmentForm.week : parseInt(assessmentForm.week as string) || undefined,
        };

        await addAssessmentRecord(assessmentData);
        successCount++;
      }

      setError(null);
      setScores({});
      // Keep unit (auto-filled from group) but reset other fields
      const currentGroup = groups.find(g => g.id === selectedGroup);
      setAssessmentForm({
        name: '',
        type: 'exam',
        maxScore: 100,
        date: dayjs(),
        unit: currentGroup?.currentUnit || '',
        week: '',
      });
      await loadSavedAssessments();

      alert(`Assessment scores saved successfully! (${successCount} records)`);
    } catch (error) {
      setError('Failed to save assessment scores');
    } finally {
      setLoadingSave(false);
    }
  };

  const getAttendanceSummary = () => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const total = filteredStudents.length;
    
    return { present, absent, late, total };
  };

  const getStatusIcon = (status: 'present' | 'absent' | 'late' | null) => {
    switch (status) {
      case 'present':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'late':
        return <Schedule sx={{ color: 'warning.main' }} />;
      case 'absent':
        return <Cancel sx={{ color: 'error.main' }} />;
      default:
        return <CheckCircle sx={{ color: 'grey.500' }} />;
    }
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late' | null) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'late':
        return 'warning';
      case 'absent':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleExportAttendance = () => {
    try {
      exportAttendanceToExcel(attendanceRecords, students, groups);
    } catch (error) {
      setError('Failed to export attendance data');
    }
  };

  const handleExportAssessments = () => {
    try {
      exportAssessmentsToExcel(savedAssessments, students, groups);
    } catch (error) {
      setError('Failed to export assessment data');
    }
  };

  useEffect(() => {
    loadAttendanceForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadSavedAssessments();
  }, [selectedGroup]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const attendanceSummary = getAttendanceSummary();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Attendance & Assessment Management
        </Typography>

        {/* Common Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={(newValue) => newValue && setSelectedDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
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
              <Grid item xs={12} sm={3}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => loadAttendanceForDate(selectedDate)}
                  disabled={loadingAttendance}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs for Attendance and Assessment */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="attendance and assessment tabs">
            <Tab 
              icon={<People />} 
              label="Attendance" 
              iconPosition="start"
            />
            <Tab 
              icon={<Assessment />} 
              label="Assessment" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Attendance Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Summary - {selectedDate.format('MMMM DD, YYYY')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`Present: ${attendanceSummary.present}`}
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      icon={<Schedule />}
                      label={`Late: ${attendanceSummary.late}`}
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      icon={<Cancel />}
                      label={`Absent: ${attendanceSummary.absent}`}
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">
                      Total: {attendanceSummary.total}
                    </Typography>
                    {attendanceSummary.total > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Rate: {Math.round(((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100)}%
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Students Attendance Table */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Students ({filteredStudents.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleExportAttendance}
                  size="small"
                >
                  Export Attendance
                </Button>
              </Box>
              {filteredStudents.length === 0 ? (
                <Alert severity="info">
                  No students found for the selected filters.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student Name</TableCell>
                        <TableCell>Student ID</TableCell>
                        <TableCell>Group</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudents.map((student) => {
                        const currentStatus = getAttendanceStatus(student.id);
                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.studentId}</TableCell>
                            <TableCell>{getGroupName(student.groupId)}</TableCell>
                            <TableCell>
                              {currentStatus && (
                                <Chip
                                  icon={getStatusIcon(currentStatus)}
                                  label={currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                                  color={getStatusColor(currentStatus) as any}
                                  size="small"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Button
                                  size="small"
                                  variant={currentStatus === 'present' ? 'contained' : 'outlined'}
                                  color="success"
                                  onClick={() => handleAttendanceChange(student.id, 'present')}
                                >
                                  Present
                                </Button>
                                <Button
                                  size="small"
                                  variant={currentStatus === 'late' ? 'contained' : 'outlined'}
                                  color="warning"
                                  onClick={() => handleAttendanceChange(student.id, 'late')}
                                >
                                  Late
                                </Button>
                                <Button
                                  size="small"
                                  variant={currentStatus === 'absent' ? 'contained' : 'outlined'}
                                  color="error"
                                  onClick={() => handleAttendanceChange(student.id, 'absent')}
                                >
                                  Absent
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Assessment Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Assessment Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Assessment Name *"
                    value={assessmentForm.name}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Assessment Type</InputLabel>
                    <Select
                      value={assessmentForm.type}
                      label="Assessment Type"
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, type: e.target.value as any })}
                    >
                      {assessmentTypes.map(type => (
                        <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Max Score"
                    type="number"
                    value={assessmentForm.maxScore}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, maxScore: parseInt(e.target.value) || 100 })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <DatePicker
                    label="Date"
                    value={assessmentForm.date}
                    onChange={(newValue) => newValue && setAssessmentForm({ ...assessmentForm, date: newValue })}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth required>
                    <InputLabel>Week *</InputLabel>
                    <Select
                      value={assessmentForm.week}
                      label="Week *"
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, week: e.target.value as number })}
                    >
                      {weekOptions.map(week => (
                        <MenuItem key={week.value} value={week.value}>{week.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {/* Unit dropdown - only show for Year 2/3 */}
                {(getSelectedGroupYear() === 2 || getSelectedGroupYear() === 3) && (
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth required>
                      <InputLabel>Unit *</InputLabel>
                      <Select
                        value={assessmentForm.unit}
                        label="Unit *"
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, unit: e.target.value })}
                      >
                        {getUnitOptions(getSelectedGroupYear()).map(unit => (
                          <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item xs={12} sm={getSelectedGroupYear() === 2 || getSelectedGroupYear() === 3 ? 3 : 6}>
                  <ToggleButtonGroup
                    value={showSavedScores}
                    exclusive
                    onChange={(_, value) => setShowSavedScores(value)}
                    aria-label="view mode"
                  >
                    <ToggleButton value={false} aria-label="input mode">
                      <VisibilityOff />
                      Input Scores
                    </ToggleButton>
                    <ToggleButton value={true} aria-label="view mode">
                      <Visibility />
                      View Saved
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Students Scores Table */}
          {!showSavedScores && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Students ({filteredStudents.length})
                </Typography>
                {filteredStudents.length === 0 ? (
                  <Alert severity="info">
                    No students found for the selected filters.
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student Name</TableCell>
                          <TableCell>Group</TableCell>
                          <TableCell align="center">Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{getGroupName(student.groupId)}</TableCell>
                            <TableCell align="center">
                              <TextField
                                size="small"
                                type="number"
                                value={scores[student.id] || ''}
                                onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                placeholder="0"
                                inputProps={{ min: 0, max: assessmentForm.maxScore }}
                                sx={{ width: 100 }}
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

          {/* Saved Scores Section */}
          {showSavedScores && selectedGroup !== 'all' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Saved Assessment Scores
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExportAssessments}
                    size="small"
                  >
                    Export Assessments
                  </Button>
                </Box>
                {savedAssessments.length === 0 ? (
                  <Alert severity="info">
                    No saved assessment scores found for this group.
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Assessment</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="center">Score</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {savedAssessments.map((assessment) => (
                          <TableRow key={assessment.id}>
                            <TableCell>{getStudentName(assessment.studentId)}</TableCell>
                            <TableCell>{assessment.assessmentName}</TableCell>
                            <TableCell>
                              <Chip
                                label={assessment.assessmentType}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {assessment.score}/{assessment.maxScore}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({Math.round((assessment.score / assessment.maxScore) * 100)}%)
                              </Typography>
                            </TableCell>
                            <TableCell>{assessment.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          {!showSavedScores && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Save />}
                onClick={handleSaveAssessment}
                disabled={loadingSave}
              >
                {loadingSave ? <CircularProgress size={24} /> : 'Save Assessment Scores'}
              </Button>
            </Box>
          )}
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
};

export default AttendanceAssessment;
