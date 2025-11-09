/**
 * Quick Migration for Assessment Export Fields
 * Copy and paste this entire script into browser console
 */

console.log('🔄 Starting quick migration...');

try {
  // Get assessments from localStorage
  const assessmentsJson = localStorage.getItem('assessments');

  if (!assessmentsJson) {
    console.log('✅ No assessments found in localStorage');
    alert('No assessments to migrate. You can start creating new assessments with the export feature!');
  } else {
    const assessments = JSON.parse(assessmentsJson);
    console.log(`📊 Found ${assessments.length} assessments`);

    // Check if already migrated
    const alreadyMigrated = assessments.every(a => a.hasOwnProperty('exportedToAdmin'));

    if (alreadyMigrated) {
      console.log('✅ All assessments already migrated!');
      alert('All assessments already have export fields. Try hard refresh (Ctrl+Shift+R) to see the new UI.');
    } else {
      // Migrate
      const migrated = assessments.map(assessment => {
        if (assessment.hasOwnProperty('exportedToAdmin')) {
          return assessment;
        }
        return {
          ...assessment,
          exportedToAdmin: false,
          lastEditedAt: assessment.timestamp,
          lastEditedBy: assessment.trainerId,
          editCount: 0,
        };
      });

      localStorage.setItem('assessments', JSON.stringify(migrated));
      console.log('✅ Migration complete!');
      alert('Migration complete! Now refresh the page (F5) to see the new Export to Admin features.');
    }
  }
} catch (error) {
  console.error('❌ Migration failed:', error);
  alert('Migration failed: ' + error.message);
}
