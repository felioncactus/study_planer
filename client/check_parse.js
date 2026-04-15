
const fs = require('fs');
const path = require('path');
const parser = require('./node_modules/@babel/parser');
const files = process.argv.slice(2);
let ok = true;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
    console.log('OK', file);
  } catch (e) {
    ok = false;
    console.error('ERR', file, e.message);
  }
}
process.exit(ok ? 0 : 1);
