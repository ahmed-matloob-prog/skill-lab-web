import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeString, validateUsername } from '../utils/validator';

const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    // Validate username
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (!validateUsername(username.trim())) {
      errors.username = 'Username must be 3-50 characters (alphanumeric and underscores only)';
    }

    // Validate password
    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isLoading) {
      return;
    }

    try {
      // Sanitize username before submitting
      const sanitizedUsername = sanitizeString(username.trim());
      await login({ username: sanitizedUsername, password });
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleInputChange = (field: 'username' | 'password', value: string) => {
    if (error) clearError();

    if (field === 'username') {
      setUsername(value);
      // Clear validation error for username when user starts typing
      if (validationErrors.username) {
        setValidationErrors({ ...validationErrors, username: undefined });
      }
    } else {
      setPassword(value);
      // Clear validation error for password when user starts typing
      if (validationErrors.password) {
        setValidationErrors({ ...validationErrors, password: undefined });
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Student Attendance
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              margin="normal"
              disabled={isLoading}
              autoComplete="username"
              error={!!validationErrors.username}
              helperText={validationErrors.username}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              margin="normal"
              disabled={isLoading}
              autoComplete="current-password"
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading || !username.trim() || !password.trim() || Object.keys(validationErrors).length > 0}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>

          <Card sx={{ mt: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <em>Student Attendance Management System</em><br />
                <em>Contact your system administrator for login credentials.</em>
              </Typography>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;




