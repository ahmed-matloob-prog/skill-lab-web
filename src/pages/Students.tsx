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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Upload,
  Download,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { Student, Group } from '../types';
import {
  importStudentsFromExcel,
  downloadStudentTemplate
} from '../utils/excelUtils';
import DatabaseService from '../services/databaseService';
import { sanitizeString, validateName, validateStudentId, validateEmail } from '../utils/validator';

const Students: React.FC = () => {
  const { students, groups, addStudent, updateStudent, deleteStudent, refreshStudents, forceRefresh, loading } = useDatabase();
  const { user } = useAuth();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    phone: '',
    year: 1,
    groupId: '',
    unit: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    timestamp?: number;
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingImport, setLoadingImport] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Force refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshStudents();
    }
  }, [refreshTrigger]);

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

  // Debug: Log students data
  logger.log('Students data:', {
    totalStudents: students.length,
    filteredStudents: filteredStudents.length,
    selectedYear,
    selectedGroup,
    students: students.map(s => ({ name: s.name, year: s.year, groupId: s.groupId }))
  });

  // Debug: Log groups data
  logger.log('Groups data:', {
    totalGroups: groups.length,
    accessibleGroups: accessibleGroups.length,
    userRole: user?.role,
    groups: groups.map(g => ({ id: g.id, name: g.name, year: g.year }))
  });

  // Groups are available for all years, so no need to filter by year
  const filteredGroups = accessibleGroups;

  // Unit options based on year
  const getUnitOptions = (year: number) => {
    if (year === 2) {
      return [
        { value: 'MSK', label: 'MSK' },
        { value: 'HEM', label: 'HEM' },
        { value: 'CVS', label: 'CVS' },
        { value: 'Resp', label: 'Resp' },
      ];
    } else if (year === 3) {
      return [
        { value: 'GIT', label: 'GIT' },
        { value: 'GUT', label: 'GUT' },
        { value: 'Neuro', label: 'Neuro' },
        { value: 'END', label: 'END' },
      ];
    }
    return [];
  };

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        studentId: student.studentId,
        email: student.email || '',
        phone: student.phone || '',
        year: student.year,
        groupId: student.groupId,
        unit: student.unit || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        studentId: '',
        email: '',
        phone: '',
        year: 1,
        groupId: '',
        unit: '',
      });
    }
    setError(null);
    setValidationErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStudent(null);
    setError(null);
  };

  const validateStudentForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Validate student name
    if (!formData.name.trim()) {
      errors.name = 'Student name is required';
    } else if (!validateName(formData.name.trim())) {
      errors.name = 'Student name must be 2-100 characters and contain only letters and spaces';
    }

    // Validate student ID (if provided)
    if (formData.studentId.trim() && !validateStudentId(formData.studentId.trim())) {
      errors.studentId = 'Student ID must contain only alphanumeric characters and hyphens';
    }

    // Validate email (if provided)
    if (formData.email.trim() && !validateEmail(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate group selection
    if (!formData.groupId) {
      errors.groupId = 'Please select a group';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateStudentForm()) {
      return;
    }

    try {
      const studentData = {
        name: sanitizeString(formData.name.trim()),
        studentId: formData.studentId.trim() || `ST${Date.now()}`,
        email: formData.email.trim() ? sanitizeString(formData.email.trim()) : undefined,
        phone: formData.phone.trim() ? sanitizeString(formData.phone.trim()) : undefined,
        year: formData.year,
        groupId: formData.groupId,
        unit: formData.unit.trim() || undefined,
      };

      if (editingStudent) {
        await updateStudent(editingStudent.id, studentData);
      } else {
        await addStudent(studentData);
      }

      handleCloseDialog();
    } catch (error) {
      setError('Failed to save student');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(id);
      } catch (error) {
        setError('Failed to delete student');
      }
    }
  };

  const handleImportExcel = () => {
    setImportDialogOpen(true);
    setImportResults(null);
  };


  const handleDownloadTemplate = () => {
    try {
      downloadStudentTemplate();
    } catch (error) {
      setError('Failed to download template');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setLoadingImport(true);
    setError(null);

    try {
      const { students: importedStudents, errors } = await importStudentsFromExcel(file);
      
      // Use the new addStudents method with built-in duplicate checking
      const result = await DatabaseService.addStudents(importedStudents);
      
      // Combine Excel parsing errors with duplicate detection errors
      const allErrors = [...errors, ...result.errors];
      
      setImportResults({ 
        success: result.added, 
        errors: allErrors 
      });
      
      // Debug: Log the results before refresh
      logger.log('Import completed:', {
        imported: importedStudents.length,
        added: result.added,
        skipped: result.skipped,
        errors: allErrors.length
      });

      // Check localStorage before refresh
      const studentsInStorageBefore = JSON.parse(localStorage.getItem('students') || '[]');
      logger.log('Students in localStorage before refresh:', studentsInStorageBefore.length);
      logger.log('Students in React state before refresh:', students.length);

      // Force refresh the students data to update the UI
      await forceRefresh();

      // Check localStorage and React state after refresh
      const studentsInStorageAfter = JSON.parse(localStorage.getItem('students') || '[]');
      logger.log('Students in localStorage after refresh:', studentsInStorageAfter.length);
      logger.log('Students in React state after refresh:', students.length);
      
      // Force a re-render by updating a dummy state
      setImportResults(prev => prev ? { ...prev, timestamp: Date.now() } : null);
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      setError(`Import failed: ${error}`);
    } finally {
      setLoadingImport(false);
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportResults(null);
  };


  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'studentId', headerName: 'Student ID', width: 120 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 130 },
    { 
      field: 'year', 
      headerName: 'Year', 
      width: 80,
      renderCell: (params) => (
        <Chip label={`Year ${params.value}`} size="small" />
      ),
    },
    { 
      field: 'unit', 
      headerName: 'Unit', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'} 
          size="small" 
          color={params.value ? 'primary' : 'default'}
          variant={params.value ? 'filled' : 'outlined'}
        />
      ),
    },
    { 
      field: 'groupId', 
      headerName: 'Group', 
      width: 120,
      renderCell: (params) => getGroupName(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDialog(params.row);
            }}
            color="primary"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(params.row.id);
            }}
            color="error"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Students ({filteredStudents.length})
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={handleImportExcel}
            sx={{ mr: 1 }}
          >
            Import Excel
          </Button>
          <Button
            variant="outlined"
            onClick={handleDownloadTemplate}
            sx={{ mr: 1 }}
          >
            Download Template
          </Button>
          <Button
            variant="outlined"
            onClick={() => forceRefresh()}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Student
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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

      {/* Students Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </Typography>
        </CardContent>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredStudents.map(student => ({
              ...student,
              id: student.id || `student-${Date.now()}-${Math.random()}`
            }))}
            columns={columns}
            pageSize={50}
            rowsPerPageOptions={[25, 50, 100]}
            disableSelectionOnClick
            getRowId={(row) => row.id}
            onRowClick={(params) => {
              setSelectedStudent(params.row);
            }}
            sx={{
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(33, 150, 243, 0.04)',
              },
              '& .MuiDataGrid-row.Mui-selected': {
                backgroundColor: 'rgba(33, 150, 243, 0.12)',
              },
            }}
          />
        </Box>
      </Card>

      {/* Action Buttons for Selected Student */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          {selectedStudent ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selected: <strong>{selectedStudent.name}</strong> (ID: {selectedStudent.studentId})
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => handleOpenDialog(selectedStudent)}
                >
                  Edit Student
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleDelete(selectedStudent.id)}
                >
                  Delete Student
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click on a student row above or use the action buttons in the table to select a student
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  disabled
                >
                  Edit Student
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  disabled
                >
                  Delete Student
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Student Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStudent ? 'Edit Student' : 'Add New Student'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name *"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (validationErrors.name) {
                    setValidationErrors({ ...validationErrors, name: '' });
                  }
                }}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student ID"
                value={formData.studentId}
                onChange={(e) => {
                  setFormData({ ...formData, studentId: e.target.value });
                  if (validationErrors.studentId) {
                    setValidationErrors({ ...validationErrors, studentId: '' });
                  }
                }}
                error={!!validationErrors.studentId}
                helperText={validationErrors.studentId || 'Auto-generated if empty'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Year *</InputLabel>
                <Select
                  value={formData.year}
                  label="Year *"
                  onChange={(e) => setFormData({ ...formData, year: e.target.value as number, unit: '' })}
                >
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <MenuItem key={year} value={year}>Year {year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.unit}
                  label="Unit"
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  disabled={formData.year !== 2 && formData.year !== 3}
                >
                  <MenuItem value="">No Unit</MenuItem>
                  {getUnitOptions(formData.year).map(unit => (
                    <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors({ ...validationErrors, email: '' });
                  }
                }}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors.groupId}>
                <InputLabel>Group *</InputLabel>
                <Select
                  value={formData.groupId}
                  label="Group *"
                  onChange={(e) => {
                    setFormData({ ...formData, groupId: e.target.value });
                    if (validationErrors.groupId) {
                      setValidationErrors({ ...validationErrors, groupId: '' });
                    }
                  }}
                >
                  {accessibleGroups.map(group => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                  {accessibleGroups.length === 0 && (
                    <MenuItem disabled>No groups available</MenuItem>
                  )}
                </Select>
                {validationErrors.groupId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {validationErrors.groupId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingStudent ? 'Update' : 'Add'} Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={importDialogOpen} onClose={handleCloseImportDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Import Students from Excel
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {!importResults ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Upload an Excel file to import students. Make sure your file follows the required format.
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  sx={{ mr: 2 }}
                >
                  Download Template
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Download the template to see the required format
                </Typography>
              </Box>

              <Box sx={{ border: '2px dashed #ccc', p: 3, textAlign: 'center', borderRadius: 1 }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="excel-upload"
                />
                <label htmlFor="excel-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<Upload />}
                    disabled={loadingImport}
                  >
                    {loadingImport ? 'Processing...' : 'Choose Excel File'}
                  </Button>
                </label>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Supported formats: .xlsx, .xls
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Required columns:</strong> Student Name (or Name), Year, Group (or Group ID)<br/>
                  <strong>Optional columns:</strong> Student ID, Email, Phone, Unit<br/>
                  <strong>Column name variations supported:</strong><br/>
                  • Name: "name", "Student Name", "Name"<br/>
                  • Year: "year", "Year", "Academic Year"<br/>
                  • Group: "group", "Group", "Group ID"<br/>
                  <strong>Year:</strong> Must be a number between 1 and 6<br/>
                  <strong>Group:</strong> Must be Group1-Group30 or group-1-group-30 (available for all years)<br/>
                  <strong>Student ID:</strong> Auto-generated if not provided
                </Typography>
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                Import Results
              </Typography>
              
              <Alert 
                severity={importResults.errors.length > 0 ? "warning" : "success"} 
                sx={{ mb: 2 }}
              >
                Successfully imported {importResults.success} students
                {importResults.errors.length > 0 && ` with ${importResults.errors.length} errors`}
              </Alert>

              {importResults.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Errors:
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ccc', p: 1, borderRadius: 1 }}>
                    {importResults.errors.map((error, index) => (
                      <Typography key={index} variant="body2" color="error" sx={{ mb: 0.5 }}>
                        • {error}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog}>
            {importResults ? 'Close' : 'Cancel'}
          </Button>
          {importResults && (
            <Button onClick={handleCloseImportDialog} variant="contained">
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Students;
