const fs = require('fs');
const path = require('path');

const compiledDir = path.join(__dirname, 'node_modules', 'next', 'dist', 'compiled');
if (fs.existsSync(compiledDir)) {
  const dirs = fs.readdirSync(compiledDir);
  for (const dir of dirs) {
    const fullDir = path.join(compiledDir, dir);
    if (fs.statSync(fullDir).isDirectory()) {
      const indexPath = path.join(fullDir, 'index.js');
      const pkgPath = path.join(fullDir, 'package.json');
      if (!fs.existsSync(indexPath) && !fs.existsSync(pkgPath)) {
        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js'));
        if (files.length > 0) {
          // Prefer filename matching dir name, else first js file
          const target = files.find(f => f.startsWith(dir)) || files[0];
          fs.writeFileSync(indexPath, `module.exports = require('./${target}');\n`);
          console.log(`Created index.js in compiled/${dir} -> ${target}`);
        }
      }
    }
  }
}
console.log('Compiled packages fix completed.');
