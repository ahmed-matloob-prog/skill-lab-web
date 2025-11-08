const fs = require('fs');
const path = require('path');

// Read package.json to get version
const packageJson = require('../package.json');

// Generate version info
const versionInfo = {
  version: packageJson.version,
  timestamp: Date.now(),
  buildDate: new Date().toISOString()
};

// Write to public/version.json
const outputPath = path.join(__dirname, '..', 'public', 'version.json');

fs.writeFileSync(
  outputPath,
  JSON.stringify(versionInfo, null, 2) + '\n',
  'utf8'
);

console.log('✅ Generated version.json');
console.log(`   Version: ${versionInfo.version}`);
console.log(`   Build Date: ${versionInfo.buildDate}`);
console.log(`   Timestamp: ${versionInfo.timestamp}`);
