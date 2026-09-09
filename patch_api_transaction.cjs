const fs = require('fs');
let code = fs.readFileSync('src/routes/api.ts', 'utf8');

const completeBlock = `
router.post('/contracts/complete', async (req, res) => {
  const { contract, invoice1, payment1, invoice2, payment2 } = req.body;
  
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Insert contract
      const contractResult = await tx.insert(contracts).values(contract).returning();
      const contractId = contractResult[0]?.id;
      
      let resData = { contractId };
      
      // 2. Insert Invoice 1
      if (invoice1) {
        invoice1.contractId = contractId;
        const inv1Result = await tx.insert(invoices).values(invoice1).returning();
        const inv1Id = inv1Result[0]?.id;
        resData.invoice1Id = inv1Id;
        
        // 3. Insert Payment 1
        if (payment1) {
          payment1.invoiceId = inv1Id;
          const pay1Result = await tx.insert(payments).values(payment1).returning();
          resData.payment1Id = pay1Result[0]?.id;
        }
      }
      
      // 4. Insert Invoice 2
      if (invoice2) {
        invoice2.contractId = contractId;
        const inv2Result = await tx.insert(invoices).values(invoice2).returning();
        const inv2Id = inv2Result[0]?.id;
        resData.invoice2Id = inv2Id;
        
        // 5. Insert Payment 2
        if (payment2) {
          payment2.invoiceId = inv2Id;
          const pay2Result = await tx.insert(payments).values(payment2).returning();
          resData.payment2Id = pay2Result[0]?.id;
        }
      }
      
      return resData;
    });
    
    res.json(result);
  } catch (e: any) {
    console.error('Transaction failed:', e);
    res.status(500).json({ error: e.message });
  }
});
`;

code = code.replace("export default router;", completeBlock + "\nexport default router;");
fs.writeFileSync('src/routes/api.ts', code);
console.log("Success");
