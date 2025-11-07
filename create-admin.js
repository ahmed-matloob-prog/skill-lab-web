/**
 * Create Admin User Script
 * Run this script to create a new admin user directly in localStorage
 *
 * Usage:
 *   node create-admin.js
 *
 * Then open browser console and paste the output
 */

const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createAdmin() {
  console.log('\n=== Create New Admin Account ===\n');

  const username = await question('Enter username: ');
  const email = await question('Enter email: ');
  const password = await question('Enter password (min 8 chars, include uppercase, lowercase, number): ');

  // Validate
  if (username.length < 3 || username.length > 50) {
    console.error('\n❌ Error: Username must be 3-50 characters');
    rl.close();
    return;
  }

  if (!email.includes('@')) {
    console.error('\n❌ Error: Invalid email format');
    rl.close();
    return;
  }

  if (password.length < 8) {
    console.error('\n❌ Error: Password must be at least 8 characters');
    rl.close();
    return;
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('\n❌ Error: Password must include uppercase, lowercase, and number');
    rl.close();
    return;
  }

  const hashedPassword = hashPassword(password);
  const userId = `user-${Date.now()}`;
  const now = new Date().toISOString();

  const newAdmin = {
    id: userId,
    username: username,
    email: email,
    role: 'admin',
    isActive: true,
    createdAt: now,
    lastLogin: null
  };

  console.log('\n✅ Admin account created!\n');
  console.log('=== COPY AND PASTE THE FOLLOWING IN BROWSER CONSOLE (F12) ===\n');
  console.log('// Step 1: Get existing users');
  console.log(`const users = JSON.parse(localStorage.getItem('users') || '[]');\n`);

  console.log('// Step 2: Add new admin');
  console.log(`users.push(${JSON.stringify(newAdmin, null, 2)});\n`);

  console.log('// Step 3: Save users');
  console.log(`localStorage.setItem('users', JSON.stringify(users));\n`);

  console.log('// Step 4: Add password');
  console.log(`const passwords = JSON.parse(localStorage.getItem('passwords') || '{}');`);
  console.log(`passwords['${username}'] = '${hashedPassword}';`);
  console.log(`localStorage.setItem('passwords', JSON.stringify(passwords));\n`);

  console.log('// Step 5: Verify');
  console.log(`console.log('✅ Admin created:', users.find(u => u.username === '${username}'));\n`);

  console.log('=== END OF SCRIPT ===\n');
  console.log('Then refresh the page and login with:');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('');

  rl.close();
}

createAdmin().catch(console.error);
