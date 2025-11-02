# Firebase Setup Guide - Proof of Concept

This guide will help you set up Firebase for the proof of concept.

---

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `skill-lab-web` (or your preferred name)
4. Click **"Continue"**
5. Disable Google Analytics (not needed for POC) or enable if you want
6. Click **"Create project"**
7. Wait for project creation (30 seconds)

---

## Step 2: Enable Firestore Database

1. In Firebase Console, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a location (choose closest to your users)
5. Click **"Enable"**
6. Wait for database creation

---

## Step 3: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** (⚙️) → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **"</>"** (Web) icon to add a web app
4. Register app:
   - App nickname: `Skill Lab Web` (optional)
   - Check **"Also set up Firebase Hosting"** (optional, we're using Vercel)
   - Click **"Register app"**
5. Copy the `firebaseConfig` object that appears

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "skill-lab-web.firebaseapp.com",
  projectId: "skill-lab-web",
  storageBucket: "skill-lab-web.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

---

## Step 4: Add Configuration to Your App

### Option A: Environment Variables (Recommended for Production)

1. Create `.env` file in project root:
```bash
# .env
REACT_APP_FIREBASE_API_KEY=AIzaSyC...
REACT_APP_FIREBASE_AUTH_DOMAIN=skill-lab-web.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=skill-lab-web
REACT_APP_FIREBASE_STORAGE_BUCKET=skill-lab-web.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

2. Add `.env` to `.gitignore` (if not already there)

### Option B: Direct Configuration (Quick Test)

1. Edit `src/config/firebase.ts`
2. Replace the placeholder values with your actual Firebase config

---

## Step 5: Test Firebase Connection

1. Start the app: `npm start`
2. Check browser console for Firebase connection messages
3. Try creating a user in Admin Panel
4. Check Firebase Console → Firestore Database to see if user appears

---

## Step 6: Set Up Security Rules (Important!)

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow read/write for POC
    // Note: In production, implement Firebase Authentication and role-based rules
    match /users/{userId} {
      allow read, write: if true; // POC: Allow all access (will be secured in production)
    }
    
    // Passwords collection - allow read/write for POC
    // Note: In production, use Firebase Authentication instead of storing passwords
    match /passwords/{username} {
      allow read, write: if true; // POC: Allow all access (will be secured in production)
    }
  }
}
```

3. Click **"Publish"**

**Note:** For production, we'll add proper role-based security rules.

---

## Step 7: Verify Setup

After setup, verify:

1. ✅ Firebase project created
2. ✅ Firestore Database enabled
3. ✅ Configuration added to app
4. ✅ Security rules set
5. ✅ App can connect to Firebase

---

## Troubleshooting

### Error: "Firebase: Error (auth/api-key-not-valid)"
- Check that you copied the correct API key
- Make sure `.env` file is loaded (restart dev server)

### Error: "Firebase: Error (firestore/permission-denied)"
- Check security rules in Firestore
- Make sure rules allow read/write for test

### Users not appearing in Firebase
- Check browser console for errors
- Verify Firestore is in test mode
- Check that you're creating users correctly

---

## Next Steps After Setup

Once Firebase is configured:

1. The app will automatically use Firebase for user storage
2. Users created on one device will appear on all devices
3. Real-time sync will work automatically

---

## Testing Multi-Device Sync

1. **Device A:**
   - Create a new trainer user
   - Check Firebase Console to see user created

2. **Device B:**
   - Login as admin
   - Go to User Management
   - See the user created on Device A (should appear automatically!)

3. **Device A again:**
   - Create another user
   - Device B should see it update in real-time (within seconds)

---

**Ready?** Follow these steps, then let me know when Firebase is set up and we'll test the proof of concept!

