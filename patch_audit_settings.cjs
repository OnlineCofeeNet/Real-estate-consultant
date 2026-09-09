const fs = require('fs');
let code = fs.readFileSync('src/routes/api.ts', 'utf8');

code = code.replace(
  "      .returning();\n    res.json(result[0]?.id);",
  "      .returning();\n    await addAuditLog('create/update', 'settings', 'Updated global settings');\n    res.json(result[0]?.id);"
);

code = code.replace(
  "    await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1));\n    res.json({ success: true });",
  "    await db.update(settings).set({ data: req.body }).where(eq(settings.id, 1));\n    await addAuditLog('update', 'settings', 'Updated global settings');\n    res.json({ success: true });"
);

fs.writeFileSync('src/routes/api.ts', code);
console.log("Success");
