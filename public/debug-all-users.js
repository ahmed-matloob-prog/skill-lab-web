/**
 * Debug All Users Script
 * Run this in browser console to see ALL users and find the correct username
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Press F12 (Developer Console)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(function debugAllUsers() {
  console.log('🔍 Debugging User Login Issue');
  console.log('='.repeat(60));

  // Get users from localStorage
  const usersJson = localStorage.getItem('users');
  const passwordsJson = localStorage.getItem('userPasswords');

  if (!usersJson) {
    console.error('❌ No users found in localStorage!');
    return;
  }

  if (!passwordsJson) {
    console.error('❌ No passwords found in localStorage!');
    return;
  }

  const users = JSON.parse(usersJson);
  const passwords = JSON.parse(passwordsJson);

  console.log(`📊 Total users in system: ${users.length}`);
  console.log(`🔑 Total passwords stored: ${Object.keys(passwords).length}`);
  console.log('');

  // Search for variations of zaineb
  console.log('🔎 Searching for "zaineb" variations...');
  console.log('');

  const searchTerms = [
    'zaineb-shaker',
    'zaineb_shaker',
    'zaineb_shaker1',
    'zaineb-shaker1',
    'zainebshaker',
    'zainebshaker1',
  ];

  let foundUsers = [];

  searchTerms.forEach(term => {
    const user = users.find(u => u.username.toLowerCase() === term.toLowerCase());
    if (user) {
      foundUsers.push({ term, user });
      console.log(`✅ FOUND "${term}"`);
    } else {
      console.log(`❌ NOT FOUND "${term}"`);
    }
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('📋 ALL USERS IN SYSTEM:');
  console.log('='.repeat(60));

  users.forEach((user, index) => {
    const hasPassword = passwords[user.username.toLowerCase()] || passwords[user.username];
    console.log(`\n${index + 1}. Username: "${user.username}"`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   Password Set: ${hasPassword ? '✅ Yes' : '❌ No'}`);
    if (hasPassword) {
      console.log(`   Password Type: ${hasPassword.startsWith('$2') ? 'bcrypt ✅' : 'PLAINTEXT ⚠️'}`);
    }
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('🔑 ALL PASSWORD KEYS:');
  console.log('='.repeat(60));
  Object.keys(passwords).forEach((key, index) => {
    const passwordValue = passwords[key];
    console.log(`${index + 1}. Key: "${key}"`);
    console.log(`   Hash: ${passwordValue.substring(0, 30)}...`);
    console.log(`   Type: ${passwordValue.startsWith('$2') ? 'bcrypt ✅' : 'PLAINTEXT ⚠️'}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('💡 NEXT STEPS:');
  console.log('='.repeat(60));
  console.log('1. Find the EXACT username from the list above');
  console.log('2. Use that EXACT username (copy-paste it) when logging in');
  console.log('3. Username is CASE-SENSITIVE (must match exactly)');
  console.log('4. Check if password is properly hashed (bcrypt)');
  console.log('5. If password is PLAINTEXT, update it in Admin Panel');
  console.log('');

  if (foundUsers.length > 0) {
    console.log('✅ Found these matching users:');
    foundUsers.forEach(({ term, user }) => {
      console.log(`   - "${user.username}" (searched as "${term}")`);
    });
  } else {
    console.log('⚠️  No users found matching "zaineb" variations');
    console.log('   Please check the full user list above');
  }

})();
