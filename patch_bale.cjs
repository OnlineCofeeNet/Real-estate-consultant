const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Default reply\s+const defaultReply = buildWelcomeMessage\(cachedSettings, fromName, cleanChatId\);\s+await axios\.post\(\`https:\/\/tapi\.bale\.ai\/bot\$\{token\}\/sendMessage\`,\s*\{\s*chat_id: chatId,\s*text: defaultReply,\s*reply_markup: replyMarkup\s*\}\);/m;

const replacement = `// Default reply: context-aware response
    const greetings = ['سلام', 'درود', 'hi', 'hello', 'start', 'شروع'];
    const lowerText = text.toLowerCase().trim();
    const isGreeting = greetings.some(g => lowerText.includes(g));
    
    let defaultReply = '';
    if (isGreeting) {
      defaultReply = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
    } else {
      defaultReply = \`کاربر گرامی \${fromName}،\nپیام شما دریافت شد:\n«\${text.substring(0, 50)}\${text.length > 50 ? '...' : ''}»\n\nجهت استفاده از خدمات، لطفا از گزینه‌های منو استفاده نمایید.\`;
    }

    await axios.post(\`https://tapi.bale.ai/bot\${token}/sendMessage\`, {
      chat_id: chatId,
      text: defaultReply,
      reply_markup: replyMarkup
    });`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
