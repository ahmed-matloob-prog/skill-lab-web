/**
 * Firebase Data Export - Browser Console Version
 *
 * Copy and paste this ENTIRE script into your browser console
 * while on the Skill Lab app (must be logged in).
 *
 * This will download a JSON file with all your Firebase data.
 */

(async function exportFirebaseData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           Firebase Data Export (Browser)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get Firebase instance from the app
  const { collection, getDocs, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

  // Try to get the existing db instance
  let db;
  try {
    // The app should have already initialized Firebase
    const { getApps } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
    const apps = getApps();
    if (apps.length === 0) {
      throw new Error('Firebase not initialized');
    }
    db = getFirestore(apps[0]);
  } catch (e) {
    console.error('❌ Error: Could not connect to Firebase.');
    console.error('   Make sure you are logged into the Skill Lab app.');
    return;
  }

  const COLLECTIONS = ['students', 'groups', 'attendance', 'assessments', 'users'];
  const exportData = {};
  let totalDocuments = 0;

  console.log('Exporting collections...\n');

  for (const collectionName of COLLECTIONS) {
    try {
      console.log(`  Exporting ${collectionName}...`);
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      exportData[collectionName] = documents;
      totalDocuments += documents.length;
      console.log(`  ✓ ${collectionName}: ${documents.length} documents`);
    } catch (error) {
      console.error(`  ❌ Error exporting ${collectionName}:`, error.message);
      exportData[collectionName] = [];
    }
  }

  // Add metadata
  exportData._metadata = {
    exportedAt: new Date().toISOString(),
    totalDocuments,
    collections: COLLECTIONS.map(name => ({
      name,
      count: exportData[name]?.length || 0
    }))
  };

  // Download as JSON file
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `firebase-backup-${timestamp}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    Export Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n  Total documents exported: ${totalDocuments}`);
  console.log(`  File downloaded: ${filename}`);
  console.log('\n✓ Keep this file safe before migration!\n');

  return exportData;
})();
