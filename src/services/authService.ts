import { User, LoginCredentials } from '../types';
import FirebaseUserService from './firebaseUserService';
import FirebasePasswordService from './firebasePasswordService';

// Production users data - Admin user and demo trainer accounts
const productionUsers: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@skilllab.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'trainer-1',
    username: 'trainer1',
    email: 'trainer1@skilllab.com',
    role: 'trainer',
    assignedGroups: ['group-1', 'group-2', 'group-3'],
    assignedYears: [1, 2],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'trainer-2',
    username: 'trainer2',
    email: 'trainer2@skilllab.com',
    role: 'trainer',
    assignedGroups: ['group-4', 'group-5', 'group-6'],
    assignedYears: [2, 3],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'trainer-3',
    username: 'trainer3',
    email: 'trainer3@skilllab.com',
    role: 'trainer',
    assignedGroups: ['group-7', 'group-8', 'group-9'],
    assignedYears: [3, 4],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
];

// Default passwords (in a real app, these would be hashed)
const defaultPasswords: { [username: string]: string } = {
  'admin': 'admin123',
  'trainer1': 'trainer123',
  'trainer2': 'trainer123',
  'trainer3': 'trainer123',
};

class AuthService {
  private currentUser: User | null = null;
  private usersKey = 'users';
  private currentUserKey = 'currentUser';
  private passwordsKey = 'userPasswords';

  constructor() {
    this.initializeUsers();
    this.initializePasswords();
  }

  private initializeUsers(): void {
    // Initialize users in localStorage if they don't exist
    const existingUsers = localStorage.getItem(this.usersKey);
    if (!existingUsers) {
      localStorage.setItem(this.usersKey, JSON.stringify(productionUsers));
    } else {
      // Merge any new production users that don't exist in localStorage
      const storedUsers = JSON.parse(existingUsers);
      const mergedUsers = [...storedUsers];
      
      productionUsers.forEach(prodUser => {
        if (!storedUsers.find((user: User) => user.username === prodUser.username)) {
          mergedUsers.push(prodUser);
        }
      });
      
      // Update localStorage with merged users
      localStorage.setItem(this.usersKey, JSON.stringify(mergedUsers));
    }
  }

  private initializePasswords(): void {
    // Initialize passwords in localStorage if they don't exist
    const existingPasswords = localStorage.getItem(this.passwordsKey);
    if (!existingPasswords) {
      localStorage.setItem(this.passwordsKey, JSON.stringify(defaultPasswords));
    } else {
      // Merge any new default passwords that don't exist in localStorage
      const storedPasswords = JSON.parse(existingPasswords);
      const mergedPasswords = { ...storedPasswords };
      
      Object.keys(defaultPasswords).forEach(username => {
        if (!(username in mergedPasswords)) {
          mergedPasswords[username] = defaultPasswords[username];
        }
      });
      
      // Update localStorage with merged passwords
      localStorage.setItem(this.passwordsKey, JSON.stringify(mergedPasswords));
    }
  }

  private async getPasswords(): Promise<{ [username: string]: string }> {
    // Start with localStorage passwords (for default users and backwards compatibility)
    const localPasswords = localStorage.getItem(this.passwordsKey);
    const passwords = localPasswords ? JSON.parse(localPasswords) : { ...defaultPasswords };
    
    // Merge with Firebase passwords if configured
    if (FirebasePasswordService.isConfigured()) {
      try {
        // Get passwords from Firebase for each user
        const allUsers = await this.getUsers();
        for (const user of allUsers) {
          const normalizedUsername = this.normalizeUsername(user.username);
          const firebasePassword = await FirebasePasswordService.getPassword(normalizedUsername);
          if (firebasePassword) {
            passwords[normalizedUsername] = firebasePassword;
            // Also store with original username if different
            if (normalizedUsername !== user.username) {
              passwords[user.username] = firebasePassword;
            }
          }
        }
      } catch (error) {
        console.error('Firebase: Error getting passwords, using localStorage only:', error);
      }
    }
    
    return passwords;
  }

  private async savePasswords(passwords: { [username: string]: string }): Promise<void> {
    // Save to localStorage (for default users and backwards compatibility)
    localStorage.setItem(this.passwordsKey, JSON.stringify(passwords));
    
    // Also save to Firebase if configured (for new users)
    if (FirebasePasswordService.isConfigured()) {
      try {
        // Save passwords for non-production users to Firebase
        const productionUsernames = productionUsers.map(u => u.username.toLowerCase());
        
        for (const [username, password] of Object.entries(passwords)) {
          const normalizedUsername = username.toLowerCase().trim();
          // Don't save production user passwords to Firebase (they're hardcoded)
          if (!productionUsernames.includes(normalizedUsername)) {
            await FirebasePasswordService.savePassword(normalizedUsername, password);
          }
        }
      } catch (error) {
        console.error('Firebase: Error saving passwords, using localStorage only:', error);
      }
    }
  }

