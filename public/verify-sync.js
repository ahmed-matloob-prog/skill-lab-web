/**
 * Verify Multi-Device Sync Script
 * Run this to verify users and passwords are properly synced from Firebase
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app (login page)
 * 2. Press F12 (Developer Console)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(async function verifySyncStatus() {
  console.log('🔍 Verifying Multi-Device Sync Status');
  console.log('='.repeat(70));

  try {
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c",
      authDomain: "skill-lab-web.firebaseapp.com",
      projectId: "skill-lab-web",
      storageBucket: "skill-lab-web.firebasestorage.app",
      messagingSenderId: "437137958471",
      appId: "1:437137958471:web:89e99a4fddbc490d98f362"
    };

    console.log('📦 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized\n');

    // Fetch Firebase users
    console.log('☁️  Fetching users from Firebase...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const firebaseUsers = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      firebaseUsers.push({
        username: data.usernameOriginal || data.username,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      });
    });
    console.log(`✅ Found ${firebaseUsers.length} users in Firebase\n`);

    // Fetch Firebase passwords
    console.log('🔑 Fetching passwords from Firebase...');
    const passwordsSnapshot = await getDocs(collection(db, 'passwords'));
    const firebasePasswords = {};
    passwordsSnapshot.forEach(doc => {
      const data = doc.data();
      firebasePasswords[data.username || doc.id] = data.password;
    });
    console.log(`✅ Found ${Object.keys(firebasePasswords).length} passwords in Firebase\n`);

    // Get localStorage data
    const localUsersJson = localStorage.getItem('users');
    const localPasswordsJson = localStorage.getItem('userPasswords');

    const localUsers = localUsersJson ? JSON.parse(localUsersJson) : [];
    const localPasswords = localPasswordsJson ? JSON.parse(localPasswordsJson) : {};

    console.log('💾 localStorage Status:');
    console.log(`   Users: ${localUsers.length}`);
    console.log(`   Passwords: ${Object.keys(localPasswords).length}\n`);

    // Compare Firebase vs localStorage
    console.log('='.repeat(70));
    console.log('SYNC COMPARISON');
    console.log('='.repeat(70));

    // Check for users in Firebase but not in localStorage
    const firebaseUsernames = firebaseUsers.map(u => u.username.toLowerCase());
    const localUsernames = localUsers.map(u => u.username.toLowerCase());

    const missingFromLocal = firebaseUsers.filter(fu =>
      !localUsernames.includes(fu.username.toLowerCase())
    );

    const missingFromFirebase = localUsers.filter(lu =>
      !firebaseUsernames.includes(lu.username.toLowerCase())
    );

    if (missingFromLocal.length > 0) {
      console.log('⚠️  Users in Firebase but NOT in localStorage:');
      missingFromLocal.forEach(u => {
        console.log(`   - ${u.username} (${u.role}) - Active: ${u.isActive}`);
      });
      console.log('');
    }

    if (missingFromFirebase.length > 0) {
      console.log('ℹ️  Users in localStorage but NOT in Firebase (production users):');
      missingFromFirebase.forEach(u => {
        console.log(`   - ${u.username} (${u.role})`);
      });
      console.log('');
    }

    // Check password sync
    const firebasePasswordKeys = Object.keys(firebasePasswords);
    const localPasswordKeys = Object.keys(localPasswords);

    const missingPasswordsFromLocal = firebasePasswordKeys.filter(key =>
      !localPasswordKeys.includes(key)
    );

    if (missingPasswordsFromLocal.length > 0) {
      console.log('⚠️  Passwords in Firebase but NOT in localStorage:');
      missingPasswordsFromLocal.forEach(key => {
        console.log(`   - ${key}`);
      });
      console.log('');
    }

    // Overall sync status
    console.log('='.repeat(70));
    console.log('OVERALL SYNC STATUS');
    console.log('='.repeat(70));

    if (missingFromLocal.length === 0 && missingPasswordsFromLocal.length === 0) {
      console.log('✅ SYNC COMPLETE - All Firebase data is in localStorage');
      console.log('✅ Login should work for all users');
    } else {
      console.log('⚠️  SYNC INCOMPLETE - Some data not synced yet');
      console.log('');
      console.log('🔧 TROUBLESHOOTING STEPS:');
      console.log('1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('2. Wait 3-5 seconds for Firebase sync to complete');
      console.log('3. Run this script again to verify sync');
      console.log('4. Check browser console for errors during page load');
      console.log('');
      console.log('Expected console messages on page load:');
      console.log('  - "AuthContext: Initializing authentication..."');
      console.log('  - "AuthContext: Syncing users from Firebase..."');
      console.log('  - "AuthContext: Found X users in Firebase..."');
      console.log('  - "AuthContext: Merged X total users to localStorage"');
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('ALL USERS (Firebase + localStorage)');
    console.log('='.repeat(70));

    // Merge and display all users
    const allUsersMap = new Map();
    localUsers.forEach(u => allUsersMap.set(u.username.toLowerCase(), { ...u, source: 'localStorage' }));
    firebaseUsers.forEach(u => {
      const existing = allUsersMap.get(u.username.toLowerCase());
      if (existing) {
        allUsersMap.set(u.username.toLowerCase(), { ...u, source: 'Both Firebase + localStorage' });
      } else {
        allUsersMap.set(u.username.toLowerCase(), { ...u, source: 'Firebase only (NOT SYNCED YET!)' });
      }
    });

    const allUsers = Array.from(allUsersMap.values());
    allUsers.forEach((u, index) => {
      const hasPassword = localPasswords[u.username.toLowerCase()] || firebasePasswords[u.username.toLowerCase()];
      const passwordType = hasPassword ? (hasPassword.startsWith('$2') ? 'bcrypt ✅' : 'plaintext ⚠️') : 'NO PASSWORD ❌';

      console.log(`\n${index + 1}. ${u.username}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Active: ${u.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Password: ${passwordType}`);
      console.log(`   Location: ${u.source}`);
    });

    console.log('');
    console.log('='.repeat(70));
    console.log('💡 NEXT STEPS');
    console.log('='.repeat(70));

    if (missingFromLocal.length > 0) {
      console.log('1. Hard refresh this page (Ctrl+Shift+R)');
      console.log('2. Wait for sync to complete (watch console messages)');
      console.log('3. Run this script again to verify');
    } else {
      console.log('1. All users are synced ✅');
      console.log('2. Use the EXACT username from the list above to log in');
      console.log('3. Username is case-sensitive (copy-paste recommended)');
      console.log('4. If login still fails, check password was set correctly');
    }

    console.log('');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('');
    console.log('⚠️  Make sure you are on the correct domain (skill-lab-web.vercel.app)');
  }
})();
