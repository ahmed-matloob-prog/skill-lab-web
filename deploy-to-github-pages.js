#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📚 Student Attendance App - GitHub Pages Deployment Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the site directory');
  process.exit(1);
}

// Create GitHub Actions workflow directory
const workflowDir = '.github/workflows';
if (!fs.existsSync(workflowDir)) {
  console.log('📁 Creating GitHub Actions workflow directory...');
  fs.mkdirSync(workflowDir, { recursive: true });
}

// Create deployment workflow
const workflowContent = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: \${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./build
`;

const workflowFile = path.join(workflowDir, 'deploy.yml');
fs.writeFileSync(workflowFile, workflowContent);
console.log('✅ GitHub Actions workflow created');

// Update package.json with homepage
const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add homepage field (will be updated by user)
if (!packageJson.homepage) {
  packageJson.homepage = 'https://YOUR_USERNAME.github.io/student-attendance-web';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated with homepage field');
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

// Add and commit changes
try {
  console.log('📝 Adding files to git...');
  execSync('git add .', { stdio: 'inherit' });
  
  console.log('💾 Committing changes...');
  execSync('git commit -m "Add GitHub Pages deployment workflow"', { stdio: 'inherit' });
  console.log('✅ Changes committed\n');
} catch (error) {
  console.log('📝 Making initial commit...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Initial commit - Student Attendance App"', { stdio: 'inherit' });
  console.log('✅ Initial commit created\n');
}

console.log('🎉 Your code is ready for GitHub Pages deployment!\n');

console.log('📋 Next steps for GitHub Pages:');
console.log('1. 🌐 Go to: https://github.com');
console.log('2. 📁 Create new repository: student-attendance-web');
console.log('3. 🌍 Make it public (required for free GitHub Pages)');
console.log('4. 🔗 Add remote and push:');
console.log('     git remote add origin https://github.com/YOUR_USERNAME/student-attendance-web.git');
console.log('     git branch -M main');
console.log('     git push -u origin main');
console.log('5. ⚙️  Enable GitHub Pages:');
console.log('     • Go to repository Settings');
console.log('     • Scroll to Pages section');
console.log('     • Source: GitHub Actions');
console.log('     • Save');
console.log('6. ⏳ Wait for first deployment (3-5 minutes)');
console.log('7. 🎯 Your site: https://YOUR_USERNAME.github.io/student-attendance-web');

console.log('\n💡 Pro Tips:');
console.log('   • Every push to main branch = automatic deployment');
console.log('   • Custom domains supported (free)');
console.log('   • HTTPS enabled by default');
console.log('   • 1GB storage, 100GB bandwidth/month (free)');

// Create detailed setup instructions
const setupInstructions = `
📚 Detailed GitHub Pages Setup:

1. Create GitHub Repository:
   • Go to https://github.com
   • Click "New repository"
   • Name: student-attendance-web
   • Description: Student Attendance Management System
   • Make it public (required for free GitHub Pages)
   • Don't initialize with README (we already have files)
   • Click "Create repository"

2. Connect Local Repository:
   git remote add origin https://github.com/YOUR_USERNAME/student-attendance-web.git
   git branch -M main
   git push -u origin main

3. Enable GitHub Pages:
   • Go to your repository on GitHub
   • Click "Settings" tab
   • Scroll down to "Pages" section
   • Under "Source", select "GitHub Actions"
   • The workflow will automatically deploy your site

4. Update Homepage URL:
   • Edit package.json
   • Change homepage to: "https://YOUR_USERNAME.github.io/student-attendance-web"
   • Commit and push changes

5. Access Your Site:
   • URL: https://YOUR_USERNAME.github.io/student-attendance-web
   • First deployment may take 3-5 minutes
   • Subsequent deployments are faster

Replace YOUR_USERNAME with your actual GitHub username.
`;

console.log(setupInstructions);

// Create deployment info
const deploymentInfo = {
  platform: 'GitHub Pages',
  buildDate: new Date().toISOString(),
  url: 'https://github.com',
  features: [
    'Free hosting with GitHub account',
    'Custom domains supported',
    'HTTPS enabled by default',
    'Automatic deployments with GitHub Actions',
    '1GB storage (free tier)',
    '100GB bandwidth/month (free tier)'
  ],
  instructions: [
    '1. Create GitHub repository (public)',
    '2. Connect local repository',
    '3. Push code to GitHub',
    '4. Enable GitHub Pages in repository settings',
    '5. Select "GitHub Actions" as source',
    '6. Wait for deployment',
    '7. Access your site'
  ],
  workflowFile: '.github/workflows/deploy.yml'
};

fs.writeFileSync('github-pages-deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('\n💾 Deployment info saved to github-pages-deployment-info.json');




