// Firebase Password Service - Proof of Concept
// This service handles password storage in Firebase Firestore
// Note: In production, use Firebase Authentication instead of storing passwords

import { collection, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isConfigured } from '../config/firebase';

class FirebasePasswordService {
  private passwordsCollection = 'passwords';

  // Get password for a username
  async getPassword(username: string): Promise<string | null> {
    if (!db || !isConfigured) {
      return null;
    }

    try {
      const normalizedUsername = username.toLowerCase().trim();
      const passwordDoc = await getDoc(doc(db, this.passwordsCollection, normalizedUsername));
      
      if (passwordDoc.exists()) {
        const password = passwordDoc.data().password;
        console.log('Firebase: Password retrieved for:', normalizedUsername);
        return password;
      }
      console.log('Firebase: No password found for:', normalizedUsername);
      return null;
    } catch (error) {
      console.error('Firebase: Error getting password:', error);
      return null;
    }
  }

  // Get all passwords
  async getAllPasswords(): Promise<{ [username: string]: string }> {
    if (!db || !isConfigured) {
      return {};
    }

    try {
      // Note: Firestore doesn't have a direct "get all documents" that's efficient
      // For now, we'll use localStorage as primary, Firebase as sync
      // This is a POC limitation - full implementation would use Firebase Auth
      const passwords: { [username: string]: string } = {};
      return passwords;
    } catch (error) {
      console.error('Firebase: Error getting all passwords:', error);
      return {};
    }
  }

  // Save password for a username
  async savePassword(username: string, password: string): Promise<void> {
    if (!db || !isConfigured) {
      return;
    }

    try {
      const normalizedUsername = username.toLowerCase().trim();
      const passwordRef = doc(db, this.passwordsCollection, normalizedUsername);
      
      await setDoc(passwordRef, {
        username: normalizedUsername,
        password: password,
        updatedAt: new Date().toISOString(),
      });
      
      console.log('Firebase: Password saved for:', normalizedUsername);
    } catch (error) {
      console.error('Firebase: Error saving password:', error);
    }
  }

  // Delete password for a username
  async deletePassword(username: string): Promise<void> {
    if (!db || !isConfigured) {
      return;
    }

    try {
      const normalizedUsername = username.toLowerCase().trim();
      const passwordRef = doc(db, this.passwordsCollection, normalizedUsername);
      await deleteDoc(passwordRef);
      console.log('Firebase: Password deleted for:', normalizedUsername);
    } catch (error) {
      console.error('Firebase: Error deleting password:', error);
    }
  }

  // Check if Firebase is configured
  isConfigured(): boolean {
    return isConfigured;
  }
}

export default new FirebasePasswordService();

