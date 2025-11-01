#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating Local Distribution Package for Trainers\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project directory');
  process.exit(1);
}

// Create distribution directory
const distDir = 'trainer-distribution';
if (fs.existsSync(distDir)) {
  console.log('🗑️  Removing existing distribution directory...');
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log('📁 Creating distribution directory...');
fs.mkdirSync(distDir, { recursive: true });

// Build the application
console.log('🔨 Building production version...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Copy build files to distribution
console.log('📋 Copying application files...');
fs.cpSync('build', path.join(distDir, 'app'), { recursive: true });

// Create a simple HTTP server script
const serverScript = `#!/usr/bin/env node

const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the app directory
app.use(express.static(path.join(__dirname, 'app')));

// Handle React Router (return index.html for all routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.listen(port, () => {
  console.log('🎉 Skill Lab Web App is running!');
  console.log('📱 Open your browser and go to:');
  console.log('   http://localhost:' + port);
  console.log('\\n🔐 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('\\n⏹️  To stop the server, press Ctrl+C');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Shutting down Skill Lab Web App...');
  process.exit(0);
});
`;

fs.writeFileSync(path.join(distDir, 'server.js'), serverScript);

// Create package.json for the distribution
const distPackageJson = {
  "name": "skill-lab-web-trainer",
  "version": "1.0.0",
  "description": "Skill Lab Web - Student Attendance Management System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "install-deps": "npm install express"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "keywords": ["student", "attendance", "management", "education"],
  "author": "Skill Lab",
  "license": "MIT"
};

fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(distPackageJson, null, 2));

// Create installation instructions
const installInstructions = `# Skill Lab Web - Trainer Installation Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Node.js
1. Go to: https://nodejs.org
2. Download and install Node.js (LTS version)
3. Restart your computer after installation

### Step 2: Install Dependencies
1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Navigate to this folder
3. Run: npm install express

### Step 3: Start the Application
1. Run: npm start
2. Open your browser
3. Go to: http://localhost:3000

### Step 4: Login
- Username: admin
- Password: admin123

## 📱 Using the Application

### First Time Setup:
1. Login as admin
2. Create trainer accounts in Admin Panel
3. Add student groups (Group1-Group30 are pre-configured)
4. Import students using Excel templates

### Daily Use:
1. Login with your trainer account
2. Go to "Input Data" to mark attendance and record assessments
3. Use "Students" page to manage student information
4. Export reports as needed

## 🔧 Troubleshooting

### Port Already in Use:
- If port 3000 is busy, edit server.js and change the port number
- Or stop other applications using port 3000

### Can't Access the App:
- Make sure Node.js is installed
- Check that you ran "npm install express"
- Try running "npm start" again

### Data Storage:
- All data is stored locally in your browser
- Data persists between sessions
- To backup data, export reports regularly

## 📞 Support
For technical support, contact your system administrator.

---
Skill Lab Web v1.0.0 - Student Attendance Management System
`;

fs.writeFileSync(path.join(distDir, 'README.md'), installInstructions);

// Create a Windows batch file for easy startup
const windowsBatch = `@echo off
echo Starting Skill Lab Web App...
echo.
echo Installing dependencies (first time only)...
call npm install express
echo.
echo Starting the application...
echo.
echo The app will open at: http://localhost:3000
echo Login: admin / admin123
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start
pause
`;

fs.writeFileSync(path.join(distDir, 'start-app.bat'), windowsBatch);

// Create a Mac/Linux shell script
const unixScript = `#!/bin/bash
echo "Starting Skill Lab Web App..."
echo ""
echo "Installing dependencies (first time only)..."
npm install express
echo ""
echo "Starting the application..."
echo ""
echo "The app will open at: http://localhost:3000"
echo "Login: admin / admin123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
npm start
`;

fs.writeFileSync(path.join(distDir, 'start-app.sh'), unixScript);

// Make the shell script executable on Unix systems
try {
  execSync(`chmod +x "${path.join(distDir, 'start-app.sh')}"`);
} catch (error) {
  // Ignore error on Windows
}

console.log('✅ Distribution package created successfully!\n');

console.log('📦 Distribution Package Contents:');
console.log('   📁 trainer-distribution/');
console.log('   ├── 📱 app/ (your built application)');
console.log('   ├── 📄 server.js (local server)');
console.log('   ├── 📄 package.json (dependencies)');
console.log('   ├── 📄 README.md (instructions)');
console.log('   ├── 🪟 start-app.bat (Windows)');
console.log('   └── 🐧 start-app.sh (Mac/Linux)');

console.log('\n🎯 How to Distribute to Trainers:');
console.log('1. 📁 Zip the "trainer-distribution" folder');
console.log('2. 📧 Send to trainers via email or file sharing');
console.log('3. 📋 Include these instructions:');
console.log('   • Install Node.js from https://nodejs.org');
console.log('   • Extract the zip file');
console.log('   • Double-click "start-app.bat" (Windows) or "start-app.sh" (Mac/Linux)');
console.log('   • Open browser to http://localhost:3000');
console.log('   • Login: admin / admin123');

console.log('\n💡 Trainer Benefits:');
console.log('   ✅ Works offline (no internet required)');
console.log('   ✅ Data stored locally (privacy)');
console.log('   ✅ No installation complexity');
console.log('   ✅ Works on any computer');
console.log('   ✅ Easy to backup and restore');

console.log('\n📊 Distribution Package Size:');
const distSize = getDirectorySize(distDir);
console.log(`   ${distSize}`);

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(itemPath);
      files.forEach(file => {
        calculateSize(path.join(itemPath, file));
      });
    } else {
      totalSize += stats.size;
    }
  }
  
  calculateSize(dirPath);
  return (totalSize / 1024 / 1024).toFixed(2) + ' MB';
}
