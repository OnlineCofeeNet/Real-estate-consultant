const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

function patchBotHandler(handlerRegex, platformName) {
  const defaultReplyRegex = /\/\/ 5\. Default reply for any other message: send the configured welcome message\s+const defaultReply = buildWelcomeMessage\(cachedSettings, fromName, cleanChatId\);\s+await axios\.post\(\`([^`]+)\/sendMessage\`,\s*\{\s*chat_id: chatId,\s*text: defaultReply,\s*reply_markup: replyMarkup\s*\}\);/m;
  
  const replacement = `// 5. Default reply for any other message: context-aware response
    const greetings = ['سلام', 'درود', 'hi', 'hello', 'start', 'شروع'];
    const lowerText = text.toLowerCase().trim();
    const isGreeting = greetings.some(g => lowerText.includes(g));
    
    let defaultReply = '';
    if (isGreeting) {
      defaultReply = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
    } else {
      defaultReply = \`کاربر گرامی \${fromName}،\nپیام شما دریافت شد:\n«\${text.substring(0, 50)}\${text.length > 50 ? '...' : ''}»\n\nجهت استفاده از خدمات، لطفا از گزینه‌های منو استفاده نمایید.\`;
    }

    await axios.post(\`$1/sendMessage\`, {
      chat_id: chatId,
      text: defaultReply,
      reply_markup: replyMarkup
    });`;

  code = code.replace(defaultReplyRegex, replacement);
}

// Telegram
patchBotHandler();
// Bale
patchBotHandler();

// Wait, Rubika is different? Let's check Rubika implementation.
fs.writeFileSync('server.ts', code);
