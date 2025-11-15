import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  People,
  Assessment,
  Quiz,
  Sync,
  TrendingUp,
  School,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { students, groups, attendance, assessments, loading } = useDatabase();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalAttendance: 0,
    totalAssessments: 0,
    attendanceRate: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!loading) {
      calculateStats();
    }
  }, [students, groups, attendance, assessments, loading, user]);

  const calculateStats = () => {
    // Filter data based on user role
    let filteredStudents = students;
    let filteredGroups = groups;
    let filteredAttendance = attendance;
    let filteredAssessments = assessments;

    // For trainers, only show their assigned groups' data
    if (user?.role === 'trainer') {
      const assignedGroupIds = user?.assignedGroups || [];

      filteredStudents = students.filter(s => assignedGroupIds.includes(s.groupId));
      filteredGroups = groups.filter(g => assignedGroupIds.includes(g.id));
      filteredAttendance = attendance.filter(a => assignedGroupIds.includes(a.groupId));
      filteredAssessments = assessments.filter(a => assignedGroupIds.includes(a.groupId));
    }

    const totalStudents = filteredStudents.length;
    const totalGroups = filteredGroups.length;
    const totalAttendance = filteredAttendance.length;
    const totalAssessments = filteredAssessments.length;

    // Calculate attendance rate
    const presentCount = filteredAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // Calculate average score
    const totalScore = filteredAssessments.reduce((sum, a) => sum + a.score, 0);
    const averageScore = totalAssessments > 0 ? totalScore / totalAssessments : 0;

    setStats({
      totalStudents,
      totalGroups,
      totalAttendance,
      totalAssessments,
      attendanceRate: Math.round(attendanceRate),
      averageScore: Math.round(averageScore),
    });
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 1,
              p: 1,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.username}! Here's an overview of your {user?.role === 'admin' ? 'system' : 'teaching activities'}.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={user?.role === 'admin' ? 3 : 4}>
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={<People sx={{ color: 'white' }} />}
            color="#2196F3"
          />
        </Grid>
        {/* Only show Groups stat for admins */}
        {user?.role === 'admin' && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Groups"
              value={stats.totalGroups}
              icon={<School sx={{ color: 'white' }} />}
              color="#4CAF50"
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={user?.role === 'admin' ? 3 : 4}>
          <StatCard
            title="Attendance Records"
            value={stats.totalAttendance}
            icon={<Assessment sx={{ color: 'white' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={user?.role === 'admin' ? 3 : 4}>
          <StatCard
            title="Assessments"
            value={stats.totalAssessments}
            icon={<Quiz sx={{ color: 'white' }} />}
            color="#9C27B0"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" component="div" sx={{ mr: 2 }}>
                  {stats.attendanceRate}%
                </Typography>
                <Chip
                  label={stats.attendanceRate >= 80 ? 'Good' : stats.attendanceRate >= 60 ? 'Fair' : 'Needs Improvement'}
                  color={stats.attendanceRate >= 80 ? 'success' : stats.attendanceRate >= 60 ? 'warning' : 'error'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Based on {stats.totalAttendance} attendance records
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" component="div" sx={{ mr: 2 }}>
                  {stats.averageScore}
                </Typography>
                <Chip
                  label={stats.averageScore >= 80 ? 'Excellent' : stats.averageScore >= 70 ? 'Good' : stats.averageScore >= 60 ? 'Fair' : 'Needs Improvement'}
                  color={stats.averageScore >= 80 ? 'success' : stats.averageScore >= 70 ? 'primary' : stats.averageScore >= 60 ? 'warning' : 'error'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Based on {stats.totalAssessments} assessment records
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.totalAttendance > 0 && (
                  <>Latest attendance record: {new Date(attendance[attendance.length - 1]?.timestamp).toLocaleDateString()}</>
                )}
                {stats.totalAssessments > 0 && (
                  <> • Latest assessment: {new Date(assessments[assessments.length - 1]?.timestamp).toLocaleDateString()}</>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;




