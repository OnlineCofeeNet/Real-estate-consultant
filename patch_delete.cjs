const fs = require('fs');
let code = fs.readFileSync('src/routes/api.ts', 'utf8');

const cascadeBlock = `
router.delete('/contracts/:id/cascade', async (req, res) => {
  const contractId = parseInt(req.params.id);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(payments).where(eq(payments.contractId, contractId));
      await tx.delete(invoices).where(eq(invoices.contractId, contractId));
      await tx.delete(contracts).where(eq(contracts.id, contractId));
    });
    await addAuditLog('delete', 'contracts', \`Cascade deleted contract ID: \${contractId}\`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
`;

code = code.replace("export default router;", cascadeBlock + "\nexport default router;");
fs.writeFileSync('src/routes/api.ts', code);
