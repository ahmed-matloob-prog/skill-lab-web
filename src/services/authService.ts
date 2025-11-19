import { User, LoginCredentials } from '../types';
import FirebaseUserService from './firebaseUserService';
import FirebasePasswordService from './firebasePasswordService';
import { hashPassword, verifyPassword, isBcryptHash } from '../utils/passwordUtils';
import { logger } from '../utils/logger';
import { STORAGE_KEYS, USER_ROLES, DEFAULT_CREDENTIALS, DEFAULT_USER_IDS, DEFAULT_GROUP_IDS } from '../constants';

// Production users data - Keep only default admin as fallback
const productionUsers: User[] = [
  {
    id: DEFAULT_USER_IDS.ADMIN,
    username: DEFAULT_CREDENTIALS.ADMIN.USERNAME,
    email: DEFAULT_CREDENTIALS.ADMIN.EMAIL,
    role: USER_ROLES.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  // Demo trainers removed - create your own trainers through Admin Panel
];

// Default passwords - will be hashed on first use
// These are only used for initial setup
const defaultPlaintextPasswords: { [username: string]: string } = {
  [DEFAULT_CREDENTIALS.ADMIN.USERNAME]: DEFAULT_CREDENTIALS.ADMIN.PASSWORD,
  // Demo trainer passwords removed
};

class AuthService {
  private currentUser: User | null = null;
  private usersKey = STORAGE_KEYS.USERS;
  private currentUserKey = STORAGE_KEYS.CURRENT_USER;
  private passwordsKey = STORAGE_KEYS.USER_PASSWORDS;
  private initialized: Promise<void>;

  constructor() {
    this.initializeUsers();
    // Initialize passwords asynchronously and store the promise
    this.initialized = this.initializePasswords();
  }

  // Ensure initialization is complete before any operations
  private async ensureInitialized(): Promise<void> {
    await this.initialized;
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

  private async initializePasswords(): Promise<void> {
    // Initialize passwords in localStorage if they don't exist
    const existingPasswords = localStorage.getItem(this.passwordsKey);
    if (!existingPasswords) {
      // Hash default passwords before storing
      const hashedPasswords: { [username: string]: string } = {};
      for (const [username, plaintextPassword] of Object.entries(defaultPlaintextPasswords)) {
        hashedPasswords[username] = await hashPassword(plaintextPassword);
      }
      localStorage.setItem(this.passwordsKey, JSON.stringify(hashedPasswords));
      logger.log('Initialized passwords with bcrypt hashing');
    } else {
      // Migrate existing plaintext passwords to hashed passwords
      const storedPasswords = JSON.parse(existingPasswords);
      let needsMigration = false;

      for (const [username, password] of Object.entries(storedPasswords)) {
        // Check if password is already hashed
        if (!isBcryptHash(password as string)) {
          needsMigration = true;
          logger.log(`Migrating plaintext password for user: ${username}`);
          storedPasswords[username] = await hashPassword(password as string);
        }
      }

      // Add any new default users that don't exist
      for (const [username, plaintextPassword] of Object.entries(defaultPlaintextPasswords)) {
        if (!(username in storedPasswords)) {
          storedPasswords[username] = await hashPassword(plaintextPassword);
          logger.log(`Added new default user: ${username}`);
        }
      }

      if (needsMigration) {
        localStorage.setItem(this.passwordsKey, JSON.stringify(storedPasswords));
        logger.log('Password migration completed');
      }
    }
  }

  private async getPasswords(): Promise<{ [username: string]: string }> {
    // OPTIMIZED: Use localStorage only (already synced by AuthContext)
    // No need to fetch from Firebase during login - it's already synced in background
    const localPasswords = localStorage.getItem(this.passwordsKey);
    const passwords = localPasswords ? JSON.parse(localPasswords) : {};

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
        logger.error('Firebase: Error saving passwords, using localStorage only:', error);
      }
    }
  }

  private async getUsers(): Promise<User[]> {
    // OPTIMIZED: Use localStorage only (already synced by AuthContext)
    // No need to fetch from Firebase during login - it's already synced in background
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
        
        logger.log('AuthService: Saving', usersToSave.length, 'users to Firebase (excluding', productionUsernames.length, 'production users)');
        
        // Get existing Firebase users to compare
        const existingFirebaseUsers = await FirebaseUserService.getAllUsers();
        const existingIds = new Set(existingFirebaseUsers.map(u => u.id));
        
        // Save/update each user in Firebase
        for (const user of usersToSave) {
          if (existingIds.has(user.id)) {
            logger.log('AuthService: Updating existing Firebase user:', user.username);
            await FirebaseUserService.updateUser(user.id, user);
          } else {
            logger.log('AuthService: Creating new Firebase user:', user.username);
            await FirebaseUserService.createUser(user);
          }
        }
        
        // Delete users that are in Firebase but not in the new list
        for (const fbUser of existingFirebaseUsers) {
          if (!users.find(u => u.id === fbUser.id)) {
            logger.log('AuthService: Deleting Firebase user:', fbUser.username);
            await FirebaseUserService.deleteUser(fbUser.id);
          }
        }
        
        logger.log('AuthService: All users saved successfully to Firebase');
      } catch (error) {
        logger.error('Firebase: Error saving users, falling back to localStorage:', error);
        // Fallback to localStorage
        localStorage.setItem(this.usersKey, JSON.stringify(users));
      }
    } else {
      logger.log('AuthService: Firebase not configured, saving to localStorage only');
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
    logger.log('findPasswordByUsername: Looking for username:', username, 'normalized:', normalized);

    // Try exact match first (for performance)
    if (passwords[username]) {
      logger.log('findPasswordByUsername: Found via exact match');
      return passwords[username];
    }
    // Try normalized match
    if (passwords[normalized]) {
      logger.log('findPasswordByUsername: Found via normalized match');
      return passwords[normalized];
    }
    // Try case-insensitive search through all keys
    const matchingKey = Object.keys(passwords).find(key => this.normalizeUsername(key) === normalized);
    logger.log('findPasswordByUsername: Case-insensitive search found key:', matchingKey);
    return matchingKey ? passwords[matchingKey] : undefined;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    await this.ensureInitialized(); // Wait for password hashing to complete

    const { username, password } = credentials;
    const normalizedUsername = this.normalizeUsername(username);

    logger.log('AuthService: Login attempt for username:', username, 'normalized:', normalizedUsername);

    // Find user by username (case-insensitive)
    const users = await this.getUsers();
    logger.log('AuthService: Total users found:', users.length);
    const user = users.find(u => this.normalizeUsername(u.username) === normalizedUsername && u.isActive);

    if (!user) {
      logger.error('AuthService: User not found or not active:', username);
      throw new Error('Invalid username or password');
    }

    logger.log('AuthService: User found:', user.username, 'role:', user.role);

    // Check password using bcrypt
    const passwords = await this.getPasswords();
    const hashedPassword = this.findPasswordByUsername(username, passwords);

    if (!hashedPassword) {
      logger.error('AuthService: No password found for user:', username);
      throw new Error('Invalid username or password');
    }

    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, hashedPassword);

    if (!isPasswordValid) {
      logger.error('AuthService: Password verification failed for user:', username);
      throw new Error('Invalid username or password');
    }

    logger.log('AuthService: Login successful for user:', username);

    // Update last login
    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    // OPTIMIZED: Update only this specific user in localStorage (FAST!)
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    localStorage.setItem(this.usersKey, JSON.stringify(updatedUsers));

    // Update in Firebase in BACKGROUND (non-blocking)
    if (FirebaseUserService.isConfigured()) {
      FirebaseUserService.updateUser(updatedUser.id, updatedUser).catch(error => {
        logger.error('AuthService: Error updating user in Firebase (non-blocking):', error);
      });
    }

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
    await this.ensureInitialized();

    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password using bcrypt
    const passwords = await this.getPasswords();
    const hashedPassword = this.findPasswordByUsername(user.username, passwords);

    if (!hashedPassword) {
      throw new Error('Current password is incorrect');
    }

    const isOldPasswordValid = await verifyPassword(oldPassword, hashedPassword);
    if (!isOldPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newHashedPassword = await hashPassword(newPassword);

    // Store with normalized username for consistency
    const normalizedUsername = this.normalizeUsername(user.username);
    passwords[normalizedUsername] = newHashedPassword;
    // Also keep original for backwards compatibility
    if (normalizedUsername !== user.username) {
      passwords[user.username] = newHashedPassword;
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
    await this.ensureInitialized();

    logger.log('AuthService: createUser called with username:', userData.username, 'password length:', password.length);

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

    logger.log('AuthService: Creating new user:', newUser.username, 'ID:', newUser.id);

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    // Store password with normalized username as key for consistent lookup
    const passwords = await this.getPasswords();
    passwords[normalizedUsername] = hashedPassword;
    // Also store with original username for backwards compatibility
    if (normalizedUsername !== userData.username) {
      passwords[userData.username] = hashedPassword;
    }

    logger.log('AuthService: Saving hashed password for user:', userData.username);

    await this.savePasswords(passwords);

    // Save user to Firebase and localStorage
    const updatedUsers = [...users, newUser];
    logger.log('AuthService: Saving user to storage. Total users:', updatedUsers.length);
    await this.saveUsers(updatedUsers);

    logger.log('AuthService: User created and saved successfully:', newUser.username);

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

    // Update in localStorage immediately
    const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
    localStorage.setItem(this.usersKey, JSON.stringify(updatedUsers));

    // Update in Firebase (OPTIMIZED - only update this specific user, not all users)
    if (FirebaseUserService.isConfigured()) {
      try {
        logger.log('AuthService: Updating single user in Firebase:', updatedUser.username);
        await FirebaseUserService.updateUser(userId, updatedUser);
        logger.log('AuthService: User updated successfully in Firebase');
      } catch (error) {
        logger.error('Firebase: Error updating user, data saved to localStorage:', error);
        // Data is already saved to localStorage, so operation still succeeds
      }
    }

    // Update current user if it's the same user
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = updatedUser;
      localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));
    }

    return updatedUser;
  }

  async archiveUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow archiving the admin user
    if (user.role === USER_ROLES.ADMIN && user.username === DEFAULT_CREDENTIALS.ADMIN.USERNAME) {
      throw new Error('Cannot archive the admin user');
    }

    // Set user as inactive
    await this.updateUser(userId, { isActive: false });

    logger.log('User archived:', user.username);
  }

  async restoreUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Set user as active
    await this.updateUser(userId, { isActive: true });

    logger.log('User restored:', user.username);
  }

  async deleteUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the admin user
    if (user.role === USER_ROLES.ADMIN && user.username === DEFAULT_CREDENTIALS.ADMIN.USERNAME) {
      throw new Error('Cannot delete the admin user');
    }

    // Delete from Firebase if configured
    if (FirebaseUserService.isConfigured() && !productionUsers.find(u => u.id === userId)) {
      try {
        await FirebaseUserService.deleteUser(userId);
        logger.log('Firebase: User deleted:', userId);
      } catch (error) {
        logger.error('Firebase: Error deleting user, falling back to localStorage:', error);
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
        logger.error('Firebase: Error deleting password:', error);
      }
    }

    // If the deleted user is the current user, log them out
    if (this.currentUser && this.currentUser.id === userId) {
      await this.logout();
    }
  }
}

export default new AuthService();