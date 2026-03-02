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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Send,
  Lock,
  Edit,
  Delete,
  Warning,
  ExpandMore,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { AssessmentRecord } from '../types';
import { assessmentPermissions } from '../utils/assessmentPermissions';

const Assessments: React.FC = () => {
  const {
    students,
    groups,
    assessments,  // Use assessments directly from context for real-time updates
    exportMultipleAssessmentsToAdmin,
    adminExportAssessment,
    updateAssessmentRecord,
    deleteAssessmentRecord,
    loading,
    loadFullData,
    isFullDataLoaded,
  } = useDatabase();
  const { user } = useAuth();

  // Load all historical data so all assessments are visible
  useEffect(() => {
    if (!isFullDataLoaded) {
      loadFullData();
    }
  }, [isFullDataLoaded]);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Filter assessments from context instead of maintaining separate state
  // This ensures UI always reflects the latest data after exports/updates
  const savedAssessments = selectedGroup !== 'all'
    ? assessments.filter(a => a.groupId === selectedGroup)
    : [];

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

  // Bulk delete (entire assessment group)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deletingAssessmentGroup, setDeletingAssessmentGroup] = useState<AssessmentRecord[] | null>(null);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

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

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
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
      // No need to reload - UI updates automatically from context state

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
      // No need to reload - UI updates automatically from context state

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
      // No need to reload - UI updates automatically from context state

      alert('Assessment deleted successfully!');
    } catch (error) {
      logger.error('Delete failed:', error);
      alert('Failed to delete assessment. Please try again.');
    }
  };

  // Admin export handler (for orphaned drafts)
  const handleAdminExport = async (assessment: AssessmentRecord) => {
    if (!user || user.role !== 'admin') return;

    try {
      await adminExportAssessment(assessment.id, user.id);
      // No need to reload - UI updates automatically from context state
      alert('Assessment exported successfully!');
    } catch (error) {
      logger.error('Admin export failed:', error);
      alert('Failed to export assessment. Please try again.');
    }
  };

  // Bulk delete handlers
  const handleBulkDeleteClick = (assessments: AssessmentRecord[]) => {
    // Admin can delete any assessment, trainer can only delete drafts
    if (user?.role === 'admin') {
      // Admin can delete all assessments (including exported)
      setDeletingAssessmentGroup(assessments);
      setBulkDeleteDialogOpen(true);
    } else {
      // Trainer: Only allow deletion of non-exported assessments
      const deletableAssessments = assessments.filter(a => a.exportedToAdmin !== true);
      if (deletableAssessments.length === 0) {
        alert('Cannot delete exported assessments. All assessments in this group are locked.');
        return;
      }
      setDeletingAssessmentGroup(deletableAssessments);
      setBulkDeleteDialogOpen(true);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!deletingAssessmentGroup || deletingAssessmentGroup.length === 0) return;

    setBulkDeleteLoading(true);
    try {
      let successCount = 0;
      let failedCount = 0;

      // Delete each assessment in the group
      for (const assessment of deletingAssessmentGroup) {
        try {
          await deleteAssessmentRecord(assessment.id);
          successCount++;
        } catch (error) {
          logger.error(`Failed to delete assessment for student ${assessment.studentId}:`, error);
          failedCount++;
        }
      }

      setBulkDeleteDialogOpen(false);
      setDeletingAssessmentGroup(null);
      // No need to reload - UI updates automatically from context state

      alert(
        `Delete complete!\n✅ Deleted: ${successCount}\n` +
          (failedCount > 0 ? `❌ Failed: ${failedCount}` : '')
      );
    } catch (error) {
      logger.error('Bulk delete failed:', error);
      alert('Failed to delete assessments. Please try again.');
    } finally {
      setBulkDeleteLoading(false);
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
    <>
      <Box>
        <Typography variant="h4" gutterBottom>
          Saved Assessments
        </Typography>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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

        {/* Saved Scores Section */}
        {selectedGroup !== 'all' && (
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
                        <Accordion key={key} sx={{ mb: 2, border: '1px solid #e0e0e0' }}>
                          <AccordionSummary
                            expandIcon={<ExpandMore />}
                            sx={{
                              '&:hover': { bgcolor: 'action.hover' },
                              '& .MuiAccordionSummary-content': {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                my: 1
                              }
                            }}
                          >
                            {/* Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
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
                              <Box
                                sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {group.allExported ? (
                                  <>
                                    <Chip
                                      icon={<Lock />}
                                      label="Exported to Admin"
                                      color="primary"
                                      variant="filled"
                                    />
                                    {/* Admin can delete exported assessments */}
                                    {user?.role === 'admin' && (
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<Delete />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkDeleteClick(group.assessments);
                                        }}
                                      >
                                        Delete All
                                      </Button>
                                    )}
                                  </>
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
                                    {/* Trainer: Export and Delete drafts */}
                                    {user?.role === 'trainer' && draftCount > 0 && (
                                      <>
                                        <Button
                                          variant="contained"
                                          color="primary"
                                          size="small"
                                          startIcon={<Send />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportClick(group.assessments);
                                          }}
                                        >
                                          Export to Admin
                                        </Button>
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          size="small"
                                          startIcon={<Delete />}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBulkDeleteClick(group.assessments);
                                          }}
                                        >
                                          Delete All
                                        </Button>
                                      </>
                                    )}
                                    {/* Admin: Delete any assessment (draft or mixed) */}
                                    {user?.role === 'admin' && (draftCount > 0 || exportedCount > 0) && (
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<Delete />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleBulkDeleteClick(group.assessments);
                                        }}
                                      >
                                        Delete All
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Box>
                            </Box>
                          </AccordionSummary>

                          <AccordionDetails>
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
                                                {/* Admin can export orphaned drafts */}
                                                {user?.role === 'admin' && assessment.exportedToAdmin !== true && (
                                                  <Button
                                                    size="small"
                                                    color="primary"
                                                    variant="contained"
                                                    startIcon={<Send />}
                                                    onClick={() => handleAdminExport(assessment)}
                                                  >
                                                    Export
                                                  </Button>
                                                )}
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
                          </AccordionDetails>
                        </Accordion>
                      );
                    });
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {selectedGroup === 'all' && (
          <Alert severity="info">
            Please select a specific group to view saved assessments.
          </Alert>
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'error.main' }} />
            Delete Entire Assessment
          </Box>
        </DialogTitle>
        <DialogContent>
          {deletingAssessmentGroup && deletingAssessmentGroup.length > 0 && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Warning:</strong> This action cannot be undone!
              </Alert>
              <Typography variant="body1" gutterBottom>
                You are about to delete the entire assessment for <strong>{deletingAssessmentGroup.length} student(s)</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Assessment: {deletingAssessmentGroup[0].assessmentName}<br />
                Type: {deletingAssessmentGroup[0].assessmentType}<br />
                Date: {deletingAssessmentGroup[0].date}<br />
                Students affected: {deletingAssessmentGroup.length}
              </Typography>
              <Typography variant="body2" color="error.main" sx={{ mt: 2, fontWeight: 'bold' }}>
                {user?.role === 'admin'
                  ? 'All scores for this assessment will be permanently deleted (including exported records).'
                  : 'All draft scores for this assessment will be permanently deleted.'}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleteLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDeleteConfirm}
            disabled={bulkDeleteLoading}
            startIcon={bulkDeleteLoading ? <CircularProgress size={20} /> : <Delete />}
          >
            {bulkDeleteLoading ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Assessments;




