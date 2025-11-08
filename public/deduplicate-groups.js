/**
 * Deduplicate Groups Script
 * Removes duplicate group names, keeping only the most recent version
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app or https://skilab.uok.com
 * 2. Log in as ADMIN (betool)
 * 3. Press F12 (Developer Console)
 * 4. Paste this entire script
 * 5. Press Enter
 * 6. Confirm when prompted
 */

(async function deduplicateGroups() {
  console.log('🔧 Deduplicating Groups');
  console.log('='.repeat(70));

  try {
    // Get groups from localStorage
    const localGroupsJson = localStorage.getItem('groups');
    const localGroups = localGroupsJson ? JSON.parse(localGroupsJson) : [];

    console.log(`📊 Total groups: ${localGroups.length}`);

    // Find duplicates by name+year combination
    const nameYearMap = new Map();
    const duplicatesToRemove = [];
    const groupsToKeep = [];

    localGroups.forEach(group => {
      const key = `${group.name}|${group.year}`;
      const existing = nameYearMap.get(key);

      if (existing) {
        // Duplicate found - keep the one with most recent updatedAt
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        const currentDate = new Date(group.updatedAt || group.createdAt || 0);

        if (currentDate > existingDate) {
          // Current group is newer - remove the old one, keep this one
          duplicatesToRemove.push(existing);
          nameYearMap.set(key, group);
        } else {
          // Existing group is newer - remove this one
          duplicatesToRemove.push(group);
        }
      } else {
        // First occurrence - keep it
        nameYearMap.set(key, group);
      }
    });

    // Get all groups to keep
    nameYearMap.forEach(group => groupsToKeep.push(group));

    console.log(`\n📋 Analysis:`);
    console.log(`  Original count: ${localGroups.length}`);
    console.log(`  Unique groups: ${groupsToKeep.length}`);
    console.log(`  Duplicates to remove: ${duplicatesToRemove.length}`);

    if (duplicatesToRemove.length === 0) {
      console.log('\n✅ No duplicates found - nothing to remove!');
      return;
    }

    // Show which duplicates will be removed
    console.log(`\n⚠️  Groups that will be REMOVED (${duplicatesToRemove.length}):`);
    const duplicatesByYear = {};
    duplicatesToRemove.forEach(g => {
      duplicatesByYear[g.year] = (duplicatesByYear[g.year] || 0) + 1;
    });

    Object.keys(duplicatesByYear).sort().forEach(year => {
      console.log(`  Year ${year}: ${duplicatesByYear[year]} duplicates`);
    });

    // Show sample of duplicates
    console.log(`\n📝 Sample duplicates being removed (first 10):`);
    duplicatesToRemove.slice(0, 10).forEach((g, i) => {
      console.log(`  ${i + 1}. "${g.name}" (Year ${g.year}) - ID: ${g.id.substring(0, 20)}...`);
    });

    if (duplicatesToRemove.length > 10) {
      console.log(`  ... and ${duplicatesToRemove.length - 10} more`);
    }

    // Ask for confirmation
    const confirmed = confirm(
      `⚠️  CONFIRMATION REQUIRED\n\n` +
      `This will remove ${duplicatesToRemove.length} duplicate groups.\n` +
      `${groupsToKeep.length} unique groups will be kept.\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) {
      console.log('\n❌ Deduplication cancelled by user');
      return;
    }

    console.log('\n🔄 Removing duplicates...');

    // Save deduplicated groups to localStorage
    localStorage.setItem('groups', JSON.stringify(groupsToKeep));
    console.log('✅ localStorage updated');

    // Update Firebase
    console.log('☁️  Updating Firebase...');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c",
      authDomain: "skill-lab-web.firebaseapp.com",
      projectId: "skill-lab-web",
      storageBucket: "skill-lab-web.firebasestorage.app",
      messagingSenderId: "437137958471",
      appId: "1:437137958471:web:89e99a4fddbc490d98f362"
    };

    const app = initializeApp(firebaseConfig, 'dedup-' + Date.now());
    const db = getFirestore(app);

    // Delete duplicate groups from Firebase
    let deletedCount = 0;
    for (const group of duplicatesToRemove) {
      try {
        await deleteDoc(doc(db, 'groups', group.id));
        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`  Deleted ${deletedCount}/${duplicatesToRemove.length}...`);
        }
      } catch (error) {
        console.error(`  Failed to delete ${group.id}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedCount} duplicate groups from Firebase`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ DEDUPLICATION COMPLETE!');
    console.log('='.repeat(70));
    console.log(`Before: ${localGroups.length} groups`);
    console.log(`After: ${groupsToKeep.length} groups`);
    console.log(`Removed: ${duplicatesToRemove.length} duplicates`);

    // Show final breakdown
    console.log(`\n📊 Groups by year (after deduplication):`);
    const finalByYear = {};
    groupsToKeep.forEach(g => {
      finalByYear[g.year] = (finalByYear[g.year] || 0) + 1;
    });

    Object.keys(finalByYear).sort().forEach(year => {
      console.log(`  Year ${year}: ${finalByYear[year]} groups`);
    });

    console.log('\n💡 Next Steps:');
    console.log('1. Hard refresh this page (Ctrl+Shift+R)');
    console.log('2. Check group count - should now be ' + groupsToKeep.length);
    console.log('3. Verify all groups are still accessible');
    console.log('4. If any issues, contact support immediately');

  } catch (error) {
    console.error('💥 Error:', error);
    console.error('Details:', error.message);
    console.error('\n⚠️  If error occurred, your data is safe.');
    console.error('Hard refresh and try again, or contact support.');
  }
})();
