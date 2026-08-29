const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const replacement = `autoSendInvoices: boolean;
  smsProvider?: 'none' | 'farazsms' | 'smsir';
  smsToken?: string;
  smsLineNumber?: string;
  autoSendSmsInvoice?: boolean;
  smsTemplateText?: string;`;

code = code.replace(/autoSendInvoices: boolean;/g, replacement);
fs.writeFileSync('src/types.ts', code);
