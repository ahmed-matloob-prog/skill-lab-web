# Firebase Deployment Guide

**Date:** 2025-11-04
**Project:** Student Attendance Web Application
**Purpose:** Deploy Firebase security rules and configure Firebase hosting

---

## Prerequisites

Before deploying to Firebase, ensure you have:

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing project
   - Enable Firestore Database
   - Enable Firebase Storage
   - Enable Firebase Authentication (for future use)

3. **Firebase configuration in `.env`**
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

---

## Step 1: Initialize Firebase

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project**
   ```bash
   cd "C:\Users\ahmed\Documents\python app\skill lab web"
   firebase init
   ```

3. **Select the following features:**
   - [x] Firestore: Configure security rules and indexes files
   - [x] Storage: Configure security rules file
   - [x] Hosting: Configure hosting

4. **Configuration options:**
   - **Firestore rules file:** `firestore.rules` (already created)
   - **Firestore indexes file:** `firestore.indexes.json` (default)
   - **Storage rules file:** `storage.rules` (already created)
   - **Public directory:** `build`
   - **Configure as single-page app:** Yes
   - **Set up automatic builds:** No
   - **Overwrite index.html:** No

---

## Step 2: Deploy Security Rules Only

If you only want to deploy security rules (without hosting):

```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Storage rules only
firebase deploy --only storage:rules

# Deploy both rules
firebase deploy --only firestore:rules,storage:rules
```

---

## Step 3: Deploy Full Application

1. **Build production version**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

   Or deploy specific services:
   ```bash
   # Deploy hosting only
   firebase deploy --only hosting

   # Deploy everything
   firebase deploy --only firestore:rules,storage:rules,hosting
   ```

---

## Step 4: Verify Deployment

1. **Check Firestore rules in Firebase Console:**
   - Go to Firestore Database > Rules
   - Verify rules are deployed
   - Run test queries to verify access control

2. **Check Storage rules in Firebase Console:**
   - Go to Storage > Rules
   - Verify rules are deployed

3. **Test your deployed app:**
   - Visit your Firebase hosting URL: `https://YOUR_PROJECT_ID.web.app`
   - Test login functionality
   - Test data access based on roles

---

## Security Rules Overview

### Firestore Rules (`firestore.rules`)

**Access Control:**
- ✅ **Admins** - Full access to all collections
- ✅ **Trainers** - Can manage students, attendance, assessments
- ✅ **Users** - Can read their own profile only
- ❌ **Passwords** - Nobody can read directly (admin can write)

**Collections:**
1. **users** - User profiles and roles
2. **passwords** - Hashed passwords (POC only)
3. **students** - Student information
4. **groups** - Student groups
5. **attendance** - Attendance records
6. **assessments** - Assessment records

**Key Features:**
- 24-hour edit window for attendance/assessments
- Role-based access control
- Owner-based permissions for user profiles
- Deny-all default policy

### Storage Rules (`storage.rules`)

**Access Control:**
- ✅ **Admins** - Full access to all storage
- ✅ **Trainers** - Can upload student images and reports
- ✅ **Users** - Can manage their own profile images

