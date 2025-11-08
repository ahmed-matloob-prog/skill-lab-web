import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '../services/authService';
import FirebaseUserService from '../services/firebaseUserService';
import FirebasePasswordService from '../services/firebasePasswordService';
import { User, LoginCredentials, AuthState } from '../types';
import { logger } from '../utils/logger';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication system
   * 1. Sync users and passwords from Firebase to localStorage
   * 2. Check if user is already authenticated
   * 3. Subscribe to real-time user updates
   */
  const initializeAuth = async () => {
    try {
      logger.log('AuthContext: Initializing authentication...');

      // Step 1: Sync users from Firebase to localStorage (critical for multi-device login)
      if (FirebaseUserService.isConfigured()) {
        logger.log('AuthContext: Syncing users from Firebase...');

        // Fetch all users from Firebase
        const firebaseUsers = await FirebaseUserService.getAllUsers();

        if (firebaseUsers.length > 0) {
          logger.log(`AuthContext: Found ${firebaseUsers.length} users in Firebase, syncing to localStorage`);

          // Merge with existing localStorage users (preserve production users)
          const localUsersJson = localStorage.getItem('users');
          const localUsers: User[] = localUsersJson ? JSON.parse(localUsersJson) : [];

          // Create a map of existing users by ID
          const userMap = new Map<string, User>();
          localUsers.forEach(user => userMap.set(user.id, user));

          // Add/update Firebase users
          firebaseUsers.forEach(user => userMap.set(user.id, user));

          // Save merged users to localStorage
          const mergedUsers = Array.from(userMap.values());
          localStorage.setItem('users', JSON.stringify(mergedUsers));
          logger.log(`AuthContext: Merged ${mergedUsers.length} total users to localStorage`);
        } else {
          logger.log('AuthContext: No users found in Firebase');
        }

        // Step 2: Sync passwords from Firebase to localStorage
        logger.log('AuthContext: Syncing passwords from Firebase...');
        const firebasePasswords = await FirebasePasswordService.getAllPasswords();

        if (Object.keys(firebasePasswords).length > 0) {
          logger.log(`AuthContext: Found ${Object.keys(firebasePasswords).length} passwords in Firebase`);

          // Merge with existing localStorage passwords
          const localPasswordsJson = localStorage.getItem('userPasswords');
          const localPasswords = localPasswordsJson ? JSON.parse(localPasswordsJson) : {};

          // Merge passwords (Firebase takes precedence for conflicts)
          const mergedPasswords = { ...localPasswords, ...firebasePasswords };
          localStorage.setItem('userPasswords', JSON.stringify(mergedPasswords));
          logger.log(`AuthContext: Merged ${Object.keys(mergedPasswords).length} total passwords to localStorage`);
        } else {
          logger.log('AuthContext: No passwords found in Firebase');
        }

        // Step 3: Subscribe to real-time user updates
        logger.log('AuthContext: Setting up real-time user sync...');
        FirebaseUserService.subscribeToUsers((updatedUsers) => {
          logger.log(`AuthContext: Real-time update - ${updatedUsers.length} users from Firebase`);

          // Update localStorage with latest users
          const localUsersJson = localStorage.getItem('users');
          const localUsers: User[] = localUsersJson ? JSON.parse(localUsersJson) : [];

          const userMap = new Map<string, User>();
          localUsers.forEach(user => userMap.set(user.id, user));
          updatedUsers.forEach(user => userMap.set(user.id, user));

          const mergedUsers = Array.from(userMap.values());
          localStorage.setItem('users', JSON.stringify(mergedUsers));
          logger.log(`AuthContext: Real-time sync complete - ${mergedUsers.length} total users`);
        });
      } else {
        logger.log('AuthContext: Firebase not configured, using localStorage only');
      }

      // Step 4: Check authentication status
      await checkAuthStatus();

    } catch (error) {
      logger.error('AuthContext: Error initializing auth:', error);
      // Continue with auth check even if Firebase sync fails
      await checkAuthStatus();
    }
  };

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      if (isAuthenticated) {
        const user = await AuthService.getCurrentUser();
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check authentication status',
      });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      logger.log('AuthContext: Starting login for:', credentials.username);
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const user = await AuthService.login(credentials);

      logger.log('AuthContext: Login successful, setting auth state. User:', user);
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      logger.log('AuthContext: Auth state updated, should redirect to dashboard');
    } catch (error) {
      logger.error('AuthContext: Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      await AuthService.logout();
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Logout failed',
      }));
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      await AuthService.changePassword(authState.user.id, oldPassword, newPassword);
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Password change failed',
      }));
      throw error;
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    changePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};




