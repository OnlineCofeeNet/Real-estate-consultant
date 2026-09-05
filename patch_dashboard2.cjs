const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /\{displayedLogs\.slice\(0,\s*15\)\.map\(\(log\) => \{([\s\S]*?)\}\)\}/m;

const replacement = `{displayedLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE).map((log) => {$1})}`;

code = code.replace(regex, replacement);

const footerRegex = /\{displayedLogs\.length > 15 && \([\s\S]*?<\/p>\n\s*\)\}/m;
const footerReplacement = `{displayedLogs.length > LOGS_PER_PAGE && (
              <div className="flex justify-between items-center mt-4 px-2">
                <span className="text-xs text-slate-500">
                  نمایش {toPersianDigits((logPage - 1) * LOGS_PER_PAGE + 1)} تا {toPersianDigits(Math.min(logPage * LOGS_PER_PAGE, displayedLogs.length))} از {toPersianDigits(displayedLogs.length)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-xs disabled:opacity-50"
                  >
                    قبلی
                  </button>
                  <button
                    onClick={() => setLogPage(p => p + 1)}
                    disabled={logPage * LOGS_PER_PAGE >= displayedLogs.length}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-xs disabled:opacity-50"
                  >
                    بعدی
                  </button>
                </div>
              </div>
            )}`;

code = code.replace(footerRegex, footerReplacement);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
