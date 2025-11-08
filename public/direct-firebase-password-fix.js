/**
 * Direct Firebase Password Fix
 * This script directly writes a bcrypt-hashed password to Firebase
 * bypassing the app's buggy password update code
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Log in as ADMIN
 * 3. Make sure user "zaineb_shaker1" exists in Admin Panel
 * 4. Press F12 (Developer Console)
 * 5. Copy this ENTIRE script and paste in console
 * 6. Press Enter
 * 7. Enter the password when prompted
 */

(async function directFirebasePasswordFix() {
  console.log('🔐 Direct Firebase Password Fix');
  console.log('='.repeat(70));
  console.log('This will hash password client-side and upload to Firebase\n');

  const username = 'zaineb_shaker1';
  const newPassword = prompt(`Enter NEW password for ${username} (min 8 characters):`);

  if (!newPassword || newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters!');
    return;
  }

  console.log(`📝 Username: ${username}`);
  console.log('⏳ Processing...\n');

  try {
    // Step 1: Generate bcrypt hash using a pure JS implementation
    console.log('1️⃣ Generating bcrypt hash...');

    // Use bcryptjs from CDN (pure JavaScript, works in browser)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js';

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load bcrypt library'));
      document.head.appendChild(script);
    });

    console.log('   ✅ bcrypt library loaded');

    // Hash the password
    const salt = dcodeIO.bcrypt.genSaltSync(10);
    const hashedPassword = dcodeIO.bcrypt.hashSync(newPassword, salt);

    console.log('   ✅ Password hashed successfully');
    console.log('   Hash preview:', hashedPassword.substring(0, 30) + '...\n');

    // Step 2: Save to localStorage
    console.log('2️⃣ Saving to localStorage...');
    const normalizedUsername = username.toLowerCase().trim();

    const passwordsJson = localStorage.getItem('userPasswords');
    const passwords = passwordsJson ? JSON.parse(passwordsJson) : {};

    passwords[normalizedUsername] = hashedPassword;
    passwords[username] = hashedPassword; // Also with original casing

    localStorage.setItem('userPasswords', JSON.stringify(passwords));
    console.log('   ✅ Saved to localStorage\n');

    // Step 3: Save to Firebase
    console.log('3️⃣ Saving to Firebase...');

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: "AIzaSyApEBRc07MYMkSrti3MhcMaxIJOEHKkH6c",
      authDomain: "skill-lab-web.firebaseapp.com",
      projectId: "skill-lab-web",
      storageBucket: "skill-lab-web.firebasestorage.app",
      messagingSenderId: "437137958471",
      appId: "1:437137958471:web:89e99a4fddbc490d98f362"
    };

    const app = initializeApp(firebaseConfig, 'password-fix-' + Date.now());
    const db = getFirestore(app);

    const passwordRef = doc(db, 'passwords', normalizedUsername);
    await setDoc(passwordRef, {
      username: normalizedUsername,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    console.log('   ✅ Saved to Firebase\n');

    // Step 4: Verify
    console.log('4️⃣ Verifying...');
    const verifyPasswords = JSON.parse(localStorage.getItem('userPasswords'));
    const verifyHash = verifyPasswords[normalizedUsername];

    console.log('   Hash in localStorage:', verifyHash ? verifyHash.substring(0, 30) + '...' : 'NOT FOUND');
    console.log('   Is bcrypt:', verifyHash && verifyHash.startsWith('$2') ? '✅ YES' : '❌ NO');

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS - Password Fixed!');
    console.log('='.repeat(70));
    console.log(`Username: ${username}`);
    console.log('Password: *** (the password you just entered)');
    console.log('Hash type: bcrypt ✅');
    console.log('Status: Saved to localStorage + Firebase ✅\n');

    console.log('💡 Next Steps:');
    console.log('1. Close this browser tab');
    console.log('2. Open a NEW tab to: https://skill-lab-web.vercel.app');
    console.log('3. Log in with:');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the password you just set)`);
    console.log('4. Login should work! ✅\n');

    console.log('ℹ️  Note: Opening in a NEW tab ensures fresh sync from Firebase');

  } catch (error) {
    console.error('\n💥 Error:', error);
    console.error('Details:', error.message);
    console.error('Stack:', error.stack);

    console.log('\n' + '='.repeat(70));
    console.log('⚠️  TROUBLESHOOTING');
    console.log('='.repeat(70));
    console.log('\nIf the automatic fix failed, here are your options:\n');

    console.log('Option A: Wait for Vercel Deployment (RECOMMENDED)');
    console.log('1. The password hashing fix has been pushed to GitHub');
    console.log('2. Vercel should auto-deploy within 5-10 minutes');
    console.log('3. After deployment, delete and recreate the user');
    console.log('4. The new code will hash passwords properly\n');

    console.log('Option B: Manual Firebase Console Update');
    console.log('1. Go to: https://console.firebase.google.com/project/skill-lab-web/firestore');
    console.log('2. Navigate to: passwords collection');
    console.log('3. Find document: zaineb_shaker1');
    console.log('4. Delete the document');
    console.log('5. In the app, create user again (after Vercel deploys)\n');

    console.log('Option C: Use Different Username');
    console.log('1. Create a NEW user with different username (e.g., zaineb_trainer)');
    console.log('2. User creation works (only update is broken)');
    console.log('3. Log in with the new username');
  }
})();
