/**
 * Manual Password Hash Script
 * Manually hash and save a password with bcrypt
 * Use this if the Admin Panel isn't hashing passwords correctly
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Log in as ADMIN
 * 3. Press F12 (Developer Console)
 * 4. Paste this entire script
 * 5. Press Enter
 * 6. Follow the prompts
 */

(async function manualHashPassword() {
  console.log('🔐 Manual Password Hash Tool');
  console.log('='.repeat(70));

  // Get username and password from user
  const username = prompt('Enter username to update (e.g., zaineb_shaker1):');
  if (!username || !username.trim()) {
    console.error('❌ Username is required!');
    return;
  }

  const password = prompt('Enter NEW password (min 8 characters):');
  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters!');
    return;
  }

  const confirmPassword = prompt('Confirm password:');
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match!');
    return;
  }

  console.log(`\n📝 Processing password for user: ${username}`);
  console.log('⏳ Hashing password with bcrypt...\n');

  try {
    // Import bcrypt from CDN
    const bcrypt = await import('https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('✅ Password hashed successfully');
    console.log('Hash preview:', hashedPassword.substring(0, 30) + '...\n');

    // Save to localStorage
    const normalizedUsername = username.toLowerCase().trim();

    // Update userPasswords
    const passwordsJson = localStorage.getItem('userPasswords');
    const passwords = passwordsJson ? JSON.parse(passwordsJson) : {};

    passwords[normalizedUsername] = hashedPassword;
    // Also save with original casing for backwards compatibility
    if (normalizedUsername !== username) {
      passwords[username] = hashedPassword;
    }

    localStorage.setItem('userPasswords', JSON.stringify(passwords));
    console.log('✅ Password saved to localStorage\n');

    // Save to Firebase
    console.log('☁️  Saving to Firebase...');

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

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const passwordRef = doc(db, 'passwords', normalizedUsername);
    await setDoc(passwordRef, {
      username: normalizedUsername,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Password saved to Firebase\n');

    console.log('='.repeat(70));
    console.log('✅ SUCCESS - Password Updated!');
    console.log('='.repeat(70));
    console.log(`Username: ${username}`);
    console.log('Password: *** (the password you just entered)');
    console.log('Hash type: bcrypt ✅');
    console.log('Saved to: localStorage + Firebase ✅\n');

    console.log('🔍 Verification:');
    const verifyPassword = passwords[normalizedUsername];
    console.log('Stored hash starts with:', verifyPassword.substring(0, 4));
    console.log('Is bcrypt:', verifyPassword.startsWith('$2') ? '✅ Yes' : '❌ No');

    console.log('\n💡 Next Steps:');
    console.log('1. Refresh the login page (or hard refresh: Ctrl+Shift+R)');
    console.log('2. Log in with:');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the password you just set)');
    console.log('3. Login should now work! ✅');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n⚠️  Troubleshooting:');
    console.log('1. Make sure you have internet connection (needs to load bcrypt)');
    console.log('2. Make sure you are logged in as admin');
    console.log('3. Check Firebase console for any permission errors');
  }
})();
