import { User, LoginCredentials } from '../types';

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

  private getPasswords(): { [username: string]: string } {
    const passwords = localStorage.getItem(this.passwordsKey);
    return passwords ? JSON.parse(passwords) : defaultPasswords;
  }

  private savePasswords(passwords: { [username: string]: string }): void {
    localStorage.setItem(this.passwordsKey, JSON.stringify(passwords));
  }

  private getUsers(): User[] {
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : productionUsers;
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  // Normalize username for consistent lookup (lowercase + trim)
  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  // Find password by username (case-insensitive lookup)
  private findPasswordByUsername(username: string, passwords: { [username: string]: string }): string | undefined {
    const normalized = this.normalizeUsername(username);
    // Try exact match first (for performance)
    if (passwords[username]) {
      return passwords[username];
    }
    // Try normalized match
    if (passwords[normalized]) {
      return passwords[normalized];
    }
    // Try case-insensitive search through all keys
    const matchingKey = Object.keys(passwords).find(key => this.normalizeUsername(key) === normalized);
    return matchingKey ? passwords[matchingKey] : undefined;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const { username, password } = credentials;
    const normalizedUsername = this.normalizeUsername(username);
    
    // Find user by username (case-insensitive)
    const users = this.getUsers();
    const user = users.find(u => this.normalizeUsername(u.username) === normalizedUsername && u.isActive);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check password (in a real app, this would be hashed)
    const passwords = this.getPasswords();
    const correctPassword = this.findPasswordByUsername(username, passwords);
    if (!correctPassword || password !== correctPassword) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    const updatedUser = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    // Update user in storage
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    this.saveUsers(updatedUsers);

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
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check old password (case-insensitive lookup)
    const passwords = this.getPasswords();
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
    this.savePasswords(passwords);

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
    return this.getUsers();
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>, password: string): Promise<User> {
    const users = this.getUsers();
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
    const passwords = this.getPasswords();
    passwords[normalizedUsername] = password;
    // Also store with original username for backwards compatibility
    if (normalizedUsername !== userData.username) {
      passwords[userData.username] = password;
    }
    this.savePasswords(passwords);

    const updatedUsers = [...users, newUser];
    this.saveUsers(updatedUsers);

    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const users = this.getUsers();
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
    this.saveUsers(updatedUsers);

    // Update current user if it's the same user
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = updatedUser;
      localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the admin user
    if (user.role === 'admin' && user.username === 'admin') {
      throw new Error('Cannot delete the admin user');
    }

    // Remove user from storage
    const updatedUsers = users.filter(u => u.id !== userId);
    this.saveUsers(updatedUsers);

    // Remove password from stored passwords (remove both normalized and original if different)
    const passwords = this.getPasswords();
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
    this.savePasswords(passwords);

    // If the deleted user is the current user, log them out
    if (this.currentUser && this.currentUser.id === userId) {
      await this.logout();
    }
  }
}

export default new AuthService();