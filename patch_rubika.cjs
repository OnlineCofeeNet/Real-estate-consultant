const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(msgText\.startsWith\('\/start'\) \|\| update\.type === 'StartedBot'\) \{\s*const welcomeText = buildWelcomeMessage\(cachedSettings, 'کاربر گرامی روبیکا', cleanChatId\);\s*await axios\.post\(\`https:\/\/botapi\.rubika\.ir\/v3\/\$\{token\}\/sendMessage\`,\s*\{\s*chat_id: cleanChatId,\s*text: welcomeText\s*\}\, \{ timeout: 10000 \}\);\s*\}/m;

const replacement = `const greetings = ['سلام', 'درود', 'hi', 'hello', 'start', 'شروع'];
    const lowerText = msgText.toLowerCase().trim();
    const isGreeting = greetings.some(g => lowerText.includes(g));

    if (msgText.startsWith('/start') || update.type === 'StartedBot' || isGreeting) {
      const welcomeText = buildWelcomeMessage(cachedSettings, 'کاربر گرامی روبیکا', cleanChatId);
      await axios.post(\`https://botapi.rubika.ir/v3/\${token}/sendMessage\`, {
        chat_id: cleanChatId,
        text: welcomeText
      }, { timeout: 10000 });
    } else if (msgText) {
      const defaultReply = \`کاربر گرامی روبیکا،\nپیام شما دریافت شد:\n«\${msgText.substring(0, 50)}\${msgText.length > 50 ? '...' : ''}»\n\nجهت استفاده از خدمات، لطفا از گزینه‌های منو استفاده نمایید.\`;
      await axios.post(\`https://botapi.rubika.ir/v3/\${token}/sendMessage\`, {
        chat_id: cleanChatId,
        text: defaultReply
      }, { timeout: 10000 });
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
