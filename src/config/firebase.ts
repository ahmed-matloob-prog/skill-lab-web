// Firebase Configuration
// TODO: Replace these values with your Firebase project credentials
// Get them from: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { logger } from '../utils/logger';

// Your Firebase configuration
// You'll get this from Firebase Console > Project Settings > General > Your apps > Web app
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Check if Firebase is properly configured
const isConfigured = firebaseConfig.projectId !== "YOUR_PROJECT_ID" && 
                     firebaseConfig.projectId !== undefined &&
                     firebaseConfig.apiKey !== "YOUR_API_KEY";

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    logger.log('Firebase: Initialized successfully');
  } catch (error) {
    logger.error('Firebase: Initialization error:', error);
  }
} else {
  logger.log('Firebase: Not configured. Using localStorage fallback.');
}

export { auth, db, isConfigured };
export default app;

