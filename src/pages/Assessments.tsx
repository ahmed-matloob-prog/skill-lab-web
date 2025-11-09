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
  Send,
  Lock,
  Edit,
  Delete,
  Warning,
  LockOpen,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { Student, AssessmentRecord } from '../types';
import { assessmentPermissions } from '../utils/assessmentPermissions';

const Assessments: React.FC = () => {
  const {
    students,
    groups,
    addAssessmentRecord,
    getAssessmentsByGroup,
    exportMultipleAssessmentsToAdmin,
    updateAssessmentRecord,
    deleteAssessmentRecord,
    loading
  } = useDatabase();
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

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentRecord | null>(null);
  const [editScore, setEditScore] = useState<string>('');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssessment, setDeletingAssessment] = useState<AssessmentRecord | null>(null);

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

  // Filter groups by year - only show groups that have students from the selected year
  const filteredGroups = selectedYear === 'all'
    ? accessibleGroups
    : accessibleGroups.filter(group => {
        // Check if this group has any students from the selected year
        return students.some(student =>
          student.groupId === group.id && student.year === selectedYear
        );
      });

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

  // Export to Admin handlers
  const handleExportClick = (assessments: AssessmentRecord[]) => {
    const unexported = assessments.filter(a => !a.exportedToAdmin);
    setSelectedForExport(unexported.map(a => a.id));
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    if (selectedForExport.length === 0) return;

    setExportLoading(true);
    try {
      const result = await exportMultipleAssessmentsToAdmin(selectedForExport, user!.id);

      setExportDialogOpen(false);
      setSelectedForExport([]);
      await loadSavedAssessments();

      alert(
        `Export complete!\n✅ Success: ${result.success}\n` +
          (result.failed > 0 ? `❌ Failed: ${result.failed}` : '')
      );
    } catch (error) {
      logger.error('Export failed:', error);
      alert('Failed to export assessments. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Edit handler
  const handleEditClick = (assessment: AssessmentRecord) => {
    setEditingAssessment(assessment);
    setEditScore(assessment.score.toString());
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingAssessment) return;

    const newScore = parseInt(editScore);
    if (isNaN(newScore) || newScore < 0 || newScore > editingAssessment.maxScore) {
      alert(`Score must be between 0 and ${editingAssessment.maxScore}`);
      return;
    }

    try {
      await updateAssessmentRecord(editingAssessment.id, {
        score: newScore,
        editCount: (editingAssessment.editCount || 0) + 1,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: user!.id,
      });

      setEditDialogOpen(false);
      setEditingAssessment(null);
      setEditScore('');
      await loadSavedAssessments();

      alert('Assessment updated successfully!');
    } catch (error) {
      logger.error('Update failed:', error);
      alert('Failed to update assessment. Please try again.');
    }
  };

  // Delete handler
  const handleDeleteClick = (assessment: AssessmentRecord) => {
    setDeletingAssessment(assessment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssessment) return;

    try {
      await deleteAssessmentRecord(deletingAssessment.id);

      setDeleteDialogOpen(false);
      setDeletingAssessment(null);
      await loadSavedAssessments();

      alert('Assessment deleted successfully!');
    } catch (error) {
      logger.error('Delete failed:', error);
      alert('Failed to delete assessment. Please try again.');
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
              {savedAssessments.length === 0 ? (
                <Alert severity="info">
                  No saved assessment scores found for this group.
                </Alert>
              ) : (
                <>
                  {/* Group assessments by name+date */}
                  {(() => {
                    // Group logic
                    const assessmentGroups = savedAssessments.reduce((acc, assessment) => {
                      const key = `${assessment.assessmentName}-${assessment.date}-${assessment.groupId}`;
                      if (!acc[key]) {
                        acc[key] = {
                          name: assessment.assessmentName,
                          type: assessment.assessmentType,
                          date: assessment.date,
                          maxScore: assessment.maxScore,
                          assessments: [],
                          allExported: true
                        };
                      }
                      acc[key].assessments.push(assessment);
                      if (assessment.exportedToAdmin !== true) {
                        acc[key].allExported = false;
                      }
                      return acc;
                    }, {} as Record<string, any>);

                    return Object.entries(assessmentGroups).map(([key, group]) => {
                      const draftCount = group.assessments.filter((a: AssessmentRecord) => a.exportedToAdmin !== true).length;
                      const exportedCount = group.assessments.filter((a: AssessmentRecord) => a.exportedToAdmin === true).length;

                      return (
                        <Card key={key} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
                          <CardContent>
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Box>
                                <Typography variant="h6">
                                  {group.name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                  <Chip
                                    label={group.type}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`${group.date}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`Max: ${group.maxScore}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={`${group.assessments.length} students`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              </Box>

                              {/* Status & Actions */}
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {group.allExported ? (
                                  <Chip
                                    icon={<Lock />}
                                    label="Exported to Admin"
                                    color="primary"
                                    variant="filled"
                                  />
                                ) : (
                                  <>
                                    {draftCount > 0 && (
                                      <Chip
                                        icon={<Edit />}
                                        label={`${draftCount} Draft`}
                                        color="warning"
                                        variant="outlined"
                                      />
                                    )}
                                    {exportedCount > 0 && (
                                      <Chip
                                        icon={<Lock />}
                                        label={`${exportedCount} Locked`}
                                        color="default"
                                        size="small"
                                      />
                                    )}
                                    {user?.role === 'trainer' && draftCount > 0 && (
                                      <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        startIcon={<Send />}
                                        onClick={() => handleExportClick(group.assessments)}
                                      >
                                        Export to Admin
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Box>
                            </Box>

                            {/* Student Scores Table */}
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Student</TableCell>
                                    <TableCell align="center">Score</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {group.assessments.map((assessment: AssessmentRecord) => {
                                    const canEdit = user && assessmentPermissions.canEdit(assessment, user);
                                    const canDelete = user && assessmentPermissions.canDelete(assessment, user);
                                    const statusIcon = assessmentPermissions.getStatusIcon(assessment);
                                    const statusMessage = assessmentPermissions.getStatusMessage(assessment);

                                    return (
                                      <TableRow key={assessment.id}>
                                        <TableCell>{getStudentName(assessment.studentId)}</TableCell>
                                        <TableCell align="center">
                                          <Typography variant="body2">
                                            {assessment.score}/{assessment.maxScore}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            ({Math.round((assessment.score / assessment.maxScore) * 100)}%)
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            icon={<span>{statusIcon}</span>}
                                            label={statusMessage}
                                            size="small"
                                            color={assessmentPermissions.getStatusColor(assessment)}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            {canEdit ? (
                                              <>
                                                <Button
                                                  size="small"
                                                  startIcon={<Edit />}
                                                  onClick={() => handleEditClick(assessment)}
                                                >
                                                  Edit
                                                </Button>
                                                {canDelete && (
                                                  <Button
                                                    size="small"
                                                    color="error"
                                                    startIcon={<Delete />}
                                                    onClick={() => handleDeleteClick(assessment)}
                                                  >
                                                    Delete
                                                  </Button>
                                                )}
                                              </>
                                            ) : (
                                              <Chip
                                                icon={<Lock />}
                                                label="Locked"
                                                size="small"
                                                disabled
                                              />
                                            )}
                                          </Box>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </>
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

      {/* Export Confirmation Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            Export to Admin
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Important:</strong> Once exported, you will NOT be able to edit or delete these assessments.
          </Alert>

          <Typography variant="body1" gutterBottom>
            You are about to export <strong>{selectedForExport.length} assessment(s)</strong> to admin.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            After export, assessments will be locked. Contact your administrator if you need to make changes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)} disabled={exportLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Send />}
            onClick={handleExportConfirm}
            disabled={exportLoading}
          >
            {exportLoading ? <CircularProgress size={24} /> : 'Confirm Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Assessment Score</DialogTitle>
        <DialogContent>
          {editingAssessment && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Student: {getStudentName(editingAssessment.studentId)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Assessment: {editingAssessment.assessmentName}
              </Typography>

              <TextField
                fullWidth
                label="Score"
                type="number"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                inputProps={{ min: 0, max: editingAssessment.maxScore }}
                helperText={`Max score: ${editingAssessment.maxScore}`}
                sx={{ mt: 2 }}
                autoFocus
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          {deletingAssessment && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                This action cannot be undone.
              </Alert>
              <Typography variant="body1">
                Are you sure you want to delete this assessment?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Student: {getStudentName(deletingAssessment.studentId)}<br />
                Assessment: {deletingAssessment.assessmentName}<br />
                Score: {deletingAssessment.score}/{deletingAssessment.maxScore}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default Assessments;




