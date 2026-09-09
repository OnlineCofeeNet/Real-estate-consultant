const fs = require('fs');
let code = fs.readFileSync('src/routes/api.ts', 'utf8');

const logHelper = `
const addAuditLog = async (action: string, entity: string, details: string, user: string = 'System') => {
  try {
    await db.insert(auditLogs).values({
      date: Date.now(),
      action,
      entity,
      user,
      details
    });
  } catch(e) {
    console.error('Audit Log Error:', e);
  }
};
`;

code = code.replace("const createCrudRoutes", logHelper + "\nconst createCrudRoutes");

// POST
code = code.replace(
  "      const result = await db.insert(tableSchema).values(req.body).returning();",
  "      const result = await db.insert(tableSchema).values(req.body).returning();\n      await addAuditLog('create', tableName, `Created record ID: ${result[0]?.id}`);"
);

// PUT
code = code.replace(
  "      await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, parseInt(req.params.id)));",
  "      await db.update(tableSchema).set(req.body).where(eq(tableSchema.id, parseInt(req.params.id)));\n      await addAuditLog('update', tableName, `Updated record ID: ${req.params.id}`);"
);

// DELETE
code = code.replace(
  "      await db.delete(tableSchema).where(eq(tableSchema.id, parseInt(req.params.id)));",
  "      await db.delete(tableSchema).where(eq(tableSchema.id, parseInt(req.params.id)));\n      await addAuditLog('delete', tableName, `Deleted record ID: ${req.params.id}`);"
);

fs.writeFileSync('src/routes/api.ts', code);
console.log("Success");
