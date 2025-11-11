import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import { BugReport } from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { User } from '../types';
import AuthService from '../services/authService';
import { logger } from '../utils/logger';

const TrainerDiagnostic: React.FC = () => {
  const { students, groups, attendance, assessments } = useDatabase();
  const [users, setUsers] = useState<User[]>([]);
  const [diagnosticData, setDiagnosticData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const runDiagnostic = () => {
    setLoading(true);
    const results: any[] = [];

    groups.forEach(group => {
      // Find trainers assigned to this group
      const assignedTrainers = users.filter(u =>
        u.role === 'trainer' &&
        u.assignedGroups &&
        u.assignedGroups.includes(group.id)
      );

      // Get trainers from attendance records
      const attendanceTrainers = new Set(
        attendance.filter(a => a.groupId === group.id).map(a => a.trainerId)
      );

      // Get trainers from assessment records
      const assessmentTrainers = new Set(
        assessments.filter(a => a.groupId === group.id).map(a => a.trainerId)
      );

      // All unique trainers who worked with this group
      const allTrainerIds = new Set([
        ...Array.from(attendanceTrainers),
        ...Array.from(assessmentTrainers)
      ]);

      const allTrainers = Array.from(allTrainerIds).map(id => {
        const user = users.find(u => u.id === id);
        return user ? user.username : `Unknown (${id})`;
      });

      results.push({
        groupName: group.name,
        groupId: group.id,
        assignedTrainers: assignedTrainers.map(t => t.username).join(', ') || 'None',
        trainersInRecords: allTrainers.join(', ') || 'None',
        attendanceCount: attendance.filter(a => a.groupId === group.id).length,
        assessmentCount: assessments.filter(a => a.groupId === group.id).length,
        studentCount: students.filter(s => s.groupId === group.id).length,
      });
    });

    setDiagnosticData(results);
    setLoading(false);
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BugReport sx={{ mr: 1, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              Trainer Assignment Diagnostic
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            This tool shows which trainers are officially assigned to each group vs. which trainers
            have actually recorded attendance/assessments for that group.
          </Typography>

          <Button
            variant="contained"
            onClick={runDiagnostic}
            disabled={loading}
            sx={{ mb: 3 }}
          >
            Run Diagnostic
          </Button>

          {diagnosticData.length > 0 && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Look for mismatches between "Assigned Trainers" and "Trainers in Records".
                If they don't match, that's likely causing the issue.
              </Alert>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Group</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell>Assigned Trainers</TableCell>
                      <TableCell>Trainers in Records</TableCell>
                      <TableCell>Attendance</TableCell>
                      <TableCell>Assessments</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diagnosticData.map((row, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          bgcolor: row.assignedTrainers !== row.trainersInRecords
                            ? 'warning.light'
                            : 'transparent'
                        }}
                      >
                        <TableCell>{row.groupName}</TableCell>
                        <TableCell>{row.studentCount}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {row.assignedTrainers}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {row.trainersInRecords}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.attendanceCount}</TableCell>
                        <TableCell>{row.assessmentCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Yellow rows</strong> indicate mismatches. This means someone recorded
                data for a group they're not officially assigned to, or vice versa.
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TrainerDiagnostic;
