#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚡ Student Attendance App - Vercel Deployment Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the site directory');
  process.exit(1);
}

// Check if git is initialized
if (!fs.existsSync('.git')) {
  console.log('📁 Initializing Git repository...');
  try {
    execSync('git init', { stdio: 'inherit' });
    console.log('✅ Git repository initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize git:', error.message);
    process.exit(1);
  }
}

// Check if there are uncommitted changes
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('📝 Adding files to git...');
    execSync('git add .', { stdio: 'inherit' });
    
    console.log('💾 Committing changes...');
    execSync('git commit -m "Deploy to Vercel - Student Attendance App"', { stdio: 'inherit' });
    console.log('✅ Changes committed\n');
  }
} catch (error) {
  console.log('📝 Adding files to git...');
  execSync('git add .', { stdio: 'inherit' });
  
  console.log('💾 Making initial commit...');
  execSync('git commit -m "Initial commit - Student Attendance App"', { stdio: 'inherit' });
  console.log('✅ Initial commit created\n');
}

console.log('🎉 Your code is ready for Vercel deployment!\n');

console.log('📋 Next steps for Vercel:');
console.log('1. 🌐 Go to: https://vercel.com');
console.log('2. 👤 Sign up with GitHub (one-click)');
console.log('3. 📁 Click "New Project"');
console.log('4. 🔗 Import your GitHub repository');
console.log('5. ⚙️  Configure build settings:');
console.log('     • Framework Preset: Create React App');
console.log('     • Root Directory: ./ (default)');
console.log('     • Build Command: npm run build');
console.log('     • Output Directory: build');
console.log('6. 🚀 Click "Deploy"');
console.log('7. ⏳ Wait 2-3 minutes for deployment');
console.log('8. 🎯 Get your URL (e.g., https://your-app.vercel.app)');

console.log('\n💡 Pro Tips:');
console.log('   • Every push to main branch = automatic deployment');
console.log('   • Pull requests = preview deployments');
console.log('   • Custom domains supported (free)');
console.log('   • Environment variables available');
console.log('   • Analytics and performance monitoring included');

// Create GitHub repository setup instructions
const githubSetup = `
📚 GitHub Repository Setup (if not already done):

1. Go to: https://github.com
2. Click "New repository"
3. Name: student-attendance-web
4. Make it public (required for free hosting)
5. Click "Create repository"
6. Run these commands:

git remote add origin https://github.com/YOUR_USERNAME/student-attendance-web.git
git branch -M main
git push -u origin main

Replace YOUR_USERNAME with your actual GitHub username.
`;

console.log(githubSetup);

// Create deployment info
const deploymentInfo = {
  platform: 'Vercel',
  buildDate: new Date().toISOString(),
  url: 'https://vercel.com',
  features: [
    'Automatic deployments from Git',
    'Preview deployments for pull requests',
    'Custom domains with SSL',
    'Environment variables',
    'Analytics and monitoring',
    'Edge functions support'
  ],
  instructions: [
    '1. Go to https://vercel.com',
    '2. Sign up with GitHub',
    '3. Click "New Project"',
    '4. Import your GitHub repository',
    '5. Configure build settings',
    '6. Click "Deploy"',
    '7. Wait for deployment',
    '8. Get your URL'
  ]
};

fs.writeFileSync('vercel-deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('\n💾 Deployment info saved to vercel-deployment-info.json');




