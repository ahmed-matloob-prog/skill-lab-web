/**
 * Debug Trainer User Configuration
 * Check if trainer user is properly configured with assigned groups
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app or https://skilab.uok.com
 * 2. Log in as TRAINER (saja_adil)
 * 3. Press F12 (Developer Console)
 * 4. Paste this entire script
 * 5. Press Enter
 */

(function debugTrainerUser() {
  console.log('🔍 Debugging Trainer User Configuration');
  console.log('='.repeat(70));

  try {
    // Get current user
    const currentUserJson = localStorage.getItem('currentUser');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

    if (!currentUser) {
      console.error('❌ No user logged in!');
      console.log('Please log in as trainer and try again.');
      return;
    }

    console.log('\n👤 CURRENT USER');
    console.log('='.repeat(70));
    console.log('Username:', currentUser.username);
    console.log('Email:', currentUser.email);
    console.log('Role:', currentUser.role);
    console.log('Active:', currentUser.isActive ? '✅ Yes' : '❌ No');

    // Check assigned groups
    console.log('\n📚 ASSIGNED GROUPS');
    console.log('='.repeat(70));

    if (!currentUser.assignedGroups) {
      console.error('❌ assignedGroups is UNDEFINED!');
      console.log('This is why the filter shows all groups.');
    } else if (currentUser.assignedGroups.length === 0) {
      console.warn('⚠️  assignedGroups is EMPTY!');
      console.log('Trainer has no groups assigned.');
    } else {
      console.log(`✅ Found ${currentUser.assignedGroups.length} assigned groups`);
      console.log('Group IDs:', currentUser.assignedGroups);
    }

    // Check assigned years
    console.log('\n📅 ASSIGNED YEARS');
    console.log('='.repeat(70));

    if (!currentUser.assignedYears) {
      console.error('❌ assignedYears is UNDEFINED!');
    } else if (currentUser.assignedYears.length === 0) {
      console.warn('⚠️  assignedYears is EMPTY!');
    } else {
      console.log(`✅ Found ${currentUser.assignedYears.length} assigned years`);
      console.log('Years:', currentUser.assignedYears);
    }

    // Get all groups and check which ones match
    const groupsJson = localStorage.getItem('groups');
    const allGroups = groupsJson ? JSON.parse(groupsJson) : [];

    console.log('\n📊 GROUP ANALYSIS');
    console.log('='.repeat(70));
    console.log(`Total groups in system: ${allGroups.length}`);

    if (currentUser.assignedGroups && currentUser.assignedGroups.length > 0) {
      const assignedGroupDetails = allGroups.filter(g =>
        currentUser.assignedGroups.includes(g.id)
      );

      console.log(`Groups trainer should see: ${assignedGroupDetails.length}`);
      console.log('\nAssigned Group Details:');
      assignedGroupDetails.forEach((g, i) => {
        console.log(`  ${i + 1}. "${g.name}" (Year ${g.year}) - ID: ${g.id}`);
      });

      if (assignedGroupDetails.length === 0) {
        console.error('\n❌ PROBLEM FOUND!');
        console.error('Assigned group IDs don\'t match any existing groups.');
        console.error('Assigned IDs:', currentUser.assignedGroups);
      }
    }

    // Check role-based filtering logic
    console.log('\n🔧 FILTERING LOGIC TEST');
    console.log('='.repeat(70));

    const isAdmin = currentUser.role === 'admin';
    console.log('Is Admin?', isAdmin ? 'Yes' : 'No');

    const accessibleGroups = isAdmin ? allGroups :
      allGroups.filter(group => currentUser.assignedGroups?.includes(group.id));

    console.log(`Accessible groups (what filter should show): ${accessibleGroups.length}`);

    if (accessibleGroups.length === allGroups.length && !isAdmin) {
      console.error('\n❌ PROBLEM CONFIRMED!');
      console.error('Trainer is seeing ALL groups instead of only assigned ones.');
      console.error('This happens when assignedGroups is undefined or empty.');
    } else if (accessibleGroups.length > 0 && !isAdmin) {
      console.log('\n✅ Filtering logic working correctly!');
      console.log(`Trainer should see ${accessibleGroups.length} groups.`);
    }

    // Check if user data is in users collection
    console.log('\n💾 USER DATA IN LOCALSTORAGE');
    console.log('='.repeat(70));

    const usersJson = localStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    const userInList = users.find(u => u.username === currentUser.username);

    if (!userInList) {
      console.error('❌ Current user NOT found in users list!');
    } else {
      console.log('✅ User found in users list');
      console.log('User in list:', userInList);

      // Compare assignedGroups
      if (JSON.stringify(userInList.assignedGroups) !== JSON.stringify(currentUser.assignedGroups)) {
        console.warn('\n⚠️  MISMATCH FOUND!');
        console.warn('assignedGroups in users list differs from currentUser');
        console.warn('Users list:', userInList.assignedGroups);
        console.warn('Current user:', currentUser.assignedGroups);
      }
    }

    // Diagnosis
    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (!currentUser.assignedGroups || currentUser.assignedGroups.length === 0) {
      console.error('❌ ROOT CAUSE: Trainer has no groups assigned!');
      console.log('\nSOLUTION:');
      console.log('1. Log in as admin (betool)');
      console.log('2. Go to Admin Panel → Users tab');
      console.log('3. Find trainer "saja_adil"');
      console.log('4. Click "Edit"');
      console.log('5. Assign groups in "Assigned Groups" field');
      console.log('6. Assign years in "Assigned Years" field');
      console.log('7. Click "Update"');
      console.log('8. Hard refresh (Ctrl+Shift+R)');
      console.log('9. Log in as trainer again');
    } else if (accessibleGroups.length === 0) {
      console.error('❌ ROOT CAUSE: Assigned group IDs are invalid!');
      console.log('\nSOLUTION:');
      console.log('Re-assign groups to trainer using valid group IDs.');
    } else {
      console.log('✅ Trainer configuration looks correct!');
      console.log('\nIf you\'re still seeing all groups in the filter:');
      console.log('1. Hard refresh the page (Ctrl+Shift+R)');
      console.log('2. Clear browser cache completely');
      console.log('3. Log out and log in again');
      console.log('4. Check if latest code is deployed (may take 2-3 minutes)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('FULL USER OBJECT (for debugging)');
    console.log('='.repeat(70));
    console.log(JSON.stringify(currentUser, null, 2));

  } catch (error) {
    console.error('💥 Error:', error);
    console.error('Details:', error.message);
  }
})();
