# 🔐 Create New Admin Account

## Method 1: Using the Admin Panel (Easiest)

1. **Open your app:** http://localhost:3000
2. **Login** with existing admin account
3. **Go to Admin Panel** (click "Admin Panel" in sidebar)
4. **User Management tab** → **Add User** button
5. **Fill in:**
   - Username: `admin2`
   - Email: `admin2@example.com`
   - **Role:** `admin` ← Select this!
   - Password: `Admin123` (or your preferred password)
6. **Save**

✅ Done! New admin can now login.

---

## Method 2: Browser Console (If you need first admin)

If you don't have any admin account yet, use this method:

### Step 1: Open Browser Console
1. Open http://localhost:3000 in Chrome/Edge
2. Press **F12** to open DevTools
3. Go to **Console** tab

### Step 2: Paste This Code

```javascript
// Configuration - EDIT THESE VALUES
const newAdmin = {
  username: 'admin',           // Change this
  email: 'admin@example.com',  // Change this
  password: 'Admin123'         // Change this (min 8 chars, uppercase, lowercase, number)
};

// Don't edit below this line
function createAdmin(config) {
  // Validate
  if (config.password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    return;
  }
  if (!/[A-Z]/.test(config.password) || !/[a-z]/.test(config.password) || !/[0-9]/.test(config.password)) {
    console.error('❌ Password must include uppercase, lowercase, and number');
    return;
  }

  // Hash password
  const crypto = window.crypto || window.msCrypto;
  const encoder = new TextEncoder();
  const data = encoder.encode(config.password);

  crypto.subtle.digest('SHA-256', data).then(hash => {
    const hashArray = Array.from(new Uint8Array(hash));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const userId = `user-${Date.now()}`;
    const now = new Date().toISOString();

    // Get existing users
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Check if username exists
    if (users.find(u => u.username === config.username)) {
      console.error('❌ Username already exists');
      return;
    }

    // Add new admin
    users.push({
      id: userId,
      username: config.username,
      email: config.email,
      role: 'admin',
      isActive: true,
      createdAt: now,
      lastLogin: null
    });

    // Save users
    localStorage.setItem('users', JSON.stringify(users));

    // Add password
    const passwords = JSON.parse(localStorage.getItem('passwords') || '{}');
    passwords[config.username] = hashedPassword;
    localStorage.setItem('passwords', JSON.stringify(passwords));

    console.log('✅ Admin account created successfully!');
    console.log('Username:', config.username);
    console.log('Email:', config.email);
    console.log('Role: admin');
    console.log('\nYou can now login with:');
    console.log(`  Username: ${config.username}`);
    console.log(`  Password: ${config.password}`);
    console.log('\nRefresh the page to login.');
  });
}

// Create the admin
createAdmin(newAdmin);
```

### Step 3: Edit and Run
1. In the code above, change:
   - `username: 'admin'` to your desired username
   - `email: 'admin@example.com'` to your email
   - `password: 'Admin123'` to your desired password
2. Press **Enter** to run
3. You should see: `✅ Admin account created successfully!`
4. **Refresh the page** (F5)
5. Login with your new admin credentials

---

## Method 3: Using the Script File

If you prefer using Node.js:

```bash
cd "C:\Users\ahmed\Documents\python app\skill lab web"
node create-admin.js
```

Follow the prompts, then copy the output to browser console.

---

## Verification

After creating the admin:

1. **Check localStorage:**
   ```javascript
   // In browser console
   const users = JSON.parse(localStorage.getItem('users'));
   console.log('All users:', users);
   console.log('Admins:', users.filter(u => u.role === 'admin'));
   ```

2. **Test login:**
   - Go to login page
   - Enter username and password
   - Should login successfully and see "Admin Panel" in sidebar

---

## Default Admin Credentials (If Already Created)

If you already have the default admin from initial setup:

```
Username: admin
Password: admin123
```

(Change this after first login for security!)

---

## Troubleshooting

### "Username already exists"
- Choose a different username
- Or check existing users: `JSON.parse(localStorage.getItem('users'))`

### "Invalid password format"
- Password must be at least 8 characters
- Must include: uppercase letter, lowercase letter, number
- Example: `Admin123`, `MyPass1`, `Super2024`

### "Cannot login after creating"
- Did you refresh the page? (F5)
- Check browser console for errors
- Verify user exists: `localStorage.getItem('users')`

### Need to reset all data?
```javascript
// WARNING: This deletes ALL data!
localStorage.clear();
// Then refresh and create new admin
```

---

## Security Notes

- **Change default passwords immediately**
- **Use strong passwords:** 12+ characters, mixed case, numbers, symbols
- **Don't share admin credentials**
- **Create trainer accounts for regular users** (not admin accounts)

---

## After Creating Admin

Once you have an admin account:

1. ✅ Login as admin
2. ✅ Go to Admin Panel → User Management
3. ✅ Create trainer accounts for other users
4. ✅ Assign trainers to specific groups/years
5. ✅ Change your admin password to something secure

---

**Questions?** Check the app documentation or browser console for errors.
