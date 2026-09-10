const fs = require('fs');
let code = fs.readFileSync('src/db/db.ts', 'utf8');

code = code.replace(
  "async completeContractTransaction(payload: any) {",
  "async cascadeDeleteContract(id: number) {\n    const res = await axios.delete(\`/api/contracts/\${id}/cascade\`);\n    return res.data;\n  }\n\n  async completeContractTransaction(payload: any) {"
);

fs.writeFileSync('src/db/db.ts', code);
