const fs = require('fs');
let code = fs.readFileSync('src/pages/Contracts.tsx', 'utf8');

const regex = /سررسید چک: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300">\{toPersianDigits\(contractData.party2ChequeDate\) \|\| 'ثبت نشده'\}<\/span>\n                            <\/p>\n                          <\/div>\n                        \)\}\n                      <\/div>\n                    <\/div>/;

const replacement = `سررسید چک: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300">{toPersianDigits(contractData.party2ChequeDate) || 'ثبت نشده'}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    )}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Contracts.tsx', code);
