import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { Build, Warning, CheckCircle, Error as ErrorIcon, DeleteSweep } from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import DatabaseService from '../services/databaseService';
import AuthService from '../services/authService';
import { Student, User } from '../types';
import { logger } from '../utils/logger';

interface RepairIssue {
  studentId: string;
  studentName: string;
  groupName?: string;
  issue: 'malformed_id' | 'duplicate_id';
  currentId: string;
  suggestedId: string;
}

const DataRepairTool: React.FC = () => {
  const { students, groups, updateStudent, attendance, assessments } = useDatabase();
  const [issues, setIssues] = useState<RepairIssue[]>([]);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairComplete, setRepairComplete] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [repairResult, setRepairResult] = useState<{ success: number; failed: number } | null>(null);

  // Orphaned data cleanup states
  const [orphanedDataCount, setOrphanedDataCount] = useState({ attendance: 0, assessments: 0 });
  const [cleaningOrphaned, setCleaningOrphaned] = useState(false);
  const [orphanedCleanupComplete, setOrphanedCleanupComplete] = useState(false);
  const [orphanedCleanupResult, setOrphanedCleanupResult] = useState<{ deleted: number } | null>(null);
  const [confirmOrphanedDialogOpen, setConfirmOrphanedDialogOpen] = useState(false);

  // Scan for issues
  const scanForIssues = async () => {
    setScanning(true);
    setRepairComplete(false);
    setScanComplete(false);
    setRepairResult(null);

    try {
      const foundIssues: RepairIssue[] = [];
      const seenIds = new Map<string, string>(); // studentId -> student name

      // Get valid IDs for next ID calculation
      const validIds: number[] = [];

      students.forEach((student) => {
        const idStr = student.studentId.replace('S', '');
        const id = parseInt(idStr);

        // Check for malformed IDs (NaN)
        if (isNaN(id)) {
          const group = groups.find(g => g.id === student.groupId);
          foundIssues.push({
            studentId: student.id,
            studentName: student.name,
            groupName: group?.name,
            issue: 'malformed_id',
            currentId: student.studentId,
            suggestedId: 'Will auto-generate'
          });
        } else {
          validIds.push(id);

          // Check for duplicate IDs
          if (seenIds.has(student.studentId)) {
            const group = groups.find(g => g.id === student.groupId);
            foundIssues.push({
              studentId: student.id,
              studentName: student.name,
              groupName: group?.name,
              issue: 'duplicate_id',
              currentId: student.studentId,
              suggestedId: 'Will auto-generate'
            });
          } else {
            seenIds.set(student.studentId, student.name);
          }
        }
      });

      // Calculate next available ID and update suggested IDs
      let nextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
      foundIssues.forEach(issue => {
        issue.suggestedId = `S${String(nextId++).padStart(5, '0')}`;
      });

      setIssues(foundIssues);
      setScanComplete(true);
      logger.log(`Data Repair: Found ${foundIssues.length} issues`);
    } catch (error) {
      logger.error('Error scanning for issues:', error);
    } finally {
      setScanning(false);
    }
  };

  // Auto-scan on mount and when students change
  useEffect(() => {
    scanForIssues();
  }, [students]);

  // Repair all issues
  const handleRepairAll = async () => {
    setConfirmDialogOpen(false);
    setRepairing(true);

    try {
      let successCount = 0;
      let failedCount = 0;

      // Process each issue using context's updateStudent (triggers refresh & Firebase sync)
      for (const issue of issues) {
        try {
          await updateStudent(issue.studentId, {
            studentId: issue.suggestedId
          });
          successCount++;
          logger.log(`Repaired student ${issue.studentName}: ${issue.currentId} → ${issue.suggestedId}`);
        } catch (error) {
          logger.error(`Failed to repair student ${issue.studentName}:`, error);
          failedCount++;
        }
      }

      setRepairResult({ success: successCount, failed: failedCount });
      setRepairComplete(true);

      // The students array in context will update automatically, triggering useEffect to rescan

    } catch (error) {
      logger.error('Error during repair:', error);
    } finally {
      setRepairing(false);
    }
  };

  const getIssueLabel = (issue: RepairIssue['issue']) => {
    switch (issue) {
      case 'malformed_id':
        return 'Malformed ID (NaN)';
      case 'duplicate_id':
        return 'Duplicate ID';
      default:
        return 'Unknown Issue';
    }
  };

  const getIssueColor = (issue: RepairIssue['issue']) => {
    switch (issue) {
      case 'malformed_id':
        return 'error';
      case 'duplicate_id':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Scan for orphaned data (attendance/assessments for deleted trainers)
  const scanForOrphanedData = async () => {
    try {
      const users = await AuthService.getAllUsers();
      const userIds = new Set(users.map(u => u.id));

      const orphanedAttendance = attendance.filter(a => !userIds.has(a.trainerId));
      const orphanedAssessments = assessments.filter(a => !userIds.has(a.trainerId));

      setOrphanedDataCount({
        attendance: orphanedAttendance.length,
        assessments: orphanedAssessments.length
      });
    } catch (error) {
      logger.error('Error scanning for orphaned data:', error);
    }
  };

  // Clean up orphaned data
  const cleanOrphanedData = async () => {
    setCleaningOrphaned(true);
    setOrphanedCleanupComplete(false);
    setOrphanedCleanupResult(null);

    try {
      const users = await AuthService.getAllUsers();
      const userIds = new Set(users.map(u => u.id));

      let deletedCount = 0;

      // Delete orphaned attendance records
      const orphanedAttendance = attendance.filter(a => !userIds.has(a.trainerId));
      for (const record of orphanedAttendance) {
        await DatabaseService.deleteAttendanceRecord(record.id);
        deletedCount++;
      }

      // Delete orphaned assessment records
      const orphanedAssessments = assessments.filter(a => !userIds.has(a.trainerId));
      for (const record of orphanedAssessments) {
        await DatabaseService.deleteAssessmentRecord(record.id);
        deletedCount++;
      }

      setOrphanedCleanupResult({ deleted: deletedCount });
      setOrphanedCleanupComplete(true);
      setConfirmOrphanedDialogOpen(false);

      // Rescan after cleanup
      await scanForOrphanedData();
    } catch (error) {
      logger.error('Error cleaning orphaned data:', error);
    } finally {
      setCleaningOrphaned(false);
    }
  };

  // Scan for orphaned data on mount
  useEffect(() => {
    scanForOrphanedData();
  }, [attendance, assessments]);

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Build sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              Data Repair Tool
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            This tool scans for and repairs student data issues such as malformed student IDs (S00NaN)
            or duplicate IDs. The repair process will automatically assign new sequential IDs to affected students.
          </Typography>

          {/* Scan Results Summary */}
          {!scanning && (
            <Box sx={{ mb: 3 }}>
              {issues.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>
                  <AlertTitle>No Issues Found</AlertTitle>
                  All student records are valid. No repairs needed.
                </Alert>
              ) : (
                <Alert severity="warning" icon={<Warning />}>
                  <AlertTitle>Issues Detected</AlertTitle>
                  Found {issues.length} student record(s) with issues that need repair.
                </Alert>
              )}
            </Box>
          )}

          {/* Scan Complete Message */}
          {scanComplete && !scanning && (
            <Alert
              severity="info"
              sx={{ mb: 3 }}
              onClose={() => setScanComplete(false)}
            >
              <AlertTitle>Scan Complete</AlertTitle>
              {issues.length === 0
                ? 'No issues found. All student records are valid.'
                : `Found ${issues.length} issue(s) that need attention.`}
            </Alert>
          )}

          {/* Repair Result */}
          {repairComplete && repairResult && (
            <Alert
              severity={repairResult.failed === 0 ? "success" : "warning"}
              sx={{ mb: 3 }}
              onClose={() => setRepairComplete(false)}
            >
              <AlertTitle>Repair Complete</AlertTitle>
              Successfully repaired {repairResult.success} student record(s).
              {repairResult.failed > 0 && ` Failed to repair ${repairResult.failed} record(s).`}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              onClick={scanForIssues}
              disabled={scanning || repairing}
              startIcon={scanning ? <CircularProgress size={20} /> : undefined}
            >
              {scanning ? 'Scanning...' : 'Rescan for Issues'}
            </Button>

            {issues.length > 0 && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={scanning || repairing}
                startIcon={repairing ? <CircularProgress size={20} /> : <Build />}
              >
                {repairing ? 'Repairing...' : `Repair All (${issues.length})`}
              </Button>
            )}
          </Box>

          {/* Issues Table */}
          {issues.length > 0 && !scanning && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Issue Type</TableCell>
                    <TableCell>Current ID</TableCell>
                    <TableCell>New ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {issues.map((issue, index) => (
                    <TableRow key={index}>
                      <TableCell>{issue.studentName}</TableCell>
                      <TableCell>{issue.groupName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getIssueLabel(issue.issue)}
                          size="small"
                          color={getIssueColor(issue.issue)}
                          icon={<ErrorIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            color: 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {issue.currentId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            color: 'success.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {issue.suggestedId}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Loading State */}
          {scanning && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Scanning for issues...</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'warning.main' }} />
            Confirm Data Repair
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will repair {issues.length} student record(s) by assigning new sequential student IDs.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            This action will:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, mb: 2 }}>
            <li>
              <Typography variant="body2">
                Replace malformed IDs (S00NaN) with valid sequential IDs
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Fix duplicate ID conflicts
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Maintain all other student data (name, group, attendance, assessments)
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="warning.main">
                Sync changes to Firebase automatically
              </Typography>
            </li>
          </Box>
          <DialogContentText color="error">
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={repairing}>
            Cancel
          </Button>
          <Button
            onClick={handleRepairAll}
            color="warning"
            variant="contained"
            disabled={repairing}
            autoFocus
          >
            Yes, Repair All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Orphaned Data Cleanup Section */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DeleteSweep sx={{ mr: 1, fontSize: 32, color: 'error.main' }} />
            <Typography variant="h5" component="h2">
              Orphaned Data Cleanup
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            This tool removes attendance and assessment records that belong to deleted trainers.
            Orphaned records can occur when a trainer is permanently deleted from the system.
          </Typography>

          {/* Orphaned Data Summary */}
          {orphanedDataCount.attendance + orphanedDataCount.assessments === 0 ? (
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
              <AlertTitle>No Orphaned Data</AlertTitle>
              All attendance and assessment records are valid. No cleanup needed.
            </Alert>
          ) : (
            <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
              <AlertTitle>Orphaned Data Detected</AlertTitle>
              Found {orphanedDataCount.attendance} orphaned attendance record(s) and{' '}
              {orphanedDataCount.assessments} orphaned assessment record(s) that belong to deleted trainers.
            </Alert>
          )}

          {/* Cleanup Result */}
          {orphanedCleanupComplete && orphanedCleanupResult && (
            <Alert
              severity="success"
              sx={{ mb: 3 }}
              onClose={() => setOrphanedCleanupComplete(false)}
            >
              <AlertTitle>Cleanup Complete</AlertTitle>
              Successfully deleted {orphanedCleanupResult.deleted} orphaned record(s).
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={scanForOrphanedData}
              disabled={cleaningOrphaned}
              startIcon={cleaningOrphaned ? <CircularProgress size={20} /> : undefined}
            >
              Rescan for Orphaned Data
            </Button>

            {orphanedDataCount.attendance + orphanedDataCount.assessments > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmOrphanedDialogOpen(true)}
                disabled={cleaningOrphaned}
                startIcon={cleaningOrphaned ? <CircularProgress size={20} /> : <DeleteSweep />}
              >
                {cleaningOrphaned
                  ? 'Cleaning...'
                  : `Clean Up Orphaned Data (${orphanedDataCount.attendance + orphanedDataCount.assessments})`}
              </Button>
            )}
          </Box>

          {/* Orphaned Data Details */}
          {orphanedDataCount.attendance + orphanedDataCount.assessments > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Details:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 1 }}>
                {orphanedDataCount.attendance > 0 && (
                  <li>
                    <Typography variant="body2">
                      {orphanedDataCount.attendance} attendance record(s) from deleted trainers
                    </Typography>
                  </li>
                )}
                {orphanedDataCount.assessments > 0 && (
                  <li>
                    <Typography variant="body2">
                      {orphanedDataCount.assessments} assessment record(s) from deleted trainers
                    </Typography>
                  </li>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Orphaned Data Cleanup Confirmation Dialog */}
      <Dialog
        open={confirmOrphanedDialogOpen}
        onClose={() => setConfirmOrphanedDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'error.main' }} />
            Confirm Orphaned Data Cleanup
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete {orphanedDataCount.attendance + orphanedDataCount.assessments} orphaned record(s)
            that belong to deleted trainers.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            Records to be deleted:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, mb: 2 }}>
            {orphanedDataCount.attendance > 0 && (
              <li>
                <Typography variant="body2">
                  {orphanedDataCount.attendance} attendance record(s)
                </Typography>
              </li>
            )}
            {orphanedDataCount.assessments > 0 && (
              <li>
                <Typography variant="body2">
                  {orphanedDataCount.assessments} assessment record(s)
                </Typography>
              </li>
            )}
          </Box>
          <DialogContentText color="error">
            <strong>Warning:</strong> This action cannot be undone. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOrphanedDialogOpen(false)} disabled={cleaningOrphaned}>
            Cancel
          </Button>
          <Button
            onClick={cleanOrphanedData}
            color="error"
            variant="contained"
            disabled={cleaningOrphaned}
            autoFocus
          >
            Yes, Delete Orphaned Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataRepairTool;
