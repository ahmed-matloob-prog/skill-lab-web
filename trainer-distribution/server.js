#!/usr/bin/env node

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
  console.log('\n🔐 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('\n⏹️  To stop the server, press Ctrl+C');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Skill Lab Web App...');
  process.exit(0);
});
