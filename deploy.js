#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Student Attendance App - Deployment Helper\n');

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

console.log('🎉 Your web app is ready for distribution!\n');

console.log('📋 Next steps:');
console.log('1. 📁 Your built files are in the "build" folder');
console.log('2. 🌐 For free hosting, upload the build folder to:');
console.log('   - Netlify: https://netlify.com (drag & drop)');
console.log('   - Vercel: https://vercel.com (connect GitHub)');
console.log('   - GitHub Pages: Enable in repository settings');
console.log('3. 📱 For mobile app distribution, run:');
console.log('   - eas build --platform android --profile preview');
console.log('   - eas build --platform ios --profile production');
console.log('\n📖 See DISTRIBUTION_GUIDE.md for detailed instructions');

// Create a simple deployment info file
const deploymentInfo = {
  buildDate: new Date().toISOString(),
  buildSize: getDirectorySize('build'),
  instructions: {
    netlify: 'Drag the build folder to https://netlify.com',
    vercel: 'Connect your GitHub repository to https://vercel.com',
    githubPages: 'Enable GitHub Pages in repository settings',
    customHosting: 'Upload build folder contents to your web server'
  }
};

fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('\n💾 Deployment info saved to deployment-info.json');

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




