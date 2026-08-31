const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const brokenCode = `    const party2Cheque = normalizeSearchQuery(c.party2ChequeDate);

  const totalPages = Math.ceil((filteredContracts.length || 1) / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentListIds = paginatedContracts.map(c => c.id!).filter(Boolean);
  const isAllSelected = currentListIds.length > 0 && currentListIds.every(id => selectedContracts.has(id));
  return (
      contractNum.includes(query) ||`;

const fixedCode = `    const party2Cheque = normalizeSearchQuery(c.party2ChequeDate);

    return (
      contractNum.includes(query) ||`;

code = code.replace(brokenCode, fixedCode);

const paginationCode = `
  const totalPages = Math.ceil((filteredContracts.length || 1) / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentListIds = paginatedContracts.map(c => c.id!).filter(Boolean);
  const isAllSelected = currentListIds.length > 0 && currentListIds.every(id => selectedContracts.has(id));

  return (
    <div className="space-y-6 pb-24">`;

code = code.replace(`  return (
    <div className="space-y-6 pb-24">`, paginationCode);

fs.writeFileSync('src/pages/Contracts.tsx', code);
