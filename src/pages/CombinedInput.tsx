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
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Save,
  Assessment,
  People,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { Student, AttendanceRecord, AssessmentRecord } from '../types';

const CombinedInput: React.FC = () => {
  const { 
    students, 
    groups, 
    attendance,
    assessments,
    addAttendanceRecord, 
    updateAttendanceRecord, 
    getAttendanceByDate,
    addAssessmentRecord,
    loading 
  } = useDatabase();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Assessment form state
  const [assessmentForm, setAssessmentForm] = useState({
    name: '',
    type: 'exam' as 'exam' | 'quiz' | 'assignment' | 'project' | 'presentation',
    maxScore: 100,
  });
  
  // Combined input state - stores both attendance and scores for each student
  const [studentData, setStudentData] = useState<{
    [studentId: string]: {
      attendance: 'present' | 'absent' | 'late' | 'excused' | null;
      score: string;
    }
  }>({});
  
  const [error, setError] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);

  const assessmentTypes = [
    { value: 'exam', label: 'Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'project', label: 'Project' },
    { value: 'presentation', label: 'Presentation' },
  ];

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

  // Week options
  const weekOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `Week ${i + 1}`,
  }));

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
    // Filter by group's currentUnit instead of student's unit field
    if (selectedUnit !== 'all') {
      const studentGroup = groups.find(g => g.id === student.groupId);
      if (studentGroup?.currentUnit !== selectedUnit) return false;
    }
    return true;
  });

  // Filter groups based on user permissions
  const accessibleGroups = user?.role === 'admin' ? groups :
    groups.filter(group => user?.assignedGroups?.includes(group.id));

  // Further filter groups by selected year
  const filteredGroups = selectedYear === 'all'
    ? accessibleGroups
    : accessibleGroups.filter(group => group.year === selectedYear);

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  const getAttendanceStatus = (studentId: string): 'present' | 'absent' | 'late' | 'excused' | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };

  const loadAttendanceForDate = async (date: Dayjs) => {
    setLoadingData(true);
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
      
      // Initialize student data - always start fresh (no pre-selected buttons)
      // Attendance records are stored but we don't pre-populate buttons
      // This forces trainer to make explicit selection each time
      const initialData: { [studentId: string]: { attendance: 'present' | 'absent' | 'late' | 'excused' | null; score: string } } = {};
      filteredStudents.forEach(student => {
        initialData[student.id] = {
          attendance: null,  // Always start with no selection
          score: ''  // Always start with empty score
        };
      });
      setStudentData(initialData);
    } catch (error) {
      logger.error('Error loading attendance:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        attendance: status,
        // Clear score if marking as absent or excused
        score: (status === 'absent' || status === 'excused') ? '' : prev[studentId]?.score || ''
      }
    }));
  };

  const handleScoreChange = (studentId: string, score: string) => {
    setStudentData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: score
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!assessmentForm.name.trim()) {
      setError('Please enter assessment name');
      return;
    }

    const maxScoreNum = assessmentForm.maxScore;
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      setError('Please enter a valid maximum score');
      return;
    }

    // Validate Week is selected (mandatory)
    if (selectedWeek === 'all') {
      setError('Please select a Week number before saving');
      return;
    }

    // Validate Unit is selected for Year 2/3
    if ((selectedYear === 2 || selectedYear === 3) && selectedUnit === 'all') {
      setError('Please select a Unit for Year 2/3 assessments');
      return;
    }

    // Check for duplicate week - warn if assessment already exists for same week + unit + group
    if (selectedGroup !== 'all') {
      const unit = selectedUnit !== 'all' ? selectedUnit : undefined;
      const existingAssessment = assessments.find(a =>
        a.groupId === selectedGroup &&
        a.week === selectedWeek &&
        a.unit === unit &&
        a.exportedToAdmin === true  // Only check exported assessments
      );

      if (existingAssessment) {
        const confirmOverwrite = window.confirm(
          `Warning: An assessment for Week ${selectedWeek}${unit ? ` (${unit})` : ''} already exists for this group and has been exported.\n\n` +
          `Existing assessment: "${existingAssessment.assessmentName}" on ${existingAssessment.date}\n\n` +
          `Do you want to continue and create a new assessment for the same week?`
        );
        if (!confirmOverwrite) {
          return;
        }
      }
    }

    setLoadingSave(true);
    setError(null);

    try {
      const dateString = selectedDate.format('YYYY-MM-DD');
      let attendanceCount = 0;
      let assessmentCount = 0;

      for (const student of filteredStudents) {
        const data = studentData[student.id];
        if (!data) continue;

        // Save attendance if provided
        if (data.attendance) {
          const existingRecord = attendanceRecords.find(r => r.studentId === student.id);
          
          if (existingRecord) {
            await updateAttendanceRecord(existingRecord.id, { status: data.attendance });
          } else {
            const newRecord: Omit<AttendanceRecord, 'id' | 'timestamp'> = {
              studentId: student.id,
              date: dateString,
              status: data.attendance,
              synced: false,
              trainerId: user?.id || '',
              year: student.year,
              groupId: student.groupId,
            };
            await addAttendanceRecord(newRecord);
          }
          attendanceCount++;
        }

        // Handle excused students - create assessment record with isExcused flag
        if (data.attendance === 'excused') {
          const assessmentData = {
            studentId: student.id,
            assessmentName: assessmentForm.name.trim(),
            assessmentType: assessmentForm.type,
            score: 0,  // No score for excused
            maxScore: maxScoreNum,
            date: dateString,
            year: student.year,
            groupId: student.groupId,
            unit: selectedUnit !== 'all' ? selectedUnit : undefined,
            week: selectedWeek as number,
            trainerId: user?.id || '',
            synced: false,
            isExcused: true,  // Mark as excused - excluded from average
          };

          await addAssessmentRecord(assessmentData);
          assessmentCount++;
        }
        // Save assessment score if provided (but not for absent students)
        else if (data.score && data.score.trim() !== '') {
          // Require attendance selection when entering score
          if (!data.attendance) {
            setError(`Please select attendance (Present/Late) for ${student.name} before entering score`);
            setLoadingSave(false);
            return;
          }
          // Prevent saving scores for absent students
          if (data.attendance === 'absent') {
            setError(`Cannot save assessment score for ${student.name} - student is marked as absent`);
            setLoadingSave(false);
            return;
          }

          const score = parseInt(data.score);
          if (isNaN(score) || score < 0 || score > maxScoreNum) {
            setError(`Invalid score for ${student.name}. Score must be between 0 and ${maxScoreNum}`);
            setLoadingSave(false);
            return;
          }

          const assessmentData = {
            studentId: student.id,
            assessmentName: assessmentForm.name.trim(),
            assessmentType: assessmentForm.type,
            score,
            maxScore: maxScoreNum,
            date: dateString,
            year: student.year,
            groupId: student.groupId,
            unit: selectedUnit !== 'all' ? selectedUnit : undefined,
            week: selectedWeek as number,
            trainerId: user?.id || '',
            synced: false,
          };

          await addAssessmentRecord(assessmentData);
          assessmentCount++;
        }
      }

      // Reload data
      await loadAttendanceForDate(selectedDate);
      
      // Clear assessment form
      setAssessmentForm({
        name: '',
        type: 'exam',
        maxScore: 100,
      });

      // Clear scores and attendance selections
      setStudentData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(key => {
          newData[key] = { attendance: null, score: '' };
        });
        return newData;
      });

      alert(`Data saved successfully! ${attendanceCount} attendance records, ${assessmentCount} assessment scores.`);
    } catch (error) {
      setError(`Failed to save data: ${error}`);
    } finally {
      setLoadingSave(false);
    }
  };

  const getStatusIcon = (status: 'present' | 'absent' | 'late' | 'excused' | null) => {
    switch (status) {
      case 'present':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'late':
        return <Schedule sx={{ color: 'warning.main' }} />;
      case 'absent':
        return <Cancel sx={{ color: 'error.main' }} />;
      case 'excused':
        return <Schedule sx={{ color: 'info.main' }} />;
      default:
        return <CheckCircle sx={{ color: 'grey.500' }} />;
    }
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late' | 'excused' | null) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'late':
        return 'warning';
      case 'absent':
        return 'error';
      case 'excused':
        return 'info';
      default:
        return 'default';
    }
  };


  // Reset group selection when year changes
  useEffect(() => {
    if (selectedGroup !== 'all') {
      const selectedGroupData = groups.find(g => g.id === selectedGroup);
      if (selectedGroupData && selectedYear !== 'all' && selectedGroupData.year !== selectedYear) {
        setSelectedGroup('all');
      }
    }
  }, [selectedYear, selectedGroup, groups]);

  useEffect(() => {
    loadAttendanceForDate(selectedDate);
  }, [selectedDate, selectedGroup, selectedYear]);

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
          Combined Input - Attendance & Assessment
        </Typography>

        {/* Date Selection and Filters */}
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
                    onChange={(e) => {
                      const groupId = e.target.value;
                      setSelectedGroup(groupId);

                      // Auto-populate unit based on group's current unit
                      if (groupId !== 'all') {
                        const selectedGroupData = groups.find(g => g.id === groupId);
                        if (selectedGroupData?.currentUnit) {
                          setSelectedUnit(selectedGroupData.currentUnit);
                        }
                      }
                    }}
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
                  onClick={() => loadAttendanceForDate(selectedDate)}
                  disabled={loadingData}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required={selectedYear === 2 || selectedYear === 3}>
                  <InputLabel>{(selectedYear === 2 || selectedYear === 3) ? 'Unit *' : 'Filter by Unit'}</InputLabel>
                  <Select
                    value={selectedUnit}
                    label={(selectedYear === 2 || selectedYear === 3) ? 'Unit *' : 'Filter by Unit'}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    disabled={selectedYear === 'all' || (selectedYear !== 2 && selectedYear !== 3)}
                  >
                    <MenuItem value="all">-- Select Unit --</MenuItem>
                    {getUnitOptions(selectedYear as number).map(unit => (
                      <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Week *</InputLabel>
                  <Select
                    value={selectedWeek}
                    label="Week *"
                    onChange={(e) => setSelectedWeek(e.target.value as number | 'all')}
                  >
                    <MenuItem value="all">-- Select Week --</MenuItem>
                    {weekOptions.map(week => (
                      <MenuItem key={week.value} value={week.value}>{week.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Assessment Details */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Assessment Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Assessment Name *"
                  value={assessmentForm.name}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Max Score"
                  type="number"
                  value={assessmentForm.maxScore}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, maxScore: parseInt(e.target.value) || 100 })}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Combined Input Table */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Students - Combined Input ({filteredStudents.length})
              </Typography>
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
                      <TableCell align="center">Attendance</TableCell>
                      <TableCell align="center">Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const currentData = studentData[student.id] || { attendance: null, score: '' };
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>{getGroupName(student.groupId)}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant={currentData.attendance === 'present' ? 'contained' : 'outlined'}
                                color="success"
                                onClick={() => handleAttendanceChange(student.id, 'present')}
                              >
                                Present
                              </Button>
                              <Button
                                size="small"
                                variant={currentData.attendance === 'late' ? 'contained' : 'outlined'}
                                color="warning"
                                onClick={() => handleAttendanceChange(student.id, 'late')}
                              >
                                Late
                              </Button>
                              <Button
                                size="small"
                                variant={currentData.attendance === 'absent' ? 'contained' : 'outlined'}
                                color="error"
                                onClick={() => handleAttendanceChange(student.id, 'absent')}
                              >
                                Absent
                              </Button>
                              <Button
                                size="small"
                                variant={currentData.attendance === 'excused' ? 'contained' : 'outlined'}
                                color="info"
                                onClick={() => handleAttendanceChange(student.id, 'excused')}
                              >
                                Excused
                              </Button>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small"
                              type="number"
                              value={currentData.score}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              placeholder="0"
                              inputProps={{ min: 0, max: assessmentForm.maxScore }}
                              sx={{ width: 100 }}
                              disabled={currentData.attendance === 'absent' || currentData.attendance === 'excused'}
                              helperText={
                                currentData.attendance === 'absent' ? 'N/A (Absent=0)' :
                                currentData.attendance === 'excused' ? 'N/A (Excused)' : ''
                              }
                            />
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

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSaveAll}
            disabled={loadingSave}
          >
            {loadingSave ? <CircularProgress size={24} /> : 'Save All Data'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default CombinedInput;
