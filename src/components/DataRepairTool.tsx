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
import { Build, Warning, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import DatabaseService from '../services/databaseService';
import { Student } from '../types';
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
  const { students, groups, updateStudent } = useDatabase();
  const [issues, setIssues] = useState<RepairIssue[]>([]);
  const [scanning, setScanning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairComplete, setRepairComplete] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [repairResult, setRepairResult] = useState<{ success: number; failed: number } | null>(null);

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
    </Box>
  );
};

export default DataRepairTool;
