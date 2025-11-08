/**
 * Fix Trainer Group Assignment
 * Ensure trainer has groups assigned so filtering works
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app or https://skilab.uok.com
 * 2. Log in as ADMIN (betool)
 * 3. Press F12 (Developer Console)
 * 4. Paste this entire script
 * 5. Press Enter
 */

(async function fixTrainerAssignment() {
  console.log('🔧 Fixing Trainer Group Assignment');
  console.log('='.repeat(70));

  try {
    // Check current user is admin
    const currentUserJson = localStorage.getItem('currentUser');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

    if (!currentUser || currentUser.role !== 'admin') {
      console.error('❌ You must be logged in as ADMIN to run this script!');
      return;
    }

    console.log('✅ Running as admin:', currentUser.username);

    // Get all users
    const usersJson = localStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    // Find trainer
    const trainerUsername = 'saja_adil';
    const trainer = users.find(u => u.username === trainerUsername);

    if (!trainer) {
      console.error(`❌ Trainer "${trainerUsername}" not found in users list!`);
      console.log('Available users:', users.map(u => u.username));
      return;
    }

    console.log('\n👤 CURRENT TRAINER STATUS');
    console.log('='.repeat(70));
    console.log('Username:', trainer.username);
    console.log('Email:', trainer.email);
    console.log('Role:', trainer.role);
    console.log('Assigned Groups:', trainer.assignedGroups);
    console.log('Assigned Years:', trainer.assignedYears);

    // Get all groups
    const groupsJson = localStorage.getItem('groups');
    const allGroups = groupsJson ? JSON.parse(groupsJson) : [];

    console.log('\n📊 AVAILABLE GROUPS');
    console.log('='.repeat(70));
    console.log(`Total groups in system: ${allGroups.length}`);

    // Show groups by year
    const groupsByYear = {};
    allGroups.forEach(g => {
      groupsByYear[g.year] = (groupsByYear[g.year] || 0) + 1;
    });

    console.log('Groups by year:');
    Object.keys(groupsByYear).sort().forEach(year => {
      console.log(`  Year ${year}: ${groupsByYear[year]} groups`);
    });

    // Check if trainer has valid assignments
    const hasAssignedGroups = trainer.assignedGroups && trainer.assignedGroups.length > 0;
    const hasAssignedYears = trainer.assignedYears && trainer.assignedYears.length > 0;

    if (!hasAssignedGroups || !hasAssignedYears) {
      console.log('\n⚠️  PROBLEM DETECTED!');
      console.log('Trainer has no groups or years assigned.');
      console.log('This is why they see all groups in the filter.');
      console.log('\nYou need to assign groups in the Admin Panel:');
      console.log('1. Go to Admin Panel → Users tab');
      console.log('2. Find "saja_adil" and click Edit');
      console.log('3. Select groups and years');
      console.log('4. Click Update');
      return;
    }

    // Verify assigned groups exist
    console.log('\n🔍 VERIFYING ASSIGNED GROUPS');
    console.log('='.repeat(70));

    const validGroups = [];
    const invalidGroups = [];

    trainer.assignedGroups.forEach(groupId => {
      const group = allGroups.find(g => g.id === groupId);
      if (group) {
        validGroups.push(group);
      } else {
        invalidGroups.push(groupId);
      }
    });

    console.log(`Valid groups: ${validGroups.length}`);
    validGroups.forEach((g, i) => {
      console.log(`  ${i + 1}. "${g.name}" (Year ${g.year})`);
    });

    if (invalidGroups.length > 0) {
      console.warn(`\n⚠️  Invalid groups: ${invalidGroups.length}`);
      console.warn('These group IDs are assigned but don\'t exist:');
      invalidGroups.forEach(id => console.warn(`  - ${id}`));
      console.log('\nYou should remove these invalid IDs from the trainer\'s assignment.');
    }

    // Import Firebase
    console.log('\n☁️  Checking Firebase sync...');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c",
      authDomain: "skill-lab-web.firebaseapp.com",
      projectId: "skill-lab-web",
      storageBucket: "skill-lab-web.firebasestorage.app",
      messagingSenderId: "437137958471",
      appId: "1:437137958471:web:89e99a4fddbc490d98f362"
    };

    const app = initializeApp(firebaseConfig, 'fix-trainer-' + Date.now());
    const db = getFirestore(app);

    // Get trainer from Firebase
    const trainerDoc = await getDoc(doc(db, 'users', trainer.id));

    if (!trainerDoc.exists()) {
      console.warn('⚠️  Trainer NOT found in Firebase!');
      console.log('Only exists in localStorage.');
    } else {
      const firebaseTrainer = trainerDoc.data();
      console.log('✅ Trainer found in Firebase');
      console.log('Firebase assigned groups:', firebaseTrainer.assignedGroups);
      console.log('Firebase assigned years:', firebaseTrainer.assignedYears);

      // Compare
      const localGroups = JSON.stringify(trainer.assignedGroups);
      const firebaseGroups = JSON.stringify(firebaseTrainer.assignedGroups);

      if (localGroups !== firebaseGroups) {
        console.warn('\n⚠️  MISMATCH DETECTED!');
        console.warn('localStorage and Firebase have different assignments.');
        console.log('This could cause sync issues.');
      } else {
        console.log('✅ localStorage and Firebase match');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));

    if (validGroups.length > 0 && invalidGroups.length === 0) {
      console.log('✅ Trainer configuration looks correct!');
      console.log(`Trainer should see ${validGroups.length} groups in filter.`);
      console.log('\nIf trainer still sees all groups:');
      console.log('1. Ask trainer to LOG OUT completely');
      console.log('2. Hard refresh (Ctrl+Shift+R)');
      console.log('3. LOG IN again as trainer');
      console.log('4. Check Students page → Group filter dropdown');
      console.log('5. Should see ONLY these ' + validGroups.length + ' groups');
    } else if (invalidGroups.length > 0) {
      console.warn('⚠️  Trainer has invalid group assignments!');
      console.log('Fix by editing trainer in Admin Panel.');
    } else {
      console.error('❌ Trainer has no valid group assignments!');
      console.log('Assign groups in Admin Panel.');
    }

  } catch (error) {
    console.error('💥 Error:', error);
    console.error('Details:', error.message);
  }
})();
