#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌐 Student Attendance App - Netlify Deployment Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the site directory');
  process.exit(1);
}

// Build the web application
console.log('📦 Building web application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Check if build directory exists
if (!fs.existsSync('build')) {
  console.error('❌ Build directory not found. Build may have failed.');
  process.exit(1);
}

console.log('🎉 Your web app is ready for Netlify deployment!\n');

console.log('📋 Next steps for Netlify:');
console.log('1. 🌐 Go to: https://netlify.com');
console.log('2. 👤 Sign up/Login (free account)');
console.log('3. 📁 Drag and drop the "build" folder onto the deploy area');
console.log('4. ⏳ Wait 30-60 seconds for deployment');
console.log('5. 🎯 Get your instant URL (e.g., https://your-app-123.netlify.app)');
console.log('6. ⚙️  Optional: Change site name in Netlify dashboard');

console.log('\n📁 Build folder location:');
console.log(`   ${path.resolve('build')}`);

console.log('\n💡 Pro Tips:');
console.log('   • Your app will be available at a random URL initially');
console.log('   • You can change the site name to something custom');
console.log('   • SSL certificate is automatically provided');
console.log('   • Custom domains are supported (free)');

// Create a simple info file for reference
const deploymentInfo = {
  platform: 'Netlify',
  buildDate: new Date().toISOString(),
  buildSize: getDirectorySize('build'),
  url: 'https://netlify.com',
  instructions: [
    '1. Go to https://netlify.com',
    '2. Sign up/Login with email or GitHub',
    '3. Drag the build folder to the deploy area',
    '4. Wait for deployment (30-60 seconds)',
    '5. Get your instant URL',
    '6. Optional: Change site name in dashboard'
  ]
};

fs.writeFileSync('netlify-deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('\n💾 Deployment info saved to netlify-deployment-info.json');

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




