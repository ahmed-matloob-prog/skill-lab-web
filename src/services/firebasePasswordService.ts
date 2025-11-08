// Firebase Password Service - Proof of Concept
// This service handles password storage in Firebase Firestore
// Note: In production, use Firebase Authentication instead of storing passwords

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isConfigured } from '../config/firebase';
import { logger } from '../utils/logger';

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
        logger.log('Firebase: Password retrieved for:', normalizedUsername);
        return password;
      }
      logger.log('Firebase: No password found for:', normalizedUsername);
      return null;
    } catch (error) {
      logger.error('Firebase: Error getting password:', error);
      return null;
    }
  }

  // Get all passwords
  async getAllPasswords(): Promise<{ [username: string]: string }> {
    if (!db || !isConfigured) {
      return {};
    }

    try {
      logger.log('Firebase: Fetching all passwords from Firestore...');
      const passwordsSnapshot = await getDocs(collection(db, this.passwordsCollection));
      const passwords: { [username: string]: string } = {};

      passwordsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const username = data.username || docSnapshot.id;
        passwords[username] = data.password;
      });

      logger.log('Firebase: Retrieved', Object.keys(passwords).length, 'passwords from Firestore');
      return passwords;
    } catch (error) {
      logger.error('Firebase: Error getting all passwords:', error);
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

      logger.log('Firebase: Password saved for:', normalizedUsername);
    } catch (error) {
      logger.error('Firebase: Error saving password:', error);
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
      logger.log('Firebase: Password deleted for:', normalizedUsername);
    } catch (error) {
      logger.error('Firebase: Error deleting password:', error);
    }
  }

  // Check if Firebase is configured
  isConfigured(): boolean {
    return isConfigured;
  }
}

export default new FirebasePasswordService();

