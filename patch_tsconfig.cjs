const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf8');
const data = JSON.parse(code);
data.exclude = ["dist", "node_modules"];
fs.writeFileSync('tsconfig.json', JSON.stringify(data, null, 2));
