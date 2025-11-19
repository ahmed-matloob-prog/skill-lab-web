import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Chip,
  IconButton,
  SelectChangeEvent,
  Menu,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  School,
  Assessment,
  Quiz,
  Download,
  Upload,
  MoreVert,
  FileDownload,
  Restore,
} from '@mui/icons-material';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { User, Group } from '../types';
import AuthService from '../services/authService';
import FirebaseUserService from '../services/firebaseUserService';
import FirebasePasswordService from '../services/firebasePasswordService';
import { exportGroupsToExcel } from '../utils/excelUtils';
import AdminReport from './AdminReport';
import TrainerReports from './TrainerReports';
import NewYearReset from './NewYearReset';
import DataRepairTool from '../components/DataRepairTool';
import TrainerDiagnostic from '../components/TrainerDiagnostic';
import { sanitizeString, validateUsername, validateEmail, validatePassword } from '../utils/validator';
import { hashPassword } from '../utils/passwordUtils';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Admin: React.FC = () => {
  const { groups, addGroup, updateGroup, deleteGroup, students, attendance, assessments, loading, ensureAllGroupsExist, bulkUpdateCurrentUnit } = useDatabase();
  const { user } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // User management state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    role: 'trainer' as 'admin' | 'trainer',
    assignedGroups: [] as string[],
    assignedYears: [] as number[],
    password: '',
  });
  
  // Group management state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    year: 1,
    description: '',
    currentUnit: '',
  });
  const [groupFilterYear, setGroupFilterYear] = useState<number | 'all'>('all');
  const [groupSearchText, setGroupSearchText] = useState('');
  const [groupSortBy, setGroupSortBy] = useState<'name' | 'year'>('name');
  const [groupFilterTrainer, setGroupFilterTrainer] = useState<string>('all');
  const [bulkUpdateYear, setBulkUpdateYear] = useState<number>(2);
  const [bulkUpdateUnit, setBulkUpdateUnit] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Quick Actions Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      logger.log('Admin: Loading users and setting up subscription');
      loadUsers();

      // Subscribe to real-time user updates from Firebase
      if (FirebaseUserService.isConfigured()) {
        logger.log('Admin: Setting up Firebase real-time subscription');
        const unsubscribe = FirebaseUserService.subscribeToUsers((updatedUsers) => {
          logger.log('Admin: Firebase users updated in real-time:', updatedUsers.length, 'users:', updatedUsers.map(u => u.username));
          // loadUsers will merge Firebase users with production users
          // Force reload to get merged list
          loadUsers().then(() => {
            logger.log('Admin: Users list refreshed after Firebase update');
          });
        });

        return () => {
          logger.log('Admin: Cleaning up Firebase subscription');
          unsubscribe();
        };
      } else {
        logger.log('Admin: Firebase not configured, using localStorage only');
      }
    }
  }, [user]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      logger.log('Admin: Loading users from AuthService...');
      const usersData = await AuthService.getAllUsers();
      logger.log('Admin: Loaded', usersData.length, 'users:', usersData.map(u => u.username));
      setUsers(usersData);
    } catch (error) {
      logger.error('Admin: Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Helper function to get trainers assigned to a group
  const getGroupTrainers = (groupId: string): User[] => {
    return users.filter(u => u.assignedGroups?.includes(groupId));
  };

  // Helper function to get last activity for a group
  const getGroupLastActivity = (groupId: string): Date | null => {
    const groupAttendance = attendance.filter(a => a.groupId === groupId);
    const groupAssessments = assessments.filter(a => {
      const student = students.find(s => s.id === a.studentId);
      return student?.groupId === groupId;
    });

    const dates: Date[] = [];

    groupAttendance.forEach(a => {
      if (a.timestamp) dates.push(new Date(a.timestamp));
    });

    groupAssessments.forEach(a => {
      if (a.timestamp) dates.push(new Date(a.timestamp));
    });

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // Helper function to format last activity
  const formatLastActivity = (lastActivity: Date | null): string => {
    if (!lastActivity) return 'No activity';

    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Helper function to get activity status
  const getActivityStatus = (lastActivity: Date | null): 'active' | 'warning' | 'inactive' => {
    if (!lastActivity) return 'inactive';

    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return 'active';
    if (diffDays <= 30) return 'warning';
    return 'inactive';
  };

  // Quick Actions Menu handlers
  const handleQuickActionsClick = (event: React.MouseEvent<HTMLElement>, group: Group) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleQuickActionsClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleQuickEdit = () => {
    if (selectedGroup) {
      handleOpenGroupDialog(selectedGroup);
      handleQuickActionsClose();
    }
  };

  const handleQuickDelete = () => {
    if (selectedGroup) {
      handleDeleteGroup(selectedGroup.id);
      handleQuickActionsClose();
    }
  };

  // Export groups to Excel
  const handleExportGroups = () => {
    const trainersData = groups.map(group => ({
      groupId: group.id,
      trainerNames: getGroupTrainers(group.id).map(t => t.username)
    }));

    exportGroupsToExcel(groups, students, trainersData);
  };

  // User management functions
  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        email: user.email,
        role: user.role,
        assignedGroups: user.assignedGroups || [],
        assignedYears: user.assignedYears || [],
        password: '',
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        email: '',
        role: 'trainer',
        assignedGroups: [],
        assignedYears: [],
        password: '',
      });
    }
    setError(null);
    setValidationErrors({});
    setUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUser(null);
    setError(null);
    setValidationErrors({});
  };

  const validateUserForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Validate username
    if (!userForm.username.trim()) {
      errors.username = 'Username is required';
    } else if (!validateUsername(userForm.username.trim())) {
      errors.username = 'Username must be 3-50 characters (alphanumeric and underscores only)';
    }

    // Validate email
    if (!userForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(userForm.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate password for new users
    if (!editingUser) {
      if (!userForm.password.trim()) {
        errors.password = 'Password is required for new users';
      } else {
        const passwordValidation = validatePassword(userForm.password);
        if (!passwordValidation.valid) {
          errors.password = passwordValidation.message || 'Invalid password';
        }
      }
    } else if (userForm.password.trim()) {
      // For editing users, validate password only if provided
      const passwordValidation = validatePassword(userForm.password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.message || 'Invalid password';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateUserForm()) {
      return;
    }

    try {
      if (editingUser) {
        await AuthService.updateUser(editingUser.id, {
          username: sanitizeString(userForm.username.trim()),
          email: sanitizeString(userForm.email.trim()),
          role: userForm.role,
          assignedGroups: userForm.assignedGroups,
          assignedYears: userForm.assignedYears,
        });
        // Update password if provided
        if (userForm.password.trim()) {
          logger.log('Admin: Updating password for user:', editingUser.username);
          // Hash the password before storing
          const hashedPassword = await hashPassword(userForm.password.trim());

          // Save hashed password to localStorage
          const passwords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
          const normalizedUsername = editingUser.username.toLowerCase().trim();
          passwords[normalizedUsername] = hashedPassword;
          // Also store with original username for backwards compatibility
          if (normalizedUsername !== editingUser.username) {
            passwords[editingUser.username] = hashedPassword;
          }
          localStorage.setItem('userPasswords', JSON.stringify(passwords));

          // Also save to Firebase if configured
          if (FirebasePasswordService.isConfigured()) {
            await FirebasePasswordService.savePassword(normalizedUsername, hashedPassword);
          }

          logger.log('Admin: Password hashed and saved successfully');
        }
      } else {
        logger.log('Admin: Creating user with password from form:', userForm.password);
        logger.log('Admin: Password length:', userForm.password.length);
        await AuthService.createUser({
          username: sanitizeString(userForm.username.trim()),
          email: sanitizeString(userForm.email.trim()),
          role: userForm.role,
          assignedGroups: userForm.assignedGroups,
          assignedYears: userForm.assignedYears,
          isActive: true,
        }, userForm.password);
      }

      handleCloseUserDialog();
      loadUsers();
    } catch (error) {
      setError('Failed to save user');
    }
  };

  const handleExportUsers = () => {
    try {
      const usersData = users.map(u => ({
        username: u.username,
        email: u.email,
        role: u.role,
        assignedGroups: u.assignedGroups || [],
        assignedYears: u.assignedYears || [],
        isActive: u.isActive,
      }));
      
      const passwords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
      const usersWithPasswords = usersData.map(user => ({
        ...user,
        password: passwords[user.username] || passwords[user.username.toLowerCase()] || '',
      }));
      
      const dataStr = JSON.stringify(usersWithPasswords, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setError(null);
    } catch (error) {
      setError('Failed to export users');
      logger.error('Export error:', error);
    }
  };

  const handleImportUsers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const importedUsers = JSON.parse(text);

      if (!Array.isArray(importedUsers)) {
        setError('Invalid file format. Expected an array of users.');
        return;
      }

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const userData of importedUsers) {
        try {
          // Check if user already exists
          const existingUsers = await AuthService.getAllUsers();
          const normalizedUsername = userData.username.toLowerCase().trim();
          const exists = existingUsers.find(u => u.username.toLowerCase().trim() === normalizedUsername);

          if (exists) {
            skippedCount++;
            errors.push(`Skipped "${userData.username}" - already exists`);
            continue;
          }

          // Create user
          if (!userData.password || !userData.password.trim()) {
            errors.push(`Skipped "${userData.username}" - no password provided`);
            skippedCount++;
            continue;
          }

          await AuthService.createUser({
            username: userData.username,
            email: userData.email,
            role: userData.role || 'trainer',
            assignedGroups: userData.assignedGroups || [],
            assignedYears: userData.assignedYears || [],
            isActive: userData.isActive !== false,
          }, userData.password);

          importedCount++;
        } catch (error) {
          skippedCount++;
          errors.push(`Error importing "${userData.username}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await loadUsers();

      if (errors.length > 0) {
        setError(`${importedCount} imported, ${skippedCount} skipped. Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
      } else {
        setError(null);
      }

      // Reset file input
      event.target.value = '';
    } catch (error) {
      setError('Failed to import users. Invalid file format.');
      logger.error('Import error:', error);
    }
  };

  const handleArchiveUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (window.confirm(`Are you sure you want to archive "${user?.username}"? The user will not be able to login, but all their data will be preserved.`)) {
      try {
        await AuthService.archiveUser(userId);
        loadUsers();
      } catch (error) {
        setError('Failed to archive user');
      }
    }
  };

  const handleRestoreUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (window.confirm(`Restore "${user?.username}"? The user will be able to login again.`)) {
      try {
        await AuthService.restoreUser(userId);
        loadUsers();
      } catch (error) {
        setError('Failed to restore user');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await AuthService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        setError('Failed to delete user');
      }
    }
  };

  // Group management functions
  const handleOpenGroupDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        year: group.year,
        description: group.description || '',
        currentUnit: group.currentUnit || '',
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        year: 1,
        description: '',
        currentUnit: '',
      });
    }
    setError(null);
    setValidationErrors({});
    setGroupDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
    setEditingGroup(null);
    setError(null);
  };

  const handleSaveGroup = async () => {
    const errors: { [key: string]: string } = {};

    // Validate group name
    if (!groupForm.name.trim()) {
      errors.name = 'Group name is required';
    }

    // Check for duplicate group name in the same year
    const duplicateGroup = groups.find(g =>
      g.name.toLowerCase() === groupForm.name.trim().toLowerCase() &&
      g.year === groupForm.year &&
      (!editingGroup || g.id !== editingGroup.id)
    );

    if (duplicateGroup) {
      errors.name = `Group "${groupForm.name}" already exists for Year ${groupForm.year}`;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const groupData = {
        name: sanitizeString(groupForm.name.trim()),
        year: groupForm.year,
        description: groupForm.description.trim() ? sanitizeString(groupForm.description.trim()) : undefined,
        currentUnit: groupForm.currentUnit.trim() ? sanitizeString(groupForm.currentUnit.trim()) : undefined,
      };

      if (editingGroup) {
        await updateGroup(editingGroup.id, groupData);
      } else {
        await addGroup(groupData);
      }

      handleCloseGroupDialog();
    } catch (error) {
      setError('Failed to save group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const studentsInGroup = students.filter(s => s.groupId === groupId);

    if (studentsInGroup.length > 0) {
      const confirmMessage = `This group has ${studentsInGroup.length} student(s). Deleting this group will also remove all students, attendance, and assessment records associated with it. Are you sure you want to delete "${group?.name}"?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete "${group?.name}"?`)) {
        return;
      }
    }

    try {
      await deleteGroup(groupId);
    } catch (error) {
      setError('Failed to delete group');
    }
  };

  const handleEnsureAllGroups = async () => {
    try {
      await ensureAllGroupsExist();
      setError(null);
    } catch (error) {
      setError('Failed to ensure all groups exist');
    }
  };

  const handleBulkUpdateUnit = async () => {
    if (!bulkUpdateUnit) {
      setError('Please select a unit');
      return;
    }

    const groupCount = groups.filter(g => g.year === bulkUpdateYear).length;
    const confirmMessage = `This will update the current unit to "${bulkUpdateUnit}" for all ${groupCount} groups in Year ${bulkUpdateYear}. Continue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const updatedCount = await bulkUpdateCurrentUnit(bulkUpdateYear, bulkUpdateUnit);
      setError(null);
      alert(`Successfully updated ${updatedCount} groups to unit "${bulkUpdateUnit}"`);
    } catch (error) {
      setError('Failed to bulk update groups');
    }
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
        Admin Panel
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="admin tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Overview" />
          <Tab label="Users" />
          <Tab label="Groups" />
          <Tab label="Statistics" />
          <Tab label="Grand Report" />
          <Tab label="Trainer Reports" />
          <Tab label="Data Repair" />
          <Tab label="Diagnostic" />
          <Tab label="New Year Setup" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <People sx={{ color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{users.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <School sx={{ color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{groups.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Groups
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{students.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Quiz sx={{ color: 'error.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4">{attendance.length + assessments.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Records
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            User Management ({users.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportUsers}
            >
              Export Users
            </Button>
            <input
              accept=".json"
              style={{ display: 'none' }}
              id="import-users-file"
              type="file"
              onChange={handleImportUsers}
            />
            <label htmlFor="import-users-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Upload />}
              >
                Import Users
              </Button>
            </label>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenUserDialog()}
            >
              Add User
            </Button>
          </Box>
        </Box>

        {loadingUsers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Assigned Groups</TableCell>
                  <TableCell>Assigned Years</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === 'admin' ? 'error' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.assignedGroups?.length || 0} groups
                    </TableCell>
                    <TableCell>
                      {user.assignedYears?.length ? 
                        user.assignedYears.map(year => `Year ${year}`).join(', ') : 
                        'None'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenUserDialog(user)}
                      >
                        <Edit />
                      </IconButton>
                      {user.isActive ? (
                        <IconButton
                          size="small"
                          onClick={() => handleArchiveUser(user.id)}
                          color="warning"
                          title="Archive User"
                        >
                          <Delete />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={() => handleRestoreUser(user.id)}
                          color="success"
                          title="Restore User"
                        >
                          <Restore />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Group Management ({(() => {
              let filtered = groups;
              if (groupFilterYear !== 'all') {
                filtered = filtered.filter(g => g.year === groupFilterYear);
              }
              if (groupSearchText) {
                filtered = filtered.filter(g =>
                  g.name.toLowerCase().includes(groupSearchText.toLowerCase()) ||
                  g.description?.toLowerCase().includes(groupSearchText.toLowerCase())
                );
              }
              return filtered.length;
            })()} groups)
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenGroupDialog()}
          >
            Add Group
          </Button>
        </Box>

        {/* Bulk Update Current Unit */}
        <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Bulk Update Current Unit
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update the current unit for all groups in a specific year at once
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Year</InputLabel>
                  <Select
                    value={bulkUpdateYear}
                    label="Select Year"
                    onChange={(e) => {
                      setBulkUpdateYear(e.target.value as number);
                      setBulkUpdateUnit(''); // Reset unit when year changes
                    }}
                  >
                    <MenuItem value={2}>Year 2</MenuItem>
                    <MenuItem value={3}>Year 3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="bulk-unit-select-label">Select Current Unit</InputLabel>
                  <Select
                    labelId="bulk-unit-select-label"
                    id="bulk-unit-select"
                    value={bulkUpdateUnit}
                    label="Select Current Unit"
                    onChange={(e: SelectChangeEvent) => {
                      const selectedValue = e.target.value;
                      logger.log('Unit selected:', selectedValue);
                      setBulkUpdateUnit(selectedValue);
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No unit selected</em>
                    </MenuItem>
                    {bulkUpdateYear === 2 && [
                      <MenuItem key="MSK" value="MSK">MSK</MenuItem>,
                      <MenuItem key="HEM" value="HEM">HEM</MenuItem>,
                      <MenuItem key="CVS" value="CVS">CVS</MenuItem>,
                      <MenuItem key="Resp" value="Resp">Resp</MenuItem>
                    ]}
                    {bulkUpdateYear === 3 && [
                      <MenuItem key="GIT" value="GIT">GIT</MenuItem>,
                      <MenuItem key="GUT" value="GUT">GUT</MenuItem>,
                      <MenuItem key="Neuro" value="Neuro">Neuro</MenuItem>,
                      <MenuItem key="END" value="END">END</MenuItem>
                    ]}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Will update: {groups.filter(g => g.year === bulkUpdateYear).length} groups
                </Typography>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleBulkUpdateUnit}
                  disabled={!bulkUpdateUnit}
                >
                  Update All
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Year</InputLabel>
                  <Select
                    value={groupFilterYear}
                    label="Filter by Year"
                    onChange={(e) => setGroupFilterYear(e.target.value as number | 'all')}
                  >
                    <MenuItem value="all">All Years</MenuItem>
                    {[1, 2, 3, 4, 5, 6].map(year => (
                      <MenuItem key={year} value={year}>Year {year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Trainer</InputLabel>
                  <Select
                    value={groupFilterTrainer}
                    label="Filter by Trainer"
                    onChange={(e) => setGroupFilterTrainer(e.target.value)}
                  >
                    <MenuItem value="all">All Trainers</MenuItem>
                    {users.filter(u => u.role === 'trainer').map(trainer => (
                      <MenuItem key={trainer.id} value={trainer.id}>
                        {trainer.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by name"
                  value={groupSearchText}
                  onChange={(e) => setGroupSearchText(e.target.value)}
                  placeholder="Type to search..."
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={groupSortBy}
                    label="Sort By"
                    onChange={(e) => setGroupSortBy(e.target.value as 'name' | 'year')}
                  >
                    <MenuItem value="name">Name (A-Z)</MenuItem>
                    <MenuItem value="year">Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setGroupFilterYear('all');
                    setGroupFilterTrainer('all');
                    setGroupSearchText('');
                    setGroupSortBy('name');
                  }}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {groups.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No groups created yet. Click "Add Group" to create your first group.
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Group Name</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Current Unit</TableCell>
                <TableCell>Assigned Trainers</TableCell>
                <TableCell>Students</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                // Filter groups
                let filtered = groups;

                // Filter by year
                if (groupFilterYear !== 'all') {
                  filtered = filtered.filter(g => g.year === groupFilterYear);
                }

                // Filter by trainer
                if (groupFilterTrainer !== 'all') {
                  filtered = filtered.filter(g => {
                    const trainers = getGroupTrainers(g.id);
                    return trainers.some(t => t.id === groupFilterTrainer);
                  });
                }

                // Filter by search text
                if (groupSearchText) {
                  filtered = filtered.filter(g =>
                    g.name.toLowerCase().includes(groupSearchText.toLowerCase()) ||
                    g.description?.toLowerCase().includes(groupSearchText.toLowerCase())
                  );
                }

                // Sort groups
                filtered = [...filtered].sort((a, b) => {
                  if (groupSortBy === 'name') {
                    return a.name.localeCompare(b.name);
                  } else {
                    return a.year - b.year || a.name.localeCompare(b.name);
                  }
                });

                return filtered;
              })().map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>
                    <Chip label={`Year ${group.year}`} size="small" />
                  </TableCell>
                  <TableCell>
                    {group.currentUnit ? (
                      <Chip label={group.currentUnit} size="small" color="primary" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const trainers = getGroupTrainers(group.id);
                      if (trainers.length === 0) {
                        return <Typography variant="body2" color="text.secondary">No trainer assigned</Typography>;
                      }
                      return (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {trainers.map(trainer => (
                            <Chip
                              key={trainer.id}
                              label={trainer.username}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {students.filter(s => s.groupId === group.id).length}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const lastActivity = getGroupLastActivity(group.id);
                      const status = getActivityStatus(lastActivity);
                      const statusColors = {
                        active: 'success',
                        warning: 'warning',
                        inactive: 'default'
                      } as const;
                      const statusLabels = {
                        active: 'Active',
                        warning: 'Less Active',
                        inactive: 'Inactive'
                      };
                      return (
                        <Chip
                          label={statusLabels[status]}
                          size="small"
                          color={statusColors[status]}
                          variant="filled"
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const lastActivity = getGroupLastActivity(group.id);
                      return (
                        <Typography variant="body2" color="text.secondary">
                          {formatLastActivity(lastActivity)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenGroupDialog(group)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteGroup(group.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleQuickActionsClick(e, group)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Export Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleExportGroups}
            disabled={groups.length === 0}
          >
            Export Groups to Excel
          </Button>
        </Box>

        {/* Quick Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleQuickActionsClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleQuickEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit Group
          </MenuItem>
          <MenuItem onClick={handleQuickDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Group
          </MenuItem>
        </Menu>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          System Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance Statistics
                </Typography>
                <Typography variant="body2">
                  Total Records: {attendance.length}
                </Typography>
                <Typography variant="body2">
                  Present: {attendance.filter(a => a.status === 'present').length}
                </Typography>
                <Typography variant="body2">
                  Late: {attendance.filter(a => a.status === 'late').length}
                </Typography>
                <Typography variant="body2">
                  Absent: {attendance.filter(a => a.status === 'absent').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assessment Statistics
                </Typography>
                <Typography variant="body2">
                  Total Records: {assessments.length}
                </Typography>
                <Typography variant="body2">
                  Average Score: {assessments.length > 0 ? Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length) : 0}
                </Typography>
                <Typography variant="body2">
                  Exams: {assessments.filter(a => a.assessmentType === 'exam').length}
                </Typography>
                <Typography variant="body2">
                  Quizzes: {assessments.filter(a => a.assessmentType === 'quiz').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <AdminReport />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <TrainerReports />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <DataRepairTool />
      </TabPanel>

      <TabPanel value={tabValue} index={7}>
        <TrainerDiagnostic />
      </TabPanel>

      <TabPanel value={tabValue} index={8}>
        <NewYearReset />
      </TabPanel>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username *"
                value={userForm.username}
                onChange={(e) => {
                  setUserForm({ ...userForm, username: e.target.value });
                  if (validationErrors.username) {
                    setValidationErrors({ ...validationErrors, username: '' });
                  }
                }}
                error={!!validationErrors.username}
                helperText={validationErrors.username}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={userForm.email}
                onChange={(e) => {
                  setUserForm({ ...userForm, email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors({ ...validationErrors, email: '' });
                  }
                }}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role *</InputLabel>
                <Select
                  value={userForm.role}
                  label="Role *"
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'trainer' })}
                >
                  <MenuItem value="trainer">Trainer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={editingUser ? "New Password (leave empty to keep current)" : "Password *"}
                type="password"
                value={userForm.password}
                onChange={(e) => {
                  setUserForm({ ...userForm, password: e.target.value });
                  if (validationErrors.password) {
                    setValidationErrors({ ...validationErrors, password: '' });
                  }
                }}
                error={!!validationErrors.password}
                helperText={validationErrors.password}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assigned Groups</InputLabel>
                <Select
                  multiple
                  value={userForm.assignedGroups}
                  label="Assigned Groups"
                  onChange={(e) => setUserForm({ ...userForm, assignedGroups: e.target.value as string[] })}
                >
                  {groups.map(group => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assigned Years</InputLabel>
                <Select
                  multiple
                  value={userForm.assignedYears}
                  label="Assigned Years"
                  onChange={(e) => setUserForm({ ...userForm, assignedYears: e.target.value as number[] })}
                >
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <MenuItem key={year} value={year}>Year {year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? 'Update' : 'Add'} User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={handleCloseGroupDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGroup ? 'Edit Group' : 'Add New Group'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Group Name *"
                value={groupForm.name}
                onChange={(e) => {
                  setGroupForm({ ...groupForm, name: e.target.value });
                  if (validationErrors.name) {
                    setValidationErrors({ ...validationErrors, name: '' });
                  }
                }}
                error={!!validationErrors.name}
                helperText={validationErrors.name || 'e.g., Section A, Morning Group, Advanced Class'}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Year *</InputLabel>
                <Select
                  value={groupForm.year}
                  label="Year *"
                  onChange={(e) => setGroupForm({ ...groupForm, year: e.target.value as number })}
                >
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <MenuItem key={year} value={year}>Year {year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Optional description for this group"
              />
            </Grid>
            {(groupForm.year === 2 || groupForm.year === 3) && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="group-unit-select-label">Current Unit (Optional)</InputLabel>
                  <Select
                    labelId="group-unit-select-label"
                    id="group-unit-select"
                    value={groupForm.currentUnit}
                    label="Current Unit (Optional)"
                    onChange={(e: SelectChangeEvent) => {
                      setGroupForm({ ...groupForm, currentUnit: e.target.value });
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No unit selected</em>
                    </MenuItem>
                    {groupForm.year === 2 && [
                      <MenuItem key="MSK" value="MSK">MSK</MenuItem>,
                      <MenuItem key="HEM" value="HEM">HEM</MenuItem>,
                      <MenuItem key="CVS" value="CVS">CVS</MenuItem>,
                      <MenuItem key="Resp" value="Resp">Resp</MenuItem>
                    ]}
                    {groupForm.year === 3 && [
                      <MenuItem key="GIT" value="GIT">GIT</MenuItem>,
                      <MenuItem key="GUT" value="GUT">GUT</MenuItem>,
                      <MenuItem key="Neuro" value="Neuro">Neuro</MenuItem>,
                      <MenuItem key="END" value="END">END</MenuItem>
                    ]}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog}>Cancel</Button>
          <Button onClick={handleSaveGroup} variant="contained">
            {editingGroup ? 'Update' : 'Create'} Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;


