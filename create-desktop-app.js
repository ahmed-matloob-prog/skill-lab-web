#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🖥️  Creating Desktop App Distribution Package\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project directory');
  process.exit(1);
}

// Create desktop app directory
const desktopDir = 'desktop-app-distribution';
if (fs.existsSync(desktopDir)) {
  console.log('🗑️  Removing existing desktop app directory...');
  fs.rmSync(desktopDir, { recursive: true, force: true });
}

console.log('📁 Creating desktop app directory...');
fs.mkdirSync(desktopDir, { recursive: true });

// Build the application
console.log('🔨 Building production version...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Copy build files
console.log('📋 Copying application files...');
fs.cpSync('build', path.join(desktopDir, 'app'), { recursive: true });

// Create Electron main process
const electronMain = `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add icon if available
    title: 'Skill Lab Web - Student Attendance Management',
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Skill Lab Web',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Skill Lab Web',
              message: 'Skill Lab Web v1.0.0',
              detail: 'Student Attendance Management System\\n\\nA comprehensive web-based student attendance and assessment management system.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
`;

fs.writeFileSync(path.join(desktopDir, 'main.js'), electronMain);

// Create package.json for Electron app
const electronPackageJson = {
  "name": "skill-lab-web-desktop",
  "version": "1.0.0",
  "description": "Skill Lab Web - Student Attendance Management System (Desktop App)",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "dist": "electron-builder --publish=never",
    "pack": "electron-builder --dir",
    "install-deps": "npm install electron electron-builder"
  },
  "build": {
    "appId": "com.skilllab.web",
    "productName": "Skill Lab Web",
    "directories": {
      "output": "dist"
    },
    "files": [
      "app/**/*",
      "main.js",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  },
  "dependencies": {
    "electron": "^22.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0"
  },
  "keywords": ["student", "attendance", "management", "education", "desktop"],
  "author": "Skill Lab",
  "license": "MIT"
};

fs.writeFileSync(path.join(desktopDir, 'package.json'), JSON.stringify(electronPackageJson, null, 2));

// Create installation instructions for desktop app
const desktopInstructions = `# Skill Lab Web - Desktop App Installation Guide

## 🖥️ Desktop App Benefits
- ✅ Native desktop application
- ✅ Works offline (no internet required)
- ✅ Data stored locally (privacy)
- ✅ No browser required
- ✅ Professional desktop experience
- ✅ Easy to distribute and install

## 🚀 Installation for End Users

### Windows:
1. Download the installer (.exe file)
2. Double-click to install
3. Launch from Start Menu or Desktop shortcut
4. Login: admin / admin123

### Mac:
1. Download the .dmg file
2. Open and drag to Applications folder
3. Launch from Applications
4. Login: admin / admin123

### Linux:
1. Download the .AppImage file
2. Make executable: chmod +x skill-lab-web.AppImage
3. Double-click to run
4. Login: admin / admin123

## 🔧 Building Desktop App (For Developers)

### Prerequisites:
- Node.js installed
- Git (optional)

### Build Steps:
1. Install dependencies:
   \`\`\`bash
   npm install electron electron-builder
   \`\`\`

2. Build for current platform:
   \`\`\`bash
   npm run dist
   \`\`\`

3. Build for all platforms:
   \`\`\`bash
   npm run build
   \`\`\`

### Output:
- Windows: .exe installer in dist/ folder
- Mac: .dmg file in dist/ folder  
- Linux: .AppImage file in dist/ folder

## 📱 Using the Application

### First Time Setup:
1. Login as admin (admin / admin123)
2. Create trainer accounts in Admin Panel
3. Add student groups (Group1-Group30 are pre-configured)
4. Import students using Excel templates

### Daily Use:
1. Login with your trainer account
2. Go to "Input Data" to mark attendance and record assessments
3. Use "Students" page to manage student information
4. Export reports as needed

## 🔒 Security Features
- Data stored locally on user's computer
- No external data transmission
- Secure authentication system
- Role-based access control

## 📞 Support
For technical support, contact your system administrator.

---
Skill Lab Web Desktop v1.0.0 - Student Attendance Management System
`;

fs.writeFileSync(path.join(desktopDir, 'README.md'), desktopInstructions);

// Create a simple build script
const buildScript = `#!/bin/bash
echo "Building Skill Lab Web Desktop App..."

# Install dependencies
echo "Installing dependencies..."
npm install electron electron-builder

# Build the app
echo "Building desktop app..."
npm run dist

echo "✅ Desktop app built successfully!"
echo "📁 Check the 'dist' folder for installers"
`;

fs.writeFileSync(path.join(desktopDir, 'build.sh'), buildScript);

// Create Windows build script
const windowsBuildScript = `@echo off
echo Building Skill Lab Web Desktop App...

echo Installing dependencies...
call npm install electron electron-builder

echo Building desktop app...
call npm run dist

echo ✅ Desktop app built successfully!
echo 📁 Check the 'dist' folder for installers
pause
`;

fs.writeFileSync(path.join(desktopDir, 'build.bat'), windowsBuildScript);

console.log('✅ Desktop app distribution package created successfully!\n');

console.log('📦 Desktop App Package Contents:');
console.log('   📁 desktop-app-distribution/');
console.log('   ├── 📱 app/ (your built application)');
console.log('   ├── 📄 main.js (Electron main process)');
console.log('   ├── 📄 package.json (Electron dependencies)');
console.log('   ├── 📄 README.md (instructions)');
console.log('   ├── 🪟 build.bat (Windows build script)');
console.log('   └── 🐧 build.sh (Unix build script)');

console.log('\n🎯 How to Create Desktop App:');
console.log('1. 📁 Navigate to desktop-app-distribution folder');
console.log('2. 🔧 Run: npm install electron electron-builder');
console.log('3. 🏗️  Run: npm run dist');
console.log('4. 📦 Get installers from dist/ folder');

console.log('\n💡 Desktop App Benefits:');
console.log('   ✅ Native desktop experience');
console.log('   ✅ Works completely offline');
console.log('   ✅ No browser required');
console.log('   ✅ Professional installation');
console.log('   ✅ Easy distribution to trainers');

console.log('\n📊 Desktop App Package Size:');
const desktopSize = getDirectorySize(desktopDir);
console.log(`   ${desktopSize}`);

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











