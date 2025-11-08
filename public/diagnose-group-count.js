/**
 * Diagnose Group Count Discrepancy
 * Check why different users see different group counts
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app or https://skilab.uok.com
 * 2. Log in as the user seeing wrong count
 * 3. Press F12 (Developer Console)
 * 4. Paste this entire script
 * 5. Press Enter
 */

(async function diagnoseGroupCount() {
  console.log('🔍 Diagnosing Group Count Discrepancy');
  console.log('='.repeat(70));

  try {
    // Get groups from localStorage
    const localGroupsJson = localStorage.getItem('groups');
    const localGroups = localGroupsJson ? JSON.parse(localGroupsJson) : [];

    console.log(`📊 localStorage Groups: ${localGroups.length}`);
    console.log('');

    // Check for duplicates by ID
    const groupIds = localGroups.map(g => g.id);
    const uniqueIds = new Set(groupIds);
    const duplicateCount = groupIds.length - uniqueIds.size;

    if (duplicateCount > 0) {
      console.log(`⚠️  Found ${duplicateCount} duplicate group IDs!`);

      // Find which IDs are duplicated
      const idCounts = {};
      groupIds.forEach(id => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });

      const duplicatedIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
      console.log(`Duplicated IDs: ${duplicatedIds.length}`);
      duplicatedIds.slice(0, 10).forEach(id => {
        console.log(`  - ${id} (appears ${idCounts[id]} times)`);
      });
      console.log('');
    } else {
      console.log('✅ No duplicate IDs found');
      console.log('');
    }

    // Check for duplicates by name+year combination
    const nameYearCombos = localGroups.map(g => `${g.name}|${g.year}`);
    const uniqueNameYear = new Set(nameYearCombos);
    const nameYearDuplicates = nameYearCombos.length - uniqueNameYear.size;

    if (nameYearDuplicates > 0) {
      console.log(`⚠️  Found ${nameYearDuplicates} duplicate name+year combinations!`);

      const nameYearCounts = {};
      nameYearCombos.forEach(combo => {
        nameYearCounts[combo] = (nameYearCounts[combo] || 0) + 1;
      });

      const duplicatedCombos = Object.keys(nameYearCounts).filter(combo => nameYearCounts[combo] > 1);
      console.log(`Duplicated combinations: ${duplicatedCombos.length}`);
      duplicatedCombos.slice(0, 10).forEach(combo => {
        const [name, year] = combo.split('|');
        console.log(`  - "${name}" Year ${year} (appears ${nameYearCounts[combo]} times)`);
      });
      console.log('');
    } else {
      console.log('✅ No duplicate name+year combinations');
      console.log('');
    }

    // Get Firebase groups
    console.log('☁️  Checking Firebase...');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c",
      authDomain: "skill-lab-web.firebaseapp.com",
      projectId: "skill-lab-web",
      storageBucket: "skill-lab-web.firebasestorage.app",
      messagingSenderId: "437137958471",
      appId: "1:437137958471:web:89e99a4fddbc490d98f362"
    };

    const app = initializeApp(firebaseConfig, 'diag-' + Date.now());
    const db = getFirestore(app);

    const groupsSnapshot = await getDocs(collection(db, 'groups'));
    const firebaseGroups = [];
    groupsSnapshot.forEach(doc => {
      firebaseGroups.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 Firebase Groups: ${firebaseGroups.length}`);
    console.log('');

    // Compare counts
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`localStorage: ${localGroups.length} groups`);
    console.log(`Firebase: ${firebaseGroups.length} groups`);
    console.log(`Difference: ${Math.abs(localGroups.length - firebaseGroups.length)} groups`);
    console.log('');

    if (localGroups.length !== firebaseGroups.length) {
      console.log('⚠️  localStorage and Firebase have different counts!');

      // Find groups in localStorage but not in Firebase
      const firebaseIds = new Set(firebaseGroups.map(g => g.id));
      const localOnlyGroups = localGroups.filter(g => !firebaseIds.has(g.id));

      if (localOnlyGroups.length > 0) {
        console.log(`\n📍 ${localOnlyGroups.length} groups in localStorage but NOT in Firebase:`);
        localOnlyGroups.slice(0, 10).forEach(g => {
          console.log(`  - ${g.name} (Year ${g.year}) - ID: ${g.id}`);
        });
        if (localOnlyGroups.length > 10) {
          console.log(`  ... and ${localOnlyGroups.length - 10} more`);
        }
      }

      // Find groups in Firebase but not in localStorage
      const localIds = new Set(localGroups.map(g => g.id));
      const firebaseOnlyGroups = firebaseGroups.filter(g => !localIds.has(g.id));

      if (firebaseOnlyGroups.length > 0) {
        console.log(`\n☁️  ${firebaseOnlyGroups.length} groups in Firebase but NOT in localStorage:`);
        firebaseOnlyGroups.slice(0, 10).forEach(g => {
          console.log(`  - ${g.name} (Year ${g.year}) - ID: ${g.id}`);
        });
        if (firebaseOnlyGroups.length > 10) {
          console.log(`  ... and ${firebaseOnlyGroups.length - 10} more`);
        }
      }
    } else {
      console.log('✅ localStorage and Firebase have same count');
    }

    // Group by year analysis
    console.log('\n' + '='.repeat(70));
    console.log('GROUPS BY YEAR (localStorage)');
    console.log('='.repeat(70));

    const groupsByYear = {};
    localGroups.forEach(g => {
      groupsByYear[g.year] = (groupsByYear[g.year] || 0) + 1;
    });

    Object.keys(groupsByYear).sort((a, b) => parseInt(a) - parseInt(b)).forEach(year => {
      console.log(`Year ${year}: ${groupsByYear[year]} groups`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (duplicateCount > 0) {
      console.log('⚠️  ISSUE: Duplicate group IDs found');
      console.log('CAUSE: Same group stored multiple times (sync issue)');
      console.log('SOLUTION: Run the deduplication script');
    } else if (nameYearDuplicates > 0) {
      console.log('⚠️  ISSUE: Duplicate group names for same year');
      console.log('CAUSE: Same group created multiple times with different IDs');
      console.log('SOLUTION: Delete duplicates manually in Admin Panel');
    } else if (localGroups.length !== firebaseGroups.length) {
      console.log('⚠️  ISSUE: localStorage and Firebase out of sync');
      console.log('CAUSE: Groups created/deleted but not synced properly');
      console.log('SOLUTION: Hard refresh page (Ctrl+Shift+R) to re-sync');
    } else {
      console.log('✅ No issues detected with group data');
      console.log('ℹ️  Different users seeing different counts may be due to:');
      console.log('   - Browser cache (hard refresh needed)');
      console.log('   - Looking at different pages (Dashboard vs Admin)');
      console.log('   - One user seeing filtered view (trainers see only assigned groups)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('💡 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('1. Hard refresh this page (Ctrl+Shift+R)');
    console.log('2. Check the count again');
    console.log('3. If still wrong, run this script again');
    console.log('4. If duplicates found, use deduplication script');

  } catch (error) {
    console.error('💥 Error:', error);
    console.error('Details:', error.message);
  }
})();
