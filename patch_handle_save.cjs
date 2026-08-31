const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const replacement = `  const handleSave = async () => {
    if (!contractData.party1 || !contractData.party2) {
      toast.error('لطفا اطلاعات طرفین را کامل کنید');
      return;
    }
    
    if (!contractData.contractNumber) {
      toast.error('شماره قرارداد الزامی است');
      return;
    }

    try {
      // Check for duplicate contract number
      const existingContract = await db.contracts.where('contractNumber').equals(contractData.contractNumber).first();
      if (existingContract) {
        toast.error('شماره قرارداد وارد شده تکراری است. امکان ثبت دو قرارداد با یک شماره وجود ندارد.');
        return;
      }

      const newId = await db.contracts.add({`;

code = code.replace(`  const handleSave = async () => {
    if (!contractData.party1 || !contractData.party2) {
      toast.error('لطفا اطلاعات طرفین را کامل کنید');
      return;
    }

    try {
      const newId = await db.contracts.add({`, replacement);

fs.writeFileSync('src/pages/Contracts.tsx', code);
