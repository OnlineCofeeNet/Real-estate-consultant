const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

// Replace two </div> before Pagination with one </div>
code = code.replace(/<\/table>\s*<\/div>\s*<\/div>\s*\{\/\* Pagination & Bulk Actions \*\/\}/, '</table>\n            </div>\n\n            {/* Pagination & Bulk Actions */}');

fs.writeFileSync('src/pages/Contracts.tsx', code);
