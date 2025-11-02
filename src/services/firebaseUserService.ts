// Firebase User Service - Proof of Concept
// This service handles user storage in Firebase Firestore
// Passwords remain in localStorage for now (will migrate to Firebase Auth later)

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, isConfigured } from '../config/firebase';
import { User } from '../types';

class FirebaseUserService {
  private usersCollection = 'users';

  // Get all users from Firebase
  async getAllUsers(): Promise<User[]> {
    if (!db || !isConfigured) {
      console.log('Firebase: Not configured, returning empty array');
      return [];
    }
    
    try {
      console.log('Firebase: Fetching all users from Firestore...');
      const usersSnapshot = await getDocs(collection(db, this.usersCollection));
      const users: User[] = [];
      
      usersSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const user = {
          id: docSnapshot.id,
          ...data,
          username: data.usernameOriginal || data.username, // Use original casing for display
        } as User;
        users.push(user);
      });

      console.log('Firebase: Retrieved', users.length, 'users from Firestore:', users.map(u => u.username));
      return users;
    } catch (error) {
      console.error('Firebase: Error getting users:', error);
      // Fallback to localStorage if Firebase fails
      const fallback = localStorage.getItem('users');
      return fallback ? JSON.parse(fallback) : [];
    }
  }

  // Get a single user by ID
  async getUserById(userId: string): Promise<User | null> {
    if (!db || !isConfigured) {
      return null;
    }
    
    try {
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Firebase: Error getting user:', error);
      return null;
    }
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<User | null> {
    if (!db || !isConfigured) {
      return null;
    }
    
    try {
      const q = query(
        collection(db, this.usersCollection),
        where('username', '==', username.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0];
        return { id: docSnapshot.id, ...docSnapshot.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Firebase: Error getting user by username:', error);
      return null;
    }
  }

  // Create a new user in Firebase
  async createUser(user: User): Promise<string> {
    if (!db || !isConfigured) {
      throw new Error('Firebase not configured');
    }
    
    try {
      const userId = user.id || `user-${Date.now()}`;
      const userRef = doc(db, this.usersCollection, userId);
      
      // Store username in lowercase for case-insensitive lookup
      const userData = {
        ...user,
        id: userId,
        username: user.username.toLowerCase().trim(),
        usernameOriginal: user.username, // Keep original for display
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Firebase: Creating user in Firestore:', userId, user.username);
      await setDoc(userRef, userData);
      console.log('Firebase: User created successfully in Firestore:', userId, user.username);
      return userId;
    } catch (error) {
      console.error('Firebase: Error creating user:', error);
      throw error;
    }
  }

  // Update a user in Firebase
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    if (!db || !isConfigured) {
      throw new Error('Firebase not configured');
    }
    
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const currentUser = await this.getUserById(userId);
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // If username changed, update both normalized and original
      const updateData: any = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.username) {
        updateData.username = updates.username.toLowerCase().trim();
        updateData.usernameOriginal = updates.username;
      }

      await setDoc(userRef, updateData, { merge: true });
      console.log('Firebase: User updated:', userId);
    } catch (error) {
      console.error('Firebase: Error updating user:', error);
      throw error;
    }
  }

  // Delete a user from Firebase
  async deleteUser(userId: string): Promise<void> {
    if (!db || !isConfigured) {
      throw new Error('Firebase not configured');
    }
    
    try {
      const userRef = doc(db, this.usersCollection, userId);
      await deleteDoc(userRef);
      console.log('Firebase: User deleted:', userId);
    } catch (error) {
      console.error('Firebase: Error deleting user:', error);
      throw error;
    }
  }

  // Subscribe to users collection (real-time updates)
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    if (!db || !isConfigured) {
      // Return empty unsubscribe function if not configured
      return () => {};
    }
    
    try {
      const usersQuery = collection(db, this.usersCollection);
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          users.push({
            id: docSnapshot.id,
            ...data,
            username: data.usernameOriginal || data.username, // Use original casing for display
          } as User);
        });
        console.log('Firebase: Users updated in real-time:', users.length, 'users:', users.map(u => u.username));
        callback(users);
      }, (error) => {
        console.error('Firebase: Error in users subscription:', error);
        // Fallback to regular fetch
        this.getAllUsers().then(callback);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Firebase: Error subscribing to users:', error);
      // Fallback to regular fetch
      this.getAllUsers().then(callback);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Check if Firebase is configured
  isConfigured(): boolean {
    return isConfigured;
  }
}

export default new FirebaseUserService();

