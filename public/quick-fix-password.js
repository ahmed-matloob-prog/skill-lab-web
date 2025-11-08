/**
 * Quick Password Fix Script
 * Uses the app's existing bcrypt library to hash password
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Log in as ADMIN (betool)
 * 3. Go to Admin Panel > Users tab
 * 4. Press F12 (Developer Console)
 * 5. Paste this entire script
 * 6. Press Enter
 */

(async function quickFixPassword() {
  console.log('🔐 Quick Password Fix');
  console.log('='.repeat(70));

  // Username to fix
  const username = 'zaineb_shaker1';
  const newPassword = prompt(`Enter NEW password for ${username} (min 8 characters):`);

  if (!newPassword || newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters!');
    return;
  }

  console.log(`\n📝 Processing password for: ${username}`);
  console.log('⏳ Hashing password...\n');

  try {
    // Use the bcryptjs library that's already in the app
    // Import it dynamically
    const bcrypt = await import('bcryptjs');

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    console.log('✅ Password hashed successfully');
    console.log('Hash preview:', hashedPassword.substring(0, 30) + '...\n');

    // Save to localStorage
    const normalizedUsername = username.toLowerCase().trim();

    // Update userPasswords in localStorage
    const passwordsJson = localStorage.getItem('userPasswords');
    const passwords = passwordsJson ? JSON.parse(passwordsJson) : {};

    passwords[normalizedUsername] = hashedPassword;
    passwords[username] = hashedPassword; // Also save with original casing

    localStorage.setItem('userPasswords', JSON.stringify(passwords));
    console.log('✅ Password saved to localStorage\n');

    // Now save to Firebase using the app's Firebase instance
    console.log('☁️  Saving to Firebase...');

    // Dynamic import Firebase modules
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

    const app = initializeApp(firebaseConfig, 'temp-' + Date.now());
    const db = getFirestore(app);

    const passwordRef = doc(db, 'passwords', normalizedUsername);
    await setDoc(passwordRef, {
      username: normalizedUsername,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Password saved to Firebase\n');

    console.log('='.repeat(70));
    console.log('✅ SUCCESS - Password Fixed!');
    console.log('='.repeat(70));
    console.log(`Username: ${username}`);
    console.log('Password: *** (the password you just entered)');
    console.log('Hash type: bcrypt ✅');
    console.log('Saved to: localStorage + Firebase ✅\n');

    console.log('🔍 Verification:');
    console.log('Hash starts with:', hashedPassword.substring(0, 4));
    console.log('Is bcrypt:', hashedPassword.startsWith('$2') ? '✅ Yes' : '❌ No');

    console.log('\n💡 Next Steps:');
    console.log('1. Log out from admin panel');
    console.log('2. Go to login page');
    console.log('3. Log in with:');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the password you just entered)');
    console.log('4. Login should now work! ✅');

  } catch (error) {
    console.error('💥 Error:', error);
    console.log('\n='.repeat(70));
    console.log('📋 ALTERNATIVE METHOD - Direct Firebase Update');
    console.log('='.repeat(70));
    console.log('\nSince the automatic method failed, please:');
    console.log('1. Delete user "zaineb_shaker1" from Admin Panel');
    console.log('2. Create user again with:');
    console.log('   - Username: zaineb_shaker1');
    console.log('   - Email: zaineb@skillab.com');
    console.log('   - Role: trainer');
    console.log('   - Password: (your choice, min 8 chars)');
    console.log('   - Assign groups and years as needed');
    console.log('3. The NEW creation will hash password properly');
    console.log('4. Then try logging in with the new password');
  }
})();
