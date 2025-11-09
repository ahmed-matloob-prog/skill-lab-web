/**
 * Migration Script: Add Export to Admin fields to existing assessments
 *
 * Run this ONCE in browser console after deploying new code:
 * 1. Log in as admin
 * 2. Press F12 (Developer Console)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(async function migrateAssessments() {
  console.log('🔄 Starting assessment migration for Export to Admin feature...');
  console.log('='.repeat(70));

  try {
    // Get existing assessments
    const assessmentsJson = localStorage.getItem('assessments');

    if (!assessmentsJson) {
      console.log('✅ No assessments to migrate');
      return;
    }

    const assessments = JSON.parse(assessmentsJson);
    console.log(`📊 Found ${assessments.length} assessments`);

    let migratedCount = 0;
    let alreadyMigratedCount = 0;

    // Add default export fields to all existing assessments
    const migrated = assessments.map(assessment => {
      // Check if already migrated
      if (assessment.hasOwnProperty('exportedToAdmin')) {
        alreadyMigratedCount++;
        return assessment; // Already has new fields
      }

      migratedCount++;

      return {
        ...assessment,

        // Default all existing assessments to NOT exported (editable)
        exportedToAdmin: false,

        // OR: Auto-approve all existing assessments (locked)
        // Uncomment line below if you want to grandfather existing assessments as approved:
        // exportedToAdmin: true,
        // exportedAt: assessment.timestamp,
        // exportedBy: assessment.trainerId,

        // Add edit tracking
        lastEditedAt: assessment.timestamp,
        lastEditedBy: assessment.trainerId,
        editCount: 0,
      };
    });

    // Save back to localStorage
    localStorage.setItem('assessments', JSON.stringify(migrated));

    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`📈 Total assessments: ${assessments.length}`);
    console.log(`✨ Migrated: ${migratedCount}`);
    console.log(`✓  Already migrated: ${alreadyMigratedCount}`);
    console.log('\n📝 All existing assessments set to:');
    console.log('   - exportedToAdmin: false (editable by trainers)');
    console.log('   - editCount: 0');
    console.log('   - lastEditedAt: original timestamp');
    console.log('\n🎯 New assessments created from now on will use the export workflow.');
    console.log('\n💡 Trainers can now:');
    console.log('   1. Edit existing assessments');
    console.log('   2. Export assessments to admin when ready');
    console.log('   3. Cannot edit after export (locked)');
    console.log('\n🔓 Admins can unlock assessments if trainers need to edit them.');
    console.log('\n' + '='.repeat(70));

    // Optional: Sync to Firebase
    const syncToFirebase = confirm(
      'Migration complete! Do you want to sync these changes to Firebase now?\n\n' +
        '(Recommended: Click OK to sync)'
    );

    if (syncToFirebase) {
      console.log('\n🌐 Syncing to Firebase...');

      // Import Firebase
      const { initializeApp } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'
      );
      const { getFirestore, collection, doc, setDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );

      const firebaseConfig = {
        apiKey: 'AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c',
        authDomain: 'skill-lab-web.firebaseapp.com',
        projectId: 'skill-lab-web',
        storageBucket: 'skill-lab-web.firebasestorage.app',
        messagingSenderId: '437137958471',
        appId: '1:437137958471:web:89e99a4fddbc490d98f362',
      };

      const app = initializeApp(firebaseConfig, 'migrate-assessments-' + Date.now());
      const db = getFirestore(app);

      let syncedCount = 0;
      let failedCount = 0;

      for (const assessment of migrated) {
        try {
          await setDoc(doc(db, 'assessments', assessment.id), assessment);
          syncedCount++;

          if (syncedCount % 10 === 0) {
            console.log(`   Synced ${syncedCount}/${migrated.length}...`);
          }
        } catch (error) {
          console.error(`   Failed to sync ${assessment.id}:`, error.message);
          failedCount++;
        }
      }

      console.log('\n✅ Firebase sync complete!');
      console.log(`   Synced: ${syncedCount}`);
      console.log(`   Failed: ${failedCount}`);
    } else {
      console.log('\n⏭️  Skipped Firebase sync. You can sync manually via Sync page.');
    }

    console.log('\n✅ MIGRATION SUCCESSFUL!');
    console.log('You can now use the Export to Admin feature.');
  } catch (error) {
    console.error('\n💥 ERROR during migration:', error);
    console.error('Details:', error.message);
    console.error('\n⚠️  Migration failed. Data NOT changed.');
    console.error('Please contact support or try again.');
  }
})();