**Folders:**
1. **profile-images/{userId}/** - User profile pictures
2. **student-images/{studentId}/** - Student photos
3. **reports/{userId}/** - User-specific reports
4. **admin-exports/** - Admin-only exports
5. **backups/** - Admin-only backups

**Security Features:**
- File size limit: 5MB
- File type validation (images, documents)
- User-owned resource protection
- Deny-all default policy

---

## Testing Security Rules

### Using Firebase Emulator (Local Testing)

1. **Install emulators**
   ```bash
   firebase init emulators
   ```

2. **Start emulators**
   ```bash
   firebase emulators:start
   ```

3. **Access Emulator UI:**
   - Open: `http://localhost:4000`
   - Test Firestore rules
   - Test Storage rules

### Using Firebase Console (Production Testing)

1. **Go to Firestore > Rules**
2. Click "Rules playground"
3. Test different scenarios:
   ```
   // Test admin read
   get /databases/(default)/documents/students/student-123
   Auth: { uid: 'admin-uid' }

   // Test trainer write
   create /databases/(default)/documents/attendance/record-456
   Auth: { uid: 'trainer-uid' }
   ```

---

## Rollback Instructions

If you need to rollback security rules:

1. **View deployment history**
   ```bash
   firebase deploy:history
   ```

2. **Rollback to previous version**
   ```bash
   firebase rollback firestore:rules
   firebase rollback storage:rules
   ```

3. **Or manually restore from backup:**
   - Copy your previous rules from git history
   - Redeploy using `firebase deploy --only firestore:rules`

---

## Monitoring and Maintenance

### Monitor Rule Usage

1. **Firebase Console > Firestore > Usage**
   - Monitor read/write operations
   - Check for denied requests

2. **Firebase Console > Storage > Usage**
   - Monitor storage usage
   - Check for denied uploads

### Update Rules Safely

1. **Always test in emulator first**
   ```bash
   firebase emulators:start
   ```

2. **Deploy to staging first (if available)**
   ```bash
   firebase use staging
   firebase deploy --only firestore:rules
   ```

3. **Deploy to production**
   ```bash
   firebase use production
   firebase deploy --only firestore:rules
   ```

---

## Important Notes

### Current Limitations (POC Phase)

⚠️ **Password Storage:** Currently using Firestore to store passwords as a POC. In production, you MUST:
- Migrate to Firebase Authentication
- Remove `passwords` collection
- Update security rules to use `request.auth.token` instead

### Future Improvements

When migrating to Firebase Auth:

1. **Replace password collection with Firebase Auth:**
   ```javascript
   // Instead of:
   localStorage.getItem('userPasswords')

   // Use:
   firebase.auth().signInWithEmailAndPassword(email, password)
   ```

2. **Update Firestore rules:**
   ```javascript
   // Instead of:
   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role

   // Use:
   request.auth.token.role  // Custom claim
   ```

3. **Remove password rules from firestore.rules**

---

## Cost Considerations

### Firestore Pricing (Free Tier)

- **Stored data:** 1 GB
- **Document reads:** 50,000/day
- **Document writes:** 20,000/day
- **Document deletes:** 20,000/day

### Storage Pricing (Free Tier)

- **Storage:** 5 GB
- **Downloads:** 1 GB/day
- **Uploads:** 20,000/day

### Estimated Usage (100 students)

**Daily Operations:**
- Attendance records: ~200 writes/day
- Assessment records: ~100 writes/day
- Student reads: ~500 reads/day
- **Total:** ~800 operations/day (well within free tier)

**Storage:**
- Student photos: ~100 x 200KB = 20MB
- Reports: ~10 x 1MB = 10MB
- **Total:** ~30MB (well within free tier)

---

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check user authentication status
   - Verify user role in Firestore
   - Check rules in Firebase Console

2. **Rules not updating**
   - Wait 1-2 minutes for propagation
   - Clear browser cache
   - Verify deployment succeeded

3. **Storage upload fails**
   - Check file size (max 5MB)
   - Verify file type matches rules
   - Check user permissions

---

## Support and Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Security Rules Guide:** https://firebase.google.com/docs/rules
- **Firebase CLI Reference:** https://firebase.google.com/docs/cli
- **Firebase Status:** https://status.firebase.google.com/

---

## Checklist Before Going Live

- [ ] Firebase project created and configured
- [ ] Environment variables set in `.env`
- [ ] Security rules tested in emulator
- [ ] Production build tested locally
- [ ] Security rules deployed
- [ ] Application deployed to hosting
- [ ] All features tested on live site
- [ ] User roles verified in Firestore
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place
- [ ] Migration plan to Firebase Auth documented

---

**Last Updated:** 2025-11-04
**Next Review:** When migrating to Firebase Authentication
