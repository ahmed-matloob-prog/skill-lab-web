import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Sync,
  CloudUpload,
  CloudDone,
  CloudOff,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

const SyncPage: React.FC = () => {
  const { students, groups, attendance, assessments, getUnsyncedRecords, markAttendanceSynced, markAssessmentsSynced } = useDatabase();
  const { user } = useAuth();
  
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('lastSync'));
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [unsyncedData, setUnsyncedData] = useState({
    students: 0,
    groups: 0,
    attendance: 0,
    assessments: 0,
  });

  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadUnsyncedData();
  }, [students, groups, attendance, assessments]);

  const loadUnsyncedData = async () => {
    try {
      const unsynced = await getUnsyncedRecords();
      setUnsyncedData({
        students: unsynced.students.length,
        groups: unsynced.groups.length,
        attendance: unsynced.attendance.length,
        assessments: unsynced.assessments.length,
      });
    } catch (error) {
      logger.error('Error loading unsynced data:', error);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      setSyncStatus('error');
      return;
    }

    setSyncing(true);
    setSyncStatus('syncing');

    try {
      // Get unsynced records
      const unsynced = await getUnsyncedRecords();

      logger.log('Sync: Starting sync to Firebase...', {
        groups: unsynced.groups.length,
        students: unsynced.students.length,
        attendance: unsynced.attendance.length,
        assessments: unsynced.assessments.length
      });

      // Sync groups to Firebase
      if (unsynced.groups.length > 0) {
        logger.log(`Sync: Uploading ${unsynced.groups.length} groups to Firebase...`);
        const FirebaseSyncService = (await import('../services/firebaseSyncService')).default;
        for (const group of unsynced.groups) {
          await FirebaseSyncService.syncGroup(group);
        }
        logger.log('Sync: Groups uploaded successfully');
      }

      // Sync students to Firebase
      if (unsynced.students.length > 0) {
        logger.log(`Sync: Uploading ${unsynced.students.length} students to Firebase...`);
        const FirebaseSyncService = (await import('../services/firebaseSyncService')).default;
        for (const student of unsynced.students) {
          await FirebaseSyncService.syncStudent(student);
        }
        logger.log('Sync: Students uploaded successfully');
      }

      // Mark attendance as synced
      const attendanceIds = unsynced.attendance.map(r => r.id);
      const assessmentIds = unsynced.assessments.map(r => r.id);

      if (attendanceIds.length > 0) {
        logger.log(`Sync: Syncing ${attendanceIds.length} attendance records...`);
        const FirebaseSyncService = (await import('../services/firebaseSyncService')).default;
        for (const record of unsynced.attendance) {
          await FirebaseSyncService.syncAttendance(record);
        }
        await markAttendanceSynced(attendanceIds);
        logger.log('Sync: Attendance synced successfully');
      }

      if (assessmentIds.length > 0) {
        logger.log(`Sync: Syncing ${assessmentIds.length} assessment records...`);
        const FirebaseSyncService = (await import('../services/firebaseSyncService')).default;
        for (const record of unsynced.assessments) {
          await FirebaseSyncService.syncAssessment(record);
        }
        await markAssessmentsSynced(assessmentIds);
        logger.log('Sync: Assessments synced successfully');
      }

      // Update last sync time
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem('lastSync', now);

      setSyncStatus('success');
      logger.log('Sync: All data synced successfully to Firebase!');
      await loadUnsyncedData();
    } catch (error) {
      logger.error('Sync error:', error);
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <CircularProgress size={20} />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <CloudUpload />;
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getConnectionStatus = () => {
    if (isConnected) {
      return (
        <Chip
          icon={<CloudDone />}
          label="Connected"
          color="success"
          variant="outlined"
        />
      );
    } else {
      return (
        <Chip
          icon={<CloudOff />}
          label="Offline"
          color="error"
          variant="outlined"
        />
      );
    }
  };

  const totalUnsynced = unsyncedData.students + unsyncedData.groups + unsyncedData.attendance + unsyncedData.assessments;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Synchronization
      </Typography>

      <Grid container spacing={3}>
        {/* Connection Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getConnectionStatus()}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isConnected 
                  ? 'Your device is connected to the internet. Data can be synchronized with the server.'
                  : 'Your device is offline. Data will be synchronized when connection is restored.'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sync Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  icon={getSyncStatusIcon()}
                  label={syncStatus === 'syncing' ? 'Syncing...' : 
                         syncStatus === 'success' ? 'Last sync successful' :
                         syncStatus === 'error' ? 'Sync failed' : 'Ready to sync'}
                  color={getSyncStatusColor() as any}
                  variant="outlined"
                />
              </Box>
              {lastSync && (
                <Typography variant="body2" color="text.secondary">
                  Last sync: {new Date(lastSync).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Unsynced Data */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unsynced Data
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {unsyncedData.students}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Students
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {unsyncedData.groups}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Groups
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {unsyncedData.attendance}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {unsyncedData.assessments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assessments
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sync Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Sync />}
                  onClick={handleSync}
                  disabled={!isConnected || syncing || totalUnsynced === 0}
                  size="large"
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={loadUnsyncedData}
                  disabled={syncing}
                >
                  Refresh Status
                </Button>
              </Box>
              
              {totalUnsynced === 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  All data is synchronized with the server.
                </Alert>
              )}
              
              {!isConnected && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  You are currently offline. Data will be synchronized when connection is restored.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sync Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Automatic Sync"
                    secondary="Data is automatically synchronized when you have an internet connection"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Offline Mode"
                    secondary="You can continue working offline. All changes will be synced when connection is restored"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <CloudUpload color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Manual Sync"
                    secondary="Use the 'Sync Now' button to manually synchronize your data with the server"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SyncPage;
