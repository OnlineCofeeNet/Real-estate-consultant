const fs = require('fs');
const lines = fs.readFileSync('src/pages/Contracts.tsx', 'utf8').split('\n');
console.log(lines.slice(155, 175).join('\n'));
