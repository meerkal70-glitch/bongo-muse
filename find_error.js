const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('app/player.tsx', 'utf8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('No syntax errors found by Babel!');
} catch (e) {
  console.log('Error:', e.message);
  console.log('Line:', e.loc.line, 'Column:', e.loc.column);
  
  const lines = code.split('\n');
  const start = Math.max(0, e.loc.line - 5);
  const end = Math.min(lines.length, e.loc.line + 5);
  for (let i = start; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
