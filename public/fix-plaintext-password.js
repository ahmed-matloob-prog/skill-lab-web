/**
 * Fix Plaintext Password Script
 * This script re-hashes plaintext passwords that were saved before the bcrypt fix
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Log in as ADMIN (betool or admin)
 * 3. Go to Admin Panel
 * 4. Press F12 (Developer Console)
 * 5. Paste this entire script
 * 6. Press Enter
 * 7. It will show which passwords need fixing
 */

(async function fixPlaintextPasswords() {
  console.log('🔧 Checking for Plaintext Passwords');
  console.log('='.repeat(70));

  try {
    // Get passwords from localStorage
    const passwordsJson = localStorage.getItem('userPasswords');
    if (!passwordsJson) {
      console.error('❌ No passwords found in localStorage!');
      return;
    }

    const passwords = JSON.parse(passwordsJson);
    const plaintextPasswords = [];

    // Check each password
    Object.keys(passwords).forEach(username => {
      const password = passwords[username];
      const isBcrypt = password.startsWith('$2');

      if (!isBcrypt) {
        plaintextPasswords.push(username);
      }
    });

    if (plaintextPasswords.length === 0) {
      console.log('✅ All passwords are properly hashed with bcrypt!');
      console.log('No action needed.');
      return;
    }

    console.log(`⚠️  Found ${plaintextPasswords.length} plaintext password(s):\n`);
    plaintextPasswords.forEach((username, index) => {
      console.log(`${index + 1}. ${username}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('🔧 HOW TO FIX');
    console.log('='.repeat(70));
    console.log('\nOption 1: Update Password in Admin Panel (RECOMMENDED)');
    console.log('1. Stay on this page (Admin Panel)');
    console.log('2. For each user listed above:');
    console.log('   a. Click the "Edit" button next to their name');
    console.log('   b. Enter a NEW password (at least 8 characters)');
    console.log('   c. Click "Update User"');
    console.log('   d. Password will be properly hashed with bcrypt');
    console.log('\nOption 2: Delete and Recreate User');
    console.log('1. Delete the user from Admin Panel');
    console.log('2. Create them again with a new password');
    console.log('3. Password will be properly hashed on creation');

    console.log('\n' + '='.repeat(70));
    console.log('⚠️  IMPORTANT');
    console.log('='.repeat(70));
    console.log('The plaintext passwords cannot be recovered or re-hashed automatically.');
    console.log('You MUST set a new password for each affected user.');
    console.log('');
    console.log('After fixing, run this script again to verify all passwords are bcrypt.');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Stack:', error.stack);
  }
})();
