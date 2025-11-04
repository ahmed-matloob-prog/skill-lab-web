import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { Student, AssessmentRecord } from '../types';

const Assessments: React.FC = () => {
  const { students, groups, addAssessmentRecord, getAssessmentsByGroup, loading } = useDatabase();
  const { user } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showSavedScores, setShowSavedScores] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState<AssessmentRecord[]>([]);
  
  // Assessment form state
  const [assessmentForm, setAssessmentForm] = useState({
    name: '',
    type: 'exam' as 'exam' | 'quiz' | 'assignment' | 'project' | 'presentation',
    maxScore: 100,
    date: dayjs(),
  });
  
  // Scores state
  const [scores, setScores] = useState<{[studentId: string]: string}>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);

  const assessmentTypes = [
    { value: 'exam', label: 'Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'project', label: 'Project' },
    { value: 'presentation', label: 'Presentation' },
  ];

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

  // Groups are available for all years, so no need to filter by year
  const filteredGroups = accessibleGroups;

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const loadSavedAssessments = async () => {
    if (selectedGroup !== 'all') {
      try {
        const assessments = await getAssessmentsByGroup(selectedGroup);
        setSavedAssessments(assessments);
      } catch (error) {
        logger.error('Error loading saved assessments:', error);
      }
    } else {
      setSavedAssessments([]);
    }
  };

  useEffect(() => {
    loadSavedAssessments();
  }, [selectedGroup]);

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
        };

        await addAssessmentRecord(assessmentData);
        successCount++;
      }

      setError(null);
      setScores({});
      setAssessmentForm({
        name: '',
        type: 'exam',
        maxScore: 100,
        date: dayjs(),
      });
      await loadSavedAssessments();
      
      alert(`Assessment scores saved successfully! (${successCount} records)`);
    } catch (error) {
      setError('Failed to save assessment scores');
    } finally {
      setLoadingSave(false);
    }
  };

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
          Assessment Management
        </Typography>

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
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={assessmentForm.date}
                  onChange={(newValue) => newValue && setAssessmentForm({ ...assessmentForm, date: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
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
              <Typography variant="h6" gutterBottom>
                Saved Assessment Scores
              </Typography>
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
      </Box>
    </LocalizationProvider>
  );
};

export default Assessments;




