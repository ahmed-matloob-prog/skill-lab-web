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
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Student, AttendanceRecord } from '../types';

const Attendance: React.FC = () => {
  const { students, groups, addAttendanceRecord, updateAttendanceRecord, getAttendanceByDate, loading } = useDatabase();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

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

  const getAttendanceStatus = (studentId: string): 'present' | 'absent' | 'late' | null => {
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : null;
  };

  const handleAttendanceChange = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const existingRecord = attendanceRecords.find(r => r.studentId === studentId);
      const dateString = selectedDate.format('YYYY-MM-DD');
      
      if (existingRecord) {
        // Update existing record
        await updateAttendanceRecord(existingRecord.id, { status });
        setAttendanceRecords(prev => 
          prev.map(r => r.id === existingRecord.id ? { ...r, status } : r)
        );
      } else {
        // Create new record
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
      console.error('Error updating attendance:', error);
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
      console.error('Error loading attendance:', error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    loadAttendanceForDate(selectedDate);
  }, [selectedDate]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const summary = getAttendanceSummary();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Attendance Tracking
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
                    label={`Present: ${summary.present}`}
                    color="success"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    icon={<Schedule />}
                    label={`Late: ${summary.late}`}
                    color="warning"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chip
                    icon={<Cancel />}
                    label={`Absent: ${summary.absent}`}
                    color="error"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">
                    Total: {summary.total}
                  </Typography>
                  {summary.total > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Rate: {Math.round(((summary.present + summary.late) / summary.total) * 100)}%
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
      </Box>
    </LocalizationProvider>
  );
};

export default Attendance;