  private async getUsers(): Promise<User[]> {
    // Try Firebase first if configured
    if (FirebaseUserService.isConfigured()) {
      try {
        const firebaseUsers = await FirebaseUserService.getAllUsers();
        // Merge with production users (default admin and trainers)
        const allUsers = [...productionUsers];
        
        // Add Firebase users, avoiding duplicates
        firebaseUsers.forEach(fbUser => {
          if (!allUsers.find(u => u.username.toLowerCase() === fbUser.username.toLowerCase())) {
            allUsers.push(fbUser);
          }
        });
        
        return allUsers;
      } catch (error) {
        console.error('Firebase: Error getting users, falling back to localStorage:', error);
        // Fallback to localStorage
      }
    }
    
    // Fallback to localStorage
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : productionUsers;
  }

  private async saveUsers(users: User[]): Promise<void> {
    // Save to Firebase if configured
    if (FirebaseUserService.isConfigured()) {
      try {
        // Filter out production users (they're hardcoded)
        const productionUsernames = productionUsers.map(u => u.username.toLowerCase());
        const usersToSave = users.filter(u => 
          !productionUsernames.includes(u.username.toLowerCase())
        );
        
        // Get existing Firebase users to compare
        const existingFirebaseUsers = await FirebaseUserService.getAllUsers();
        const existingIds = new Set(existingFirebaseUsers.map(u => u.id));
        
        // Save/update each user in Firebase
        for (const user of usersToSave) {
          if (existingIds.has(user.id)) {
            await FirebaseUserService.updateUser(user.id, user);
          } else {
            await FirebaseUserService.createUser(user);
          }
        }
        
        // Delete users that are in Firebase but not in the new list
        for (const fbUser of existingFirebaseUsers) {
          if (!users.find(u => u.id === fbUser.id)) {
            await FirebaseUserService.deleteUser(fbUser.id);
          }
        }
        
        console.log('Firebase: Users saved successfully');
      } catch (error) {
        console.error('Firebase: Error saving users, falling back to localStorage:', error);
        // Fallback to localStorage
        localStorage.setItem(this.usersKey, JSON.stringify(users));
      }
    } else {
      // Use localStorage if Firebase not configured
      localStorage.setItem(this.usersKey, JSON.stringify(users));
    }
  }

