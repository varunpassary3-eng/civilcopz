const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'frontend');
const dest = path.join(__dirname, 'app');

if (fs.existsSync(src)) {
  fs.renameSync(src, dest);
  console.log(`✅ Substrate Migration SUCCESS: ${src} -> ${dest}`);
} else if (fs.existsSync(dest)) {
  console.log(`ℹ️ Substrate Migration ALREADY COMPLETE: ${dest} exists.`);
} else {
  console.error(`❌ Migration ERROR: Source ${src} not found.`);
}
