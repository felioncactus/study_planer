
const fs = require('fs');
const parser = require('/mnt/data/project/client/node_modules/@babel/parser');
const files = [
  '/mnt/data/project/client/src/pages/FriendChat.jsx',
  '/mnt/data/project/client/src/pages/Tasks.jsx',
  '/mnt/data/project/client/src/pages/TaskDetail.jsx',
];
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
    console.log('OK', file);
  } catch (e) {
    console.error('ERR', file, e.message, 'line', e.loc && e.loc.line, 'col', e.loc && e.loc.column);
    process.exitCode = 1;
  }
}