  // Normalize username for consistent lookup (lowercase + trim)
  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  // Find password by username (case-insensitive lookup)
  private findPasswordByUsername(username: string, passwords: { [username: string]: string }): string | undefined {
    const normalized = this.normalizeUsername(username);
    console.log('findPasswordByUsername: Looking for username:', username, 'normalized:', normalized);
    console.log('findPasswordByUsername: Available password keys:', Object.keys(passwords));
    console.log('findPasswordByUsername: passwords[username]:', passwords[username]);
    console.log('findPasswordByUsername: passwords[normalized]:', passwords[normalized]);
    
    // Try exact match first (for performance)
    if (passwords[username]) {
      console.log('findPasswordByUsername: Found via exact match');
      return passwords[username];
    }
    // Try normalized match
    if (passwords[normalized]) {
      console.log('findPasswordByUsername: Found via normalized match');
      return passwords[normalized];
    }
    // Try case-insensitive search through all keys
    const matchingKey = Object.keys(passwords).find(key => this.normalizeUsername(key) === normalized);
    console.log('findPasswordByUsername: Case-insensitive search found key:', matchingKey);
    return matchingKey ? passwords[matchingKey] : undefined;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const { username, password } = credentials;
    const normalizedUsername = this.normalizeUsername(username);
    
    console.log('AuthService: Login attempt for username:', username, 'normalized:', normalizedUsername);
    
    // Find user by username (case-insensitive)
    const users = await this.getUsers();
    console.log('AuthService: Total users found:', users.length);
    const user = users.find(u => this.normalizeUsername(u.username) === normalizedUsername && u.isActive);
    
    if (!user) {
      console.error('AuthService: User not found or not active:', username);
      throw new Error('Invalid username or password');
    }

    console.log('AuthService: User found:', user.username, 'role:', user.role);

    // Check password (in a real app, this would be hashed)
    const passwords = await this.getPasswords();
    const correctPassword = this.findPasswordByUsername(username, passwords);
    console.log('AuthService: Password lookup result:', correctPassword ? 'Found' : 'Not found');
    console.log('AuthService: Input password length:', password.length, 'Correct password length:', correctPassword?.length);
    console.log('AuthService: Input password:', password, 'Correct password:', correctPassword);
    console.log('AuthService: Passwords match?', password === correctPassword);
    
    if (!correctPassword || password !== correctPassword) {
      console.error('AuthService: Password mismatch for user:', username);
      console.error('AuthService: Expected:', correctPassword, 'Got:', password);
      throw new Error('Invalid username or password');
    }
    
    console.log('AuthService: Login successful for user:', username);

    // Update last login
    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    // Update user in storage
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    await this.saveUsers(updatedUsers);

    // Set current user
    this.currentUser = updatedUser;
    localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));

    return updatedUser;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem(this.currentUserKey);
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const userData = localStorage.getItem(this.currentUserKey);
    if (userData) {
      this.currentUser = JSON.parse(userData);
      return this.currentUser;
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check old password (case-insensitive lookup)
    const passwords = await this.getPasswords();
    const correctPassword = this.findPasswordByUsername(user.username, passwords);
    if (!correctPassword || oldPassword !== correctPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password (in a real app, this would be hashed)
    // Store with normalized username for consistency
    const normalizedUsername = this.normalizeUsername(user.username);
    passwords[normalizedUsername] = newPassword;
    // Also keep original for backwards compatibility
    if (normalizedUsername !== user.username) {
      passwords[user.username] = newPassword;
    }
    await this.savePasswords(passwords);

    // Update user
    const updatedUser = {
      ...user,
      updatedAt: new Date().toISOString(),
    };

    const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
    this.saveUsers(updatedUsers);

    // Update current user if it's the same user
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = updatedUser;
      localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.getUsers();
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>, password: string): Promise<User> {
    console.log('AuthService: createUser called with username:', userData.username, 'password length:', password.length);
    console.log('AuthService: createUser received password:', password);
    
    const users = await this.getUsers();
    const normalizedUsername = this.normalizeUsername(userData.username);
    
    // Check if username already exists (case-insensitive)
    if (users.find(u => this.normalizeUsername(u.username) === normalizedUsername)) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Add password to stored passwords (in a real app, this would be hashed)
    // Store password with normalized username as key for consistent lookup
    const passwords = await this.getPasswords();
    passwords[normalizedUsername] = password;
    // Also store with original username for backwards compatibility
    if (normalizedUsername !== userData.username) {
      passwords[userData.username] = password;
    }
    
    console.log('AuthService: Saving password for user:', userData.username, 'normalized:', normalizedUsername);
    console.log('AuthService: Password being saved:', password);
    console.log('AuthService: Password stored at key:', normalizedUsername, 'value:', passwords[normalizedUsername]);
    
    await this.savePasswords(passwords);

    const updatedUsers = [...users, newUser];
    await this.saveUsers(updatedUsers);

    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
    await this.saveUsers(updatedUsers);

    // Update current user if it's the same user
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = updatedUser;
      localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the admin user
    if (user.role === 'admin' && user.username === 'admin') {
      throw new Error('Cannot delete the admin user');
    }

    // Delete from Firebase if configured
    if (FirebaseUserService.isConfigured() && !productionUsers.find(u => u.id === userId)) {
      try {
        await FirebaseUserService.deleteUser(userId);
        console.log('Firebase: User deleted:', userId);
      } catch (error) {
        console.error('Firebase: Error deleting user, falling back to localStorage:', error);
      }
    }

    // Remove user from storage
    const updatedUsers = users.filter(u => u.id !== userId);
    await this.saveUsers(updatedUsers);

    // Remove password from stored passwords (remove both normalized and original if different)
    const passwords = await this.getPasswords();
    const normalizedUsername = this.normalizeUsername(user.username);
    delete passwords[normalizedUsername];
    if (normalizedUsername !== user.username) {
      delete passwords[user.username];
    }
    // Also clean up any case variations
    Object.keys(passwords).forEach(key => {
      if (this.normalizeUsername(key) === normalizedUsername) {
        delete passwords[key];
      }
    });
    await this.savePasswords(passwords);
    
    // Also delete from Firebase
    if (FirebasePasswordService.isConfigured()) {
      try {
        await FirebasePasswordService.deletePassword(user.username);
      } catch (error) {
        console.error('Firebase: Error deleting password:', error);
      }
    }

    // If the deleted user is the current user, log them out
    if (this.currentUser && this.currentUser.id === userId) {
      await this.logout();
    }
  }
}

export default new AuthService();