const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const regex = /welcome:\s*'.*?'/s;
const newWelcome = `welcome: 'سلام 🌹\\nبه سامانه هوشمند اطلاعرسانی {نام_املاک} خوش آمدید.\\n\\nجهت استفاده از خدمات، دریافت صورتحسابها، فاکتورها و دسترسی به اطلاعات قراردادها در خدمت شما هستیم.'`;

code = code.replace(/welcome:\s*'[\\s\\S]*?',\s*birthday/, newWelcome + ',\n    birthday');

fs.writeFileSync('src/pages/Settings.tsx', code);
