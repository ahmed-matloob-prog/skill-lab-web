/**
 * Debug User Login Script
 * Run this in browser console to check if user exists and password is set
 *
 * Instructions:
 * 1. Open https://skill-lab-web.vercel.app
 * 2. Press F12 (Developer Console)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(function debugUser() {
  console.log('🔍 Debugging user: zaineb_shaker1');
  console.log('='.repeat(50));

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

  // Find the user
  const targetUsername = 'zaineb_shaker1';
  const normalizedTarget = targetUsername.toLowerCase().trim();

  console.log(`🔎 Searching for username: "${targetUsername}"`);
  console.log(`🔎 Normalized search: "${normalizedTarget}"`);
  console.log('');

  // Find user (case-insensitive)
  const user = users.find(u => u.username.toLowerCase().trim() === normalizedTarget);

  if (!user) {
    console.error(`❌ User "${targetUsername}" NOT FOUND!`);
    console.log('');
    console.log('📋 Available users:');
    users.forEach(u => {
      console.log(`  - ${u.username} (${u.role}) - Active: ${u.isActive}`);
    });
    return;
  }

  console.log('✅ User FOUND:');
  console.log('  Username:', user.username);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  Active:', user.isActive);
  console.log('  Assigned Groups:', user.assignedGroups || []);
  console.log('  Assigned Years:', user.assignedYears || []);
  console.log('  Created:', user.createdAt);
  console.log('  Last Login:', user.lastLogin || 'Never');
  console.log('');

  // Check password
  console.log('🔐 Checking password storage...');

  // Try different username variations
  const passwordKeys = [
    user.username,                    // Exact username
    normalizedTarget,                 // Normalized (lowercase + trim)
    user.username.toLowerCase(),      // Just lowercase
    user.username.trim(),             // Just trim
  ];

  let foundPassword = null;
  let foundKey = null;

  for (const key of passwordKeys) {
    if (passwords[key]) {
      foundPassword = passwords[key];
      foundKey = key;
      break;
    }
  }

  if (foundPassword) {
    console.log('✅ Password FOUND');
    console.log('  Stored under key:', foundKey);
    console.log('  Password hash:', foundPassword.substring(0, 20) + '...');
    console.log('  Hash type:', foundPassword.startsWith('$2') ? 'bcrypt ✅' : 'Unknown ⚠️');
  } else {
    console.error('❌ Password NOT FOUND!');
    console.log('');
    console.log('📋 Available password keys:');
    Object.keys(passwords).forEach(key => {
      console.log(`  - "${key}"`);
    });
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('💡 Troubleshooting:');

  if (!user) {
    console.log('  1. User does not exist - Create user in Admin Panel');
  } else if (!user.isActive) {
    console.log('  1. User is INACTIVE - Activate in Admin Panel');
  } else if (!foundPassword) {
    console.log('  1. Password not set - Update password in Admin Panel');
  } else {
    console.log('  1. User exists ✅');
    console.log('  2. User is active ✅');
    console.log('  3. Password is set ✅');
    console.log('  4. Try logging in with:');
    console.log(`     Username: ${user.username}`);
    console.log('     Password: (the password you just set)');
  }

})();
