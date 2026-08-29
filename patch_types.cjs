const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const regex = /autoSendInvoice: boolean;/;
const replacement = `autoSendInvoice: boolean;
  smsProvider?: 'none' | 'farazsms' | 'smsir';
  smsToken?: string;
  smsLineNumber?: string;
  autoSendSmsInvoice?: boolean;
  smsTemplateText?: string;`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/types.ts', code);
