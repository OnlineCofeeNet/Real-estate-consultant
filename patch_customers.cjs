const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

const regexStatus = /return \{\n\s*hasUncollectedCheque,\n\s*hasDebt,\n\s*debtAmount: customer\.debtAmount,\n\s*isLandlord,\n\s*isBuyer,\n\s*\};/;
const replacementStatus = `// 5. Total transactions & Last contract date
    let totalTransactionAmount = 0;
    let lastContractDate = '';
    customerContracts.forEach(c => {
      totalTransactionAmount += (c.totalPayable || 0);
      if (!lastContractDate || (c.date && c.date > lastContractDate)) {
        lastContractDate = c.date || '';
      }
    });

    return {
      hasUncollectedCheque,
      hasDebt,
      debtAmount: customer.debtAmount,
      isLandlord,
      isBuyer,
      totalTransactionAmount,
      lastContractDate
    };`;

code = code.replace(regexStatus, replacementStatus);

fs.writeFileSync('src/pages/Customers.tsx', code);
