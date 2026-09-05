const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "const [logFilter, setLogFilter] = useState<'all' | 'failed' | 'sent'>('all');",
  "const [logFilter, setLogFilter] = useState<'all' | 'failed' | 'sent'>('all');\n  const [logPage, setLogPage] = useState(1);\n  const LOGS_PER_PAGE = 15;"
);

code = code.replace(
  /onClick=\{\(\) => setLogFilter\('all'\)\}/g,
  "onClick={() => { setLogFilter('all'); setLogPage(1); }}"
);
code = code.replace(
  /onClick=\{\(\) => setLogFilter\('failed'\)\}/g,
  "onClick={() => { setLogFilter('failed'); setLogPage(1); }}"
);
code = code.replace(
  /onClick=\{\(\) => setLogFilter\('sent'\)\}/g,
  "onClick={() => { setLogFilter('sent'); setLogPage(1); }}"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
