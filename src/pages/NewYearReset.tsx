import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Download,
  DeleteForever,
  Archive,
  School,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { User } from '../types';
import AuthService from '../services/authService';
import {
  exportStudentsToExcel,
  exportAttendanceToExcel,
  exportAssessmentsToExcel,
  exportSimplifiedReportToExcel,
  exportGroupPerformanceSummary,
} from '../utils/excelUtils';

const NewYearReset: React.FC = () => {
  const { user } = useAuth();
  const {
    students,
    groups,
    attendance,
    assessments,
    clearAllData,
  } = useDatabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [users, setUsers] = useState<User[]>([]);

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

  const [options, setOptions] = useState({
    exportBeforeClearing: true,
    clearStudents: true,
    clearAttendance: true,
    clearAssessments: true,
    clearGroups: false,
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const academicYear = currentMonth >= 8 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  const nextAcademicYear = currentMonth >= 8 ? `${currentYear + 1}-${currentYear + 2}` : `${currentYear}-${currentYear + 1}`;

  const handleOptionChange = (option: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setActiveStep(0);
    setCompletedSteps([]);
    setConfirmText('');
  };

  const handleCloseDialog = () => {
    if (!processing) {
      setDialogOpen(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleExportAll = async () => {
    setProcessing(true);
    setActiveStep(1);

    try {
      logger.info('Starting data export...');

      // Export all data
      if (students.length > 0) {
        exportStudentsToExcel(students, groups);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (attendance.length > 0) {
        exportAttendanceToExcel(attendance, students, groups);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (assessments.length > 0) {
        exportAssessmentsToExcel(assessments, students, groups);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Export comprehensive reports
      if (assessments.length > 0 && students.length > 0) {
        exportSimplifiedReportToExcel(assessments, students, groups);
        await new Promise(resolve => setTimeout(resolve, 500));

        exportGroupPerformanceSummary(attendance, assessments, students, groups, users);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setCompletedSteps(prev => [...prev, 1]);
      logger.info('Data export completed successfully');
    } catch (error) {
      logger.error('Export failed:', error);
      alert('Export failed. Please try again or export manually from each page.');
      setProcessing(false);
      return;
    }

    setProcessing(false);
  };

  const handleProceedToConfirm = () => {
    setDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      alert('Please type "DELETE ALL DATA" to confirm');
      return;
    }

    setProcessing(true);
    setConfirmDialogOpen(false);
    setDialogOpen(true);
    setActiveStep(2);

    try {
      logger.info('Starting data clearing...');

      // Clear data based on selected options
      if (options.clearStudents || options.clearAttendance || options.clearAssessments || options.clearGroups) {
        await clearAllData();
        logger.info('Data cleared successfully');
      }

      setCompletedSteps(prev => [...prev, 2]);
      setActiveStep(3);
    } catch (error) {
      logger.error('Data clearing failed:', error);
      alert('Failed to clear data. Please try manual reset or contact support.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = () => {
    setDialogOpen(false);
    window.location.reload();
  };

  const steps = ['Review', 'Export Data', 'Clear Data', 'Complete'];

  const getDeleteCount = () => {
    let count = 0;
    if (options.clearStudents) count += students.length;
    if (options.clearAttendance) count += attendance.length;
    if (options.clearAssessments) count += assessments.length;
    if (options.clearGroups) count += groups.length;
    return count;
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🎓 New Academic Year Setup
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Use this tool to safely transition to a new academic year. All data will be exported before clearing.
      </Alert>

      {/* Current Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Data Summary
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <School color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={`${students.length} Students`}
                secondary="Enrolled across all years and groups"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText
                primary={`${attendance.length} Attendance Records`}
                secondary="Total attendance entries recorded"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Archive color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={`${assessments.length} Assessment Records`}
                secondary="Total assessments completed"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <School color="info" />
              </ListItemIcon>
              <ListItemText
                primary={`${groups.length} Groups`}
                secondary="Available groups (1-30)"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Academic Year Info */}
      <Card sx={{ mb: 3, bgcolor: '#f0f7ff' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Academic Year Transition
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Current Year
              </Typography>
              <Typography variant="h5">{academicYear}</Typography>
            </Box>
            <Typography variant="h4" color="primary">→</Typography>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Next Year
              </Typography>
              <Typography variant="h5">{nextAcademicYear}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Start New Academic Year
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will export all current data to Excel files and then clear selected data collections.
            User accounts and passwords will be preserved.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<School />}
            onClick={handleOpenDialog}
            disabled={students.length === 0 && attendance.length === 0 && assessments.length === 0}
          >
            Start New Year Setup
          </Button>
        </CardContent>
      </Card>

      {/* Main Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={processing}
      >
        <DialogTitle>
          New Academic Year Setup
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label, index) => (
              <Step key={label} completed={completedSteps.includes(index)}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 0: Review */}
          {activeStep === 0 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>Important:</strong> This action will permanently delete selected data.
                Make sure to export everything before proceeding.
              </Alert>

              <Typography variant="h6" gutterBottom>
                What will happen:
              </Typography>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <Download color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="1. Export All Data"
                    secondary="Download Excel files with all students, attendance, assessments, and reports"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <DeleteForever color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="2. Clear Selected Data"
                    secondary={`Remove ${getDeleteCount()} records from both localStorage and Firebase`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="3. Keep User Accounts"
                    secondary="All admin and trainer accounts will be preserved"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Options:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.exportBeforeClearing}
                      onChange={() => handleOptionChange('exportBeforeClearing')}
                      disabled={processing}
                    />
                  }
                  label="Export data before clearing (recommended)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.clearStudents}
                      onChange={() => handleOptionChange('clearStudents')}
                      disabled={processing}
                    />
                  }
                  label={`Clear students (${students.length} records)`}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.clearAttendance}
                      onChange={() => handleOptionChange('clearAttendance')}
                      disabled={processing}
                    />
                  }
                  label={`Clear attendance records (${attendance.length} records)`}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.clearAssessments}
                      onChange={() => handleOptionChange('clearAssessments')}
                      disabled={processing}
                    />
                  }
                  label={`Clear assessment records (${assessments.length} records)`}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.clearGroups}
                      onChange={() => handleOptionChange('clearGroups')}
                      disabled={processing}
                    />
                  }
                  label={`Clear groups (${groups.length} groups) - Not recommended`}
                />
              </Box>
            </Box>
          )}

          {/* Step 1: Export Data */}
          {activeStep === 1 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {processing ? (
                <>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6">Exporting data...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please wait while we create Excel files with all your data.
                    Check your Downloads folder for the exported files.
                  </Typography>
                </>
              ) : completedSteps.includes(1) ? (
                <>
                  <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6">Export Complete!</Typography>
                  <Typography variant="body2" color="text.secondary">
                    All data has been exported to Excel files in your Downloads folder.
                    Please verify the files before proceeding.
                  </Typography>
                </>
              ) : null}
            </Box>
          )}

          {/* Step 2: Clear Data */}
          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {processing ? (
                <>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6">Clearing data...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Removing selected data from localStorage and Firebase...
                  </Typography>
                </>
              ) : completedSteps.includes(2) ? (
                <>
                  <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h6">Data Cleared!</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selected data has been removed from both localStorage and Firebase.
                  </Typography>
                </>
              ) : null}
            </Box>
          )}

          {/* Step 3: Complete */}
          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                New Year Setup Complete!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You're ready to start the new academic year {nextAcademicYear}.
              </Typography>
              <Alert severity="success" sx={{ textAlign: 'left' }}>
                <strong>Next Steps:</strong>
                <List dense>
                  <ListItem>1. Add new students (import from Excel or add manually)</ListItem>
                  <ListItem>2. Assign trainers to groups for the new year</ListItem>
                  <ListItem>3. Start recording attendance and assessments</ListItem>
                </List>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {activeStep === 0 && (
            <>
              <Button onClick={handleCloseDialog} disabled={processing}>
                Cancel
              </Button>
              {options.exportBeforeClearing ? (
                <Button
                  variant="contained"
                  onClick={handleExportAll}
                  disabled={processing}
                  startIcon={<Download />}
                >
                  Export & Continue
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleProceedToConfirm}
                  disabled={processing}
                >
                  Skip Export & Continue
                </Button>
              )}
            </>
          )}
          {activeStep === 1 && completedSteps.includes(1) && (
            <Button
              variant="contained"
              onClick={handleProceedToConfirm}
              disabled={processing}
            >
              Proceed to Clear Data
            </Button>
          )}
          {activeStep === 3 && (
            <Button
              variant="contained"
              color="success"
              onClick={handleFinish}
              startIcon={<CheckCircle />}
            >
              Finish & Reload
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={processing}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
            <Warning sx={{ mr: 1 }} />
            Final Confirmation Required
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>⚠️ This action cannot be undone!</strong>
          </Alert>

          <Typography variant="body1" gutterBottom>
            You are about to permanently delete:
          </Typography>
          <List dense>
            {options.clearStudents && (
              <ListItem>
                <ListItemText primary={`• ${students.length} student records`} />
              </ListItem>
            )}
            {options.clearAttendance && (
              <ListItem>
                <ListItemText primary={`• ${attendance.length} attendance records`} />
              </ListItem>
            )}
            {options.clearAssessments && (
              <ListItem>
                <ListItemText primary={`• ${assessments.length} assessment records`} />
              </ListItem>
            )}
            {options.clearGroups && (
              <ListItem>
                <ListItemText primary={`• ${groups.length} groups`} />
              </ListItem>
            )}
          </List>

          <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
            Type <strong>DELETE ALL DATA</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type: DELETE ALL DATA"
            disabled={processing}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearData}
            disabled={processing || confirmText !== 'DELETE ALL DATA'}
            startIcon={processing ? <CircularProgress size={20} /> : <DeleteForever />}
          >
            {processing ? 'Clearing...' : 'Clear Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewYearReset;
