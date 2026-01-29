/**
 * Firebase Data Export Script
 *
 * This script exports all data from Firebase Firestore to local JSON files.
 * Run this BEFORE migrating to another database to create a backup.
 *
 * Usage:
 *   node scripts/exportFirebaseData.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Collections to export
const COLLECTIONS = ['students', 'groups', 'attendance', 'assessments', 'users'];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'firebase-backup');

async function exportCollection(db, collectionName) {
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

  console.log(`  > ${collectionName}: ${documents.length} documents`);
  return documents;
}

async function main() {
  console.log('===========================================================');
  console.log('           Firebase Data Export Script');
  console.log('===========================================================\n');

  // Check if Firebase is configured
  if (!firebaseConfig.projectId) {
    console.error('Error: Firebase not configured.');
    console.error('   Make sure REACT_APP_FIREBASE_* environment variables are set.');
    process.exit(1);
  }

  console.log(`Project ID: ${firebaseConfig.projectId}\n`);

  // Initialize Firebase
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('> Firebase initialized\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(OUTPUT_DIR, `backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Backup directory: ${backupDir}\n`);
  console.log('Exporting collections...\n');

  // Export all collections
  const exportData = {};
  let totalDocuments = 0;

  for (const collectionName of COLLECTIONS) {
    try {
      const documents = await exportCollection(db, collectionName);
      exportData[collectionName] = documents;
      totalDocuments += documents.length;

      // Save individual collection file
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    } catch (error) {
      console.error(`  Error exporting ${collectionName}:`, error.message);
      exportData[collectionName] = [];
    }
  }

  // Save combined file
  const combinedPath = path.join(backupDir, 'all-data.json');
  fs.writeFileSync(combinedPath, JSON.stringify(exportData, null, 2));

  // Save metadata
  const metadata = {
    exportedAt: new Date().toISOString(),
    projectId: firebaseConfig.projectId,
    collections: COLLECTIONS.map(name => ({
      name,
      count: exportData[name]?.length || 0
    })),
    totalDocuments
  };
  const metadataPath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log('\n===========================================================');
  console.log('                    Export Complete!');
  console.log('===========================================================');
  console.log(`\n  Total documents exported: ${totalDocuments}`);
  console.log(`  Backup location: ${backupDir}`);
  console.log('\n  Files created:');
  console.log('    - all-data.json (combined)');
  console.log('    - metadata.json (export info)');
  COLLECTIONS.forEach(name => {
    console.log(`    - ${name}.json`);
  });
  console.log('\n> Backup complete! Keep this folder safe before migration.\n');
}

// Run the export
main().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
