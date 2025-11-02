# 🔍 User Sync Troubleshooting Guide

## Check Console Logs

Open browser console (F12 → Console tab) and look for these messages:

### ✅ Firebase Initialization
- **Good**: `Firebase: Initialized successfully`
- **Bad**: `Firebase: Not configured. Using localStorage fallback.`
  - **Fix**: Check your `.env` file has all 6 Firebase variables

### ✅ When Creating a User
You should see:
```
AuthService: Creating new user: [username] ID: [id]
AuthService: Saving user to storage. Total users: [count]
AuthService: Creating new Firebase user: [username]
Firebase: Creating user in Firestore: [id] [username]
Firebase: User created successfully in Firestore: [id] [username]
AuthService: All users saved successfully to Firebase
```

### ✅ Real-Time Subscription
When Admin Panel loads:
```
Admin: Setting up Firebase real-time subscription
Firebase: Users updated in real-time: [count] users: [list]
```

### ✅ When User is Created on Another Device
On Device 2, you should see:
```
Firebase: Users updated in real-time: [count] users: [list]
Admin: Firebase users updated: [count] [list]
Admin: Users list refreshed after Firebase update
```

---

## Common Issues

### Issue 1: "Firebase: Not configured"
**Symptoms**: Users only sync on one device
**Check**:
1. Open `.env` file
2. Verify all 6 variables start with `REACT_APP_`
3. Restart dev server: `npm start`

### Issue 2: Real-time subscription not working
**Symptoms**: Users appear in Firebase Console but not on other devices
**Check**:
1. Browser console → Look for `Admin: Setting up Firebase real-time subscription`
2. If missing, Firebase might not be configured
3. Check for errors: `Firebase: Error in users subscription`

### Issue 3: Users created but not syncing
**Symptoms**: Users visible in Firebase Console but not appearing on other devices
**Check**:
1. Firebase Console → Firestore → `users` collection
2. Is the user document there?
3. If yes, check Firestore security rules
4. Browser console → Any permission errors?

### Issue 4: Firestore Security Rules
**Check**: Firebase Console → Firestore Database → Rules
**Should be**:
```javascript
match /users/{userId} {
  allow read, write: if true; // POC: Allow all access
}
```

---

## Step-by-Step Test

### Test on Device 1:
1. Open app → Log in as `admin` / `admin123`
2. Go to Admin Panel → User Management
3. Check console: `Admin: Setting up Firebase real-time subscription`
4. Create a test user: `synctest` / `password123`
5. Check console for creation messages
6. Go to Firebase Console → Firestore → Check user exists

### Test on Device 2:
1. Open app (same URL on different device)
2. Log in as `admin` / `admin123`
3. Go to Admin Panel → User Management
4. **User should appear automatically** (within 1-2 seconds)
5. Check console for subscription messages

---

## Manual Refresh Test

If real-time doesn't work:
1. On Device 2, refresh the page (F5)
2. User should appear after refresh
3. If yes → Real-time subscription issue
4. If no → Firebase save/retrieve issue

---

## Debugging Commands

In browser console, run:
```javascript
// Check if Firebase is configured
console.log('Firebase configured:', window.firebase?.app?.name);

// Check users in localStorage
console.log('localStorage users:', JSON.parse(localStorage.getItem('users') || '[]'));

// Check passwords in localStorage
console.log('localStorage passwords:', Object.keys(JSON.parse(localStorage.getItem('userPasswords') || '{}')));
```

---

## Still Not Working?

Share these details:
1. Console logs (copy/paste)
2. Firebase Console screenshot (showing users collection)
3. Firestore Rules screenshot
4. What you see vs. what you expect

