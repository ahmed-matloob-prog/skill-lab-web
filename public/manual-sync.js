/**
 * Manual Firebase Sync Script
 * Copy and paste this into browser console to manually sync groups to Firebase
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Log in as admin
 * 3. Press F12 to open console
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Wait for "SUCCESS: All groups synced!" message
 */

(async function manualSyncToFirebase() {
  console.log('🚀 Manual Sync Starting...');

  try {
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, collection, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

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
    console.log('✅ Firebase initialized');

    // Get groups from localStorage
    const groupsJson = localStorage.getItem('groups');
    if (!groupsJson) {
      console.error('❌ No groups found in localStorage!');
      return;
    }

    const groups = JSON.parse(groupsJson);
    console.log(`📊 Found ${groups.length} groups in localStorage`);

    if (groups.length === 0) {
      console.warn('⚠️  No groups to sync');
      return;
    }

    // Upload each group to Firebase
    console.log('⬆️  Starting upload to Firebase...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        const groupRef = doc(db, 'groups', group.id);
        await setDoc(groupRef, {
          ...group,
          updatedAt: new Date().toISOString()
        });
        successCount++;
        console.log(`✅ [${i+1}/${groups.length}] Synced: ${group.name} (Year ${group.year})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ [${i+1}/${groups.length}] Failed: ${group.name}`, error.message);
      }
    }

    console.log('\n📊 Sync Complete!');
    console.log(`✅ Success: ${successCount} groups`);
    console.log(`❌ Errors: ${errorCount} groups`);

    if (successCount > 0) {
      console.log('\n🎉 SUCCESS: Groups synced to Firebase!');
      console.log('🔍 Verify at: https://console.firebase.google.com/project/skill-lab-web/firestore');
    }

  } catch (error) {
    console.error('💥 Fatal Error:', error);
    console.error('Stack:', error.stack);
  }
})();
