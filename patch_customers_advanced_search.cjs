const fs = require('fs');
let code = fs.readFileSync('src/pages/Customers.tsx', 'utf8');

// 1. Add state variables for advanced search
code = code.replace(
  'const [search, setSearch] = useState("");',
  `const [search, setSearch] = useState("");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");`
);

// 2. Add filtering logic to filteredCustomers
const regexFiltered = /if \(statusFilter === "uncollected_cheque"\)/;
const advancedFilterCode = `if (minAmount) {
      list = list.filter(c => getCustomerStatus(c).totalTransactionAmount >= Number(minAmount));
    }
    if (maxAmount) {
      list = list.filter(c => getCustomerStatus(c).totalTransactionAmount <= Number(maxAmount));
    }
    if (fromDate) {
      list = list.filter(c => {
        const lastDate = getCustomerStatus(c).lastContractDate;
        return lastDate && lastDate >= fromDate;
      });
    }
    if (toDate) {
      list = list.filter(c => {
        const lastDate = getCustomerStatus(c).lastContractDate;
        return lastDate && lastDate <= toDate;
      });
    }

    if (statusFilter === "uncollected_cheque")`;
code = code.replace(regexFiltered, advancedFilterCode);

// 3. Add Advanced Search UI
// First we need to import DatePicker and styles if they aren't imported. But let's check if they are imported.
fs.writeFileSync('src/pages/Customers.tsx', code);
