import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import axios from 'axios';
import FormData from 'form-data';
import { createServer as createViteServer } from 'vite';

// Paths for caching settings and registered bot users on disk
const SETTINGS_FILE = path.join(process.cwd(), 'bot-settings.json');
const BOT_USERS_FILE = path.join(process.cwd(), 'bot-users.json');

// Digits and phone normalization
function normalizeDigits(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .trim();
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  let p = normalizeDigits(phone).replace(/\D/g, '');
  if (p.startsWith('98') && p.length === 12) {
    p = '0' + p.slice(2);
  } else if (p.length === 10 && p.startsWith('9')) {
    p = '0' + p;
  }
  return p;
}

function cleanToken(token: string): string {
  if (!token) return '';
  let t = token.trim();
  // Strip duplicate 'bot' prefix if user mistakenly entered bot12345:ABC
  if (t.toLowerCase().startsWith('bot') && t.includes(':')) {
    t = t.slice(3);
  }
  return t;
}

// ----------------------------------------------------
// BOT USERS REGISTRY
// ----------------------------------------------------
export interface BotUser {
  chatId: string;
  platform: 'telegram' | 'bale' | 'rubika';
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  lastActive: number;
}

let botUsers: BotUser[] = [];
try {
  if (fs.existsSync(BOT_USERS_FILE)) {
    botUsers = JSON.parse(fs.readFileSync(BOT_USERS_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not load bot users registry:', e);
}

function saveBotUsers() {
  try {
    fs.writeFileSync(BOT_USERS_FILE, JSON.stringify(botUsers, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save bot users to disk:', e);
  }
}

function recordBotUser(userData: Omit<BotUser, 'lastActive'>) {
  const normPhone = userData.phone ? normalizePhone(userData.phone) : undefined;
  const normUsername = userData.username ? userData.username.replace(/^@/, '').toLowerCase().trim() : undefined;
  const cleanChatId = normalizeDigits(String(userData.chatId));

  const existingIdx = botUsers.findIndex(u => u.platform === userData.platform && u.chatId === cleanChatId);
  const updatedUser: BotUser = {
    chatId: cleanChatId,
    platform: userData.platform,
    username: normUsername || (existingIdx >= 0 ? botUsers[existingIdx].username : undefined),
    phone: normPhone || (existingIdx >= 0 ? botUsers[existingIdx].phone : undefined),
    firstName: userData.firstName || (existingIdx >= 0 ? botUsers[existingIdx].firstName : undefined),
    lastName: userData.lastName || (existingIdx >= 0 ? botUsers[existingIdx].lastName : undefined),
    fullName: userData.fullName || (existingIdx >= 0 ? botUsers[existingIdx].fullName : undefined),
    lastActive: Date.now()
  };

  if (existingIdx >= 0) {
    botUsers[existingIdx] = updatedUser;
  } else {
    botUsers.unshift(updatedUser);
  }
  saveBotUsers();
}

function findUserByPhone(phone: string, platform?: string): BotUser | undefined {
  const norm = normalizePhone(phone);
  if (!norm) return undefined;
  return botUsers.find(u => (!platform || u.platform === platform) && u.phone && normalizePhone(u.phone) === norm);
}

function findUserByUsername(username: string, platform?: string): BotUser | undefined {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  if (!clean) return undefined;
  return botUsers.find(u => (!platform || u.platform === platform) && u.username && u.username.toLowerCase() === clean);
}

function resolveChatId(rawChatId: string | number, platform: string): {
  resolvedId: string | null;
  effectivePlatform: string;
  resolutionReason?: string;
} {
  if (!rawChatId) return { resolvedId: null, effectivePlatform: platform };
  const cleaned = normalizeDigits(String(rawChatId)).trim();
  const withoutAt = cleaned.replace(/^@/, '').toLowerCase().trim();

  // 1. Direct match by registered Chat ID across botUsers
  const matchedById = botUsers.find(u => u.chatId === cleaned);
  if (matchedById) {
    const platName = matchedById.platform === 'telegram' ? 'تلگرام' : matchedById.platform === 'rubika' ? 'روبیکا' : 'بله';
    return {
      resolvedId: matchedById.chatId,
      effectivePlatform: matchedById.platform,
      resolutionReason: `یافت شده از کاربران متصل ${platName} (${matchedById.fullName || matchedById.username || matchedById.chatId})`
    };
  }

  // 2. Direct match by username
  if (withoutAt) {
    let matchedByUsername = findUserByUsername(withoutAt, platform);
    if (!matchedByUsername) {
      matchedByUsername = findUserByUsername(withoutAt);
    }
    if (matchedByUsername) {
      const platName = matchedByUsername.platform === 'telegram' ? 'تلگرام' : matchedByUsername.platform === 'rubika' ? 'روبیکا' : 'بله';
      return {
        resolvedId: matchedByUsername.chatId,
        effectivePlatform: matchedByUsername.platform,
        resolutionReason: `یافت شده از نام کاربری @${matchedByUsername.username} در ${platName}`
      };
    }
  }

  // 3. Check if it's a phone number (09..., +98..., 98..., 9...)
  const normPhone = normalizePhone(cleaned);
  if (normPhone && normPhone.startsWith('09') && normPhone.length === 11) {
    let matchedByPhone = findUserByPhone(normPhone, platform);
    if (!matchedByPhone) {
      matchedByPhone = findUserByPhone(normPhone);
    }
    if (matchedByPhone) {
      const platName = matchedByPhone.platform === 'telegram' ? 'تلگرام' : matchedByPhone.platform === 'rubika' ? 'روبیکا' : 'بله';
      return {
        resolvedId: matchedByPhone.chatId,
        effectivePlatform: matchedByPhone.platform,
        resolutionReason: `یافت شده از شماره همراه ${normPhone} (${matchedByPhone.fullName || matchedByPhone.phone}) در ${platName}`
      };
    }
    const platName = platform === 'telegram' ? 'تلگرام' : platform === 'rubika' ? 'روبیکا' : 'بله';
    return {
      resolvedId: null,
      effectivePlatform: platform,
      resolutionReason: `شماره ${normPhone} هنوز در ربات ${platName} استارت نزده است. برای اتصال، کاربر کافیست دکمه /start را در ربات بزند.`
    };
  }

  // 4. If it's a negative or standard numeric ID (e.g. 123456789 or -100123456789 for groups)
  if (/^-?\d+$/.test(cleaned)) {
    return {
      resolvedId: cleaned,
      effectivePlatform: platform
    };
  }

  // 5. If it's a Rubika chat ID / GUID (e.g. b0..., u0..., c0..., g0... or alphanumeric identifier)
  if (platform === 'rubika' && /^[a-zA-Z0-9_-]{8,}$/.test(cleaned)) {
    return {
      resolvedId: cleaned,
      effectivePlatform: 'rubika'
    };
  }

  // 6. If it's a public channel or public supergroup (starts with @ and no spaces)
  if ((platform === 'telegram' || platform === 'rubika') && cleaned.startsWith('@') && !cleaned.includes(' ')) {
    return {
      resolvedId: cleaned,
      effectivePlatform: platform
    };
  }

  const platName = platform === 'telegram' ? 'تلگرام' : platform === 'rubika' ? 'روبیکا' : 'بله';
  return {
    resolvedId: null,
    effectivePlatform: platform,
    resolutionReason: `کاربر «${cleaned}» تاکنون در ربات ${platName} دکمه /start را نزده است. طبق قوانین پیام‌رسان‌ها، ربات‌ها اجازه شروع مکالمه بدون استارت کاربر را ندارند.`
  };
}

// ----------------------------------------------------
// SETTINGS PERSISTENCE
// ----------------------------------------------------
let cachedSettings: any = null;
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not load cached bot settings:', e);
}

function saveCachedSettings(settings: any) {
  cachedSettings = settings;
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save bot settings to disk:', e);
  }
}

function getAgencySignature(settings: any): string {
  if (!settings) return '';
  const lines: string[] = [];
  lines.push('────────────────────────');
  if (settings.agencyName) {
    lines.push(`🏢 ${settings.agencyName}${settings.slogan ? ` (${settings.slogan})` : ''}`);
  }
  
  const allPhones = [settings.phone1, ...(settings.additionalPhones || [])].filter((p: any) => Boolean(p && String(p).trim()));
  if (allPhones.length > 0) {
    lines.push(`📞 تلفن تماس: ${allPhones.join(' - ')}`);
  }

  if (settings.address) {
    lines.push(`📍 آدرس: ${settings.address}`);
  }

  const socials: string[] = [];
  if (settings.telegramAgencyId) socials.push(`تلگرام: ${settings.telegramAgencyId}`);
  if (settings.baleAgencyId) socials.push(`بله: ${settings.baleAgencyId}`);
  if (settings.rubikaAgencyId) socials.push(`روبیکا: ${settings.rubikaAgencyId}`);
  if (settings.instagramAgencyId) socials.push(`اینستاگرام: ${settings.instagramAgencyId}`);
  
  if (socials.length > 0) {
    lines.push(`🌐 راه‌های ارتباطی:\n   ${socials.join('\n   ')}`);
  }

  return lines.join('\n');
}

function buildWelcomeMessage(settings: any, fromName: string = 'کاربر گرامی', chatId?: string | number): string {
  const raw = settings?.defaultMessages?.welcome || 
    'سلام 🌹\nبه سامانه هوشمند اطلاع‌رسانی {نام_املاک} خوش آمدید.\n\nجهت استفاده از خدمات ربات، دریافت صورتحساب‌ها، فاکتورها و دسترسی به اطلاعات قراردادها در خدمت شما هستیم.';
  
  const formatted = raw
    .replace(/{نام_املاک}/g, settings?.agencyName || 'مشاور املاک')
    .replace(/{نام_مشتری}/g, fromName)
    .replace(/{تلفن_املاک}/g, settings?.phone1 || '')
    .replace(/{آدرس_املاک}/g, settings?.address || '');

  const idSection = chatId ? `\n\n📌 شناسه عددی چت شما (Chat ID): ${chatId}\n(از این شناسه برای ثبت در سیستم مشاور املاک می‌توانید استفاده فرمایید)` : '';
  const sig = getAgencySignature(settings);
  const bodyWithId = `${formatted.trim()}${idSection}`;
  return sig ? `${bodyWithId}\n\n${sig}` : bodyWithId;
}

// ----------------------------------------------------
// MESSAGE SENDER HELPERS (CHUNKED & RETRYABLE)
// ----------------------------------------------------
async function sendTextMessage(platform: 'telegram' | 'bale', token: string, chatId: string, text: string) {
  const cleanTok = cleanToken(token);
  const baseUrl = platform === 'telegram' ? 'https://api.telegram.org' : 'https://tapi.bale.ai';

  // Telegram text limit is 4096. Bale limit is 4000. Chunk if needed.
  const MAX_LEN = 3900;
  if (text.length <= MAX_LEN) {
    await axios.post(`${baseUrl}/bot${cleanTok}/sendMessage`, {
      chat_id: chatId,
      text: text
    }, { timeout: 15000 });
    return;
  }

  // Split into chunks by newline or length
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', MAX_LEN);
    if (splitIdx < 1000) splitIdx = MAX_LEN;
    chunks.push(remaining.substring(0, splitIdx));
    remaining = remaining.substring(splitIdx).trim();
  }

  for (const chunk of chunks) {
    await axios.post(`${baseUrl}/bot${cleanTok}/sendMessage`, {
      chat_id: chatId,
      text: chunk
    }, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 200));
  }
}

async function sendPhotoMessage(
  platform: 'telegram' | 'bale',
  token: string,
  chatId: string,
  imageBase64: string,
  captionText: string
) {
  const cleanTok = cleanToken(token);
  const baseUrl = platform === 'telegram' ? 'https://api.telegram.org' : 'https://tapi.bale.ai';

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', buffer, { filename: 'invoice.png' });

    // Telegram and Bale limit captions strictly to 1024 characters!
    const MAX_CAPTION = 1000;
    if (captionText.length <= MAX_CAPTION) {
      form.append('caption', captionText);
      await axios.post(`${baseUrl}/bot${cleanTok}/sendPhoto`, form, {
        headers: form.getHeaders(),
        timeout: 20000
      });
    } else {
      // Send photo with concise summary caption, then follow up with full message
      const shortCaption = `🏢 ${cachedSettings?.agencyName || 'مشاور املاک'}\nسند و فاکتور پیوست شده:\n(متن کامل در پیام بعد ارسال شد)`;
      form.append('caption', shortCaption);
      await axios.post(`${baseUrl}/bot${cleanTok}/sendPhoto`, form, {
        headers: form.getHeaders(),
        timeout: 20000
      });

      // Send the full text as follow-up
      await sendTextMessage(platform, token, chatId, captionText);
    }
  } catch (photoErr: any) {
    console.log('sendPhoto notice, automatically falling back to text message:', photoErr?.response?.data?.description || photoErr.message);
    // Graceful fallback: Deliver message text so invoice or reminder is never lost
    await sendTextMessage(platform, token, chatId, captionText);
  }
}

// ----------------------------------------------------
// TELEGRAM POLLING CONTROLLER
// ----------------------------------------------------
let telegramPollingActive = false;
let currentTelegramToken = '';
let lastTelegramUpdateId = 0;

async function handleTelegramUpdate(token: string, update: any) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const text = (msg.text || '').trim();
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'کاربر گرامی';
  const cleanChatId = String(chatId);

  // Register or update user in registry
  recordBotUser({
    chatId: cleanChatId,
    platform: 'telegram',
    username: msg.from?.username,
    phone: msg.contact?.phone_number,
    firstName: msg.from?.first_name,
    lastName: msg.from?.last_name,
    fullName: fromName
  });

  const replyMarkup = {
    keyboard: [
      [{ text: '📱 ارسال شماره تماس جهت استعلام قراردادها', request_contact: true }],
      [{ text: '📇 کارت ویزیت مشاور املاک' }, { text: '🏢 اطلاعات تماس و آدرس املاک' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  try {
    // 1. /start command
    if (text.startsWith('/start')) {
      const welcomeText = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: welcomeText,
        reply_markup: replyMarkup
      });
      return;
    }

    // 2. User shared contact number
    if (msg.contact) {
      const rawPhone = msg.contact.phone_number;
      const normPhone = normalizePhone(rawPhone);
      recordBotUser({
        chatId: cleanChatId,
        platform: 'telegram',
        username: msg.from?.username,
        phone: normPhone,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        fullName: fromName
      });

      const ack = `جناب/سرکار ${fromName}،\nشماره تماس شما (${normPhone}) با موفقیت در سامانه ${cachedSettings?.agencyName || 'مشاور املاک'} متصل شد.\n\n📌 شناسه عددی چت شما: ${cleanChatId}\nاز این پس صورتحساب‌ها، فاکتورها و موعد قراردادهای شما مستقیماً از طریق همین ربات برای شما ارسال می‌گردد.`;
      const fullAck = getAgencySignature(cachedSettings) ? `${ack}\n\n${getAgencySignature(cachedSettings)}` : ack;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: fullAck,
        reply_markup: replyMarkup
      });
      return;
    }

    // 3. User requested Business Card
    if (text === '📇 کارت ویزیت مشاور املاک') {
      const rawCard = cachedSettings?.defaultMessages?.businessCard || 
        `مشاور املاک تخصصی ${cachedSettings?.agencyName || ''}. جهت کسب اطلاعات بیشتر با ما در ارتباط باشید.`;
      const cardText = rawCard
        .replace(/{نام_املاک}/g, cachedSettings?.agencyName || '')
        .replace(/{phone1}/g, cachedSettings?.phone1 || '')
        .replace(/{تلفن_املاک}/g, cachedSettings?.phone1 || '');
      const fullCard = getAgencySignature(cachedSettings) ? `${cardText}\n\n${getAgencySignature(cachedSettings)}` : cardText;

      if (cachedSettings?.logoBase64) {
        try {
          await sendPhotoMessage('telegram', token, cleanChatId, cachedSettings.logoBase64, fullCard);
          return;
        } catch (err) {
          // fallback to text
        }
      }

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: fullCard,
        reply_markup: replyMarkup
      });
      return;
    }

    // 4. User requested Agency Info
    if (text === '🏢 اطلاعات تماس و آدرس املاک') {
      const infoText = `اطلاعات و راه‌های ارتباطی با مشاور املاک:\n\n${getAgencySignature(cachedSettings) || 'اطلاعات املاک ثبت نشده است.'}`;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: infoText,
        reply_markup: replyMarkup
      });
      return;
    }

    // 5. Default reply for any other message: send the configured welcome message
    const defaultReply = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: defaultReply,
      reply_markup: replyMarkup
    });
  } catch (err: any) {
    console.log('Notice handling Telegram update:', err?.response?.data?.description || err.message);
  }
}

async function startTelegramPolling(token: string) {
  const cleanTok = cleanToken(token);
  if (!cleanTok) return;
  
  if (currentTelegramToken === cleanTok && telegramPollingActive) {
    return; // Already polling
  }

  telegramPollingActive = false;
  currentTelegramToken = cleanTok;
  await new Promise(r => setTimeout(r, 600));

  // Delete any old webhook to avoid conflicts
  try {
    await axios.post(`https://api.telegram.org/bot${cleanTok}/deleteWebhook`, {
      drop_pending_updates: false
    });
    console.log('Telegram webhook verified clear.');
  } catch (e: any) {
    console.log('Notice: deleteWebhook response:', e?.response?.data?.description || e.message);
  }

  telegramPollingActive = true;
  console.log(`Starting Telegram polling for token [${cleanTok.slice(0, 8)}...]`);

  // Background polling loop
  (async () => {
    while (telegramPollingActive && currentTelegramToken === cleanTok) {
      try {
        const res = await axios.post(`https://api.telegram.org/bot${cleanTok}/getUpdates`, {
          offset: lastTelegramUpdateId + 1,
          timeout: 12
        }, { timeout: 20000 });

        if (res.data?.ok && Array.isArray(res.data.result)) {
          for (const update of res.data.result) {
            if (update.update_id > lastTelegramUpdateId) {
              lastTelegramUpdateId = update.update_id;
            }
            await handleTelegramUpdate(cleanTok, update);
          }
        }
      } catch (err: any) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  })();
}

// ----------------------------------------------------
// BALE POLLING CONTROLLER
// ----------------------------------------------------
let balePollingActive = false;
let currentBaleToken = '';
let lastBaleUpdateId = 0;

async function handleBaleUpdate(token: string, update: any) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const text = (msg.text || '').trim();
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || 'کاربر گرامی';
  const cleanChatId = String(chatId);

  // Record user in registry
  recordBotUser({
    chatId: cleanChatId,
    platform: 'bale',
    username: msg.from?.username,
    phone: msg.contact?.phone_number,
    firstName: msg.from?.first_name,
    lastName: msg.from?.last_name,
    fullName: fromName
  });

  const replyMarkup = {
    keyboard: [
      [{ text: '📱 ارسال شماره تماس جهت استعلام قراردادها', request_contact: true }],
      [{ text: '📇 کارت ویزیت مشاور املاک' }, { text: '🏢 اطلاعات تماس و آدرس املاک' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  try {
    if (text.startsWith('/start')) {
      const welcomeText = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
      await axios.post(`https://tapi.bale.ai/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: welcomeText,
        reply_markup: replyMarkup
      });
      return;
    }

    if (msg.contact) {
      const rawPhone = msg.contact.phone_number;
      const normPhone = normalizePhone(rawPhone);
      recordBotUser({
        chatId: cleanChatId,
        platform: 'bale',
        username: msg.from?.username,
        phone: normPhone,
        firstName: msg.from?.first_name,
        lastName: msg.from?.last_name,
        fullName: fromName
      });

      const ack = `جناب/سرکار ${fromName}،\nشماره تماس شما (${normPhone}) با موفقیت در سامانه بله ${cachedSettings?.agencyName || 'مشاور املاک'} ثبت شد.\n\n📌 شناسه عددی شما: ${cleanChatId}\nاز این پس پیام‌ها و فاکتورهای شما از همین طریق ارسال خواهد شد.`;
      const fullAck = getAgencySignature(cachedSettings) ? `${ack}\n\n${getAgencySignature(cachedSettings)}` : ack;
      await axios.post(`https://tapi.bale.ai/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: fullAck,
        reply_markup: replyMarkup
      });
      return;
    }

    if (text === '📇 کارت ویزیت مشاور املاک') {
      const rawCard = cachedSettings?.defaultMessages?.businessCard || 
        `مشاور املاک تخصصی ${cachedSettings?.agencyName || ''}. جهت کسب اطلاعات بیشتر با ما در ارتباط باشید.`;
      const cardText = rawCard
        .replace(/{نام_املاک}/g, cachedSettings?.agencyName || '')
        .replace(/{phone1}/g, cachedSettings?.phone1 || '')
        .replace(/{تلفن_املاک}/g, cachedSettings?.phone1 || '');
      const fullCard = getAgencySignature(cachedSettings) ? `${cardText}\n\n${getAgencySignature(cachedSettings)}` : cardText;

      await axios.post(`https://tapi.bale.ai/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: fullCard,
        reply_markup: replyMarkup
      });
      return;
    }

    if (text === '🏢 اطلاعات تماس و آدرس املاک') {
      const infoText = `اطلاعات و راه‌های ارتباطی با مشاور املاک:\n\n${getAgencySignature(cachedSettings) || 'اطلاعات املاک ثبت نشده است.'}`;
      await axios.post(`https://tapi.bale.ai/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: infoText,
        reply_markup: replyMarkup
      });
      return;
    }

    // Default reply
    const defaultReply = buildWelcomeMessage(cachedSettings, fromName, cleanChatId);
    await axios.post(`https://tapi.bale.ai/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: defaultReply,
      reply_markup: replyMarkup
    });
  } catch (err: any) {
    console.log('Notice handling Bale update:', err?.response?.data?.description || err.message);
  }
}

async function startBalePolling(token: string) {
  const cleanTok = cleanToken(token);
  if (!cleanTok) return;

  if (currentBaleToken === cleanTok && balePollingActive) {
    return;
  }

  balePollingActive = false;
  currentBaleToken = cleanTok;
  await new Promise(r => setTimeout(r, 600));

  balePollingActive = true;
  console.log(`Starting Bale polling for token [${cleanTok.slice(0, 8)}...]`);

  (async () => {
    while (balePollingActive && currentBaleToken === cleanTok) {
      try {
        const res = await axios.post(`https://tapi.bale.ai/bot${cleanTok}/getUpdates`, {
          offset: lastBaleUpdateId + 1,
          limit: 10
        }, { timeout: 15000 });

        if (res.data?.ok && Array.isArray(res.data.result)) {
          for (const update of res.data.result) {
            if (update.update_id > lastBaleUpdateId) {
              lastBaleUpdateId = update.update_id;
            }
            await handleBaleUpdate(cleanTok, update);
          }
        }
      } catch (err: any) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  })();
}

// ----------------------------------------------------
// RUBIKA POLLING CONTROLLER
// ----------------------------------------------------
let rubikaPollingActive = false;
let currentRubikaToken = '';
let lastRubikaOffsetId = '';

async function handleRubikaUpdate(token: string, update: any) {
  const chatId = update.chat_id;
  if (!chatId) return;

  const cleanChatId = String(chatId);
  const msgText = (update.new_message?.text || '').trim();
  const senderId = update.new_message?.sender_id;

  // Record user in registry
  recordBotUser({
    chatId: cleanChatId,
    platform: 'rubika',
    username: senderId,
    fullName: 'کاربر روبیکا'
  });

  try {
    if (msgText.startsWith('/start') || update.type === 'StartedBot') {
      const welcomeText = buildWelcomeMessage(cachedSettings, 'کاربر گرامی روبیکا', cleanChatId);
      await axios.post(`https://botapi.rubika.ir/v3/${token}/sendMessage`, {
        chat_id: cleanChatId,
        text: welcomeText
      }, { timeout: 10000 });
    }
  } catch (err: any) {
    console.log('Notice handling Rubika update:', err?.response?.data || err.message);
  }
}

async function startRubikaPolling(token: string) {
  const cleanTok = cleanToken(token);
  if (!cleanTok) return;

  if (currentRubikaToken === cleanTok && rubikaPollingActive) {
    return;
  }

  rubikaPollingActive = false;
  currentRubikaToken = cleanTok;
  await new Promise(r => setTimeout(r, 600));

  rubikaPollingActive = true;
  console.log(`Starting Rubika polling for token [${cleanTok.slice(0, 8)}...]`);

  (async () => {
    while (rubikaPollingActive && currentRubikaToken === cleanTok) {
      try {
        const payload: any = { limit: 10 };
        if (lastRubikaOffsetId) {
          payload.offset_id = lastRubikaOffsetId;
        }
        const res = await axios.post(`https://botapi.rubika.ir/v3/${cleanTok}/getUpdates`, payload, { timeout: 15000 });

        if (res.data?.status === 'OK' && Array.isArray(res.data.data?.updates)) {
          for (const update of res.data.data.updates) {
            await handleRubikaUpdate(cleanTok, update);
          }
          if (res.data.data.next_offset_id) {
            lastRubikaOffsetId = res.data.data.next_offset_id;
          }
        }
      } catch (err: any) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  })();
}

// ----------------------------------------------------
// EXPRESS SERVER & API ROUTES
// ----------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize bot listeners
  if (cachedSettings?.telegramToken) {
    startTelegramPolling(cachedSettings.telegramToken).catch(err => console.warn('Telegram polling init notice:', err.message));
  }
  if (cachedSettings?.baleToken) {
    startBalePolling(cachedSettings.baleToken).catch(err => console.warn('Bale polling init notice:', err.message));
  }
  if (cachedSettings?.rubikaToken) {
    startRubikaPolling(cachedSettings.rubikaToken).catch(err => console.warn('Rubika polling init notice:', err.message));
  }

  // API Route: Send message (Push from App to Client)
  app.post('/api/send-message', async (req, res) => {
    let { platform, token, chatId, message, text, imageBase64 } = req.body;
    const finalMessage = (message || text || '').trim();
    let cleanTok = cleanToken(token);

    if (!chatId || !finalMessage) {
      return res.status(200).json({ 
        success: false,
        ok: false,
        error: 'اطلاعات ناقص است', 
        details: 'شناسه چت و متن پیام الزامی می‌باشند.'
      });
    }

    // Resolve Chat ID and detect effective platform (e.g. converts username or phone into numeric Chat ID if registered)
    const { resolvedId, effectivePlatform, resolutionReason } = resolveChatId(chatId, platform);
    if (!resolvedId) {
      console.log(`Unresolved chat ID notice for ${platform}: [${chatId}] - ${resolutionReason}`);
      return res.status(200).json({
        success: false,
        ok: false,
        error: 'شناسه چت قابل استفاده نیست',
        details: resolutionReason || `ارسال مستقیم به «${chatId}» امکان‌پذیر نیست. مخاطب باید حداقل یک‌بار در ربات دکمه /start را زده باشد یا شناسه عددی (Chat ID) او ثبت شود.`
      });
    }

    // If target user is detected on another platform (e.g. registered on Bale while request was marked Telegram):
    let targetPlatform = platform;
    if (effectivePlatform && effectivePlatform !== platform) {
      if (effectivePlatform === 'bale' && cachedSettings?.baleToken) {
        targetPlatform = 'bale';
        cleanTok = cleanToken(cachedSettings.baleToken);
      } else if (effectivePlatform === 'telegram' && cachedSettings?.telegramToken) {
        targetPlatform = 'telegram';
        cleanTok = cleanToken(cachedSettings.telegramToken);
      } else if (effectivePlatform === 'rubika' && cachedSettings?.rubikaToken) {
        targetPlatform = 'rubika';
        cleanTok = cleanToken(cachedSettings.rubikaToken);
      }
    }

    // Fallback to cached token if not supplied
    if (!cleanTok) {
      if (targetPlatform === 'telegram' && cachedSettings?.telegramToken) {
        cleanTok = cleanToken(cachedSettings.telegramToken);
      } else if (targetPlatform === 'bale' && cachedSettings?.baleToken) {
        cleanTok = cleanToken(cachedSettings.baleToken);
      } else if (targetPlatform === 'rubika' && cachedSettings?.rubikaToken) {
        cleanTok = cleanToken(cachedSettings.rubikaToken);
      }
    }

    if (!cleanTok) {
      const platName = targetPlatform === 'bale' ? 'بله' : targetPlatform === 'rubika' ? 'روبیکا' : 'تلگرام';
      return res.status(200).json({
        success: false,
        ok: false,
        error: `توکن ربات ${platName} تنظیم نشده است`,
        details: 'لطفاً ابتدا در بخش تنظیمات، توکن ربات مربوطه را ثبت فرمایید.'
      });
    }

    try {
      if (targetPlatform === 'telegram' || targetPlatform === 'bale') {
        if (imageBase64) {
          await sendPhotoMessage(targetPlatform, cleanTok, resolvedId, imageBase64, finalMessage);
        } else {
          await sendTextMessage(targetPlatform, cleanTok, resolvedId, finalMessage);
        }
      } else if (targetPlatform === 'rubika') {
        const rubikaRes = await axios.post(`https://botapi.rubika.ir/v3/${cleanTok}/sendMessage`, {
          chat_id: resolvedId,
          text: finalMessage
        }, { timeout: 15000 });

        if (rubikaRes.data?.status !== 'OK') {
          const st = rubikaRes.data?.status || 'خطا در ارسال پیام روبیکا';
          if (st === 'INVALID_INPUT') {
            throw new Error('INVALID_INPUT: شناسه چت در روبیکا نامعتبر است یا مخاطب هنوز در ربات روبیکا /start نزده است.');
          }
          throw new Error(`خطای روبیکا: ${st}`);
        }
      } else {
        return res.status(200).json({ success: false, ok: false, error: 'پلتفرم پشتیبانی نشده است' });
      }

      res.json({
        success: true,
        ok: true,
        resolvedChatId: resolvedId,
        actualPlatform: targetPlatform,
        resolutionReason
      });
    } catch (error: any) {
      const apiData = error?.response?.data;
      const desc = apiData?.description || error.message || '';
      console.log(`Bot message notice (${targetPlatform}): ${desc}`);

      let friendlyError = 'خطا در ارسال پیام';

      if (desc.includes('chat not found') || desc.includes('no such group or user') || desc.includes('PEER_ID_INVALID') || desc.includes('INVALID_INPUT')) {
        const platName = targetPlatform === 'bale' ? 'بله' : targetPlatform === 'rubika' ? 'روبیکا' : 'تلگرام';
        friendlyError = `شناسه چت یافت نشد (کاربر هنوز در ربات ${platName} /start نزده است)`;
      } else if (desc.includes('MEDIA_CAPTION_TOO_LONG')) {
        friendlyError = 'متن توضیحات تصویر بیش از حد مجاز است';
      } else if (desc.includes('bot was blocked by the user')) {
        friendlyError = 'ربات توسط این کاربر مسدود (Block) شده است';
      } else if (desc.includes('user is deactivated')) {
        friendlyError = 'حساب کاربری مخاطب غیرفعال شده است';
      } else if (desc.includes('Unauthorized') || desc.includes('Not Found')) {
        friendlyError = 'توکن ربات نامعتبر است. لطفاً توکن را در تنظیمات بررسی فرمایید.';
      }

      res.status(200).json({
        success: false,
        ok: false,
        error: friendlyError,
        details: desc
      });
    }
  });

  // API Route: Connected Bot Users list
  app.get('/api/bot/connected-users', (req, res) => {
    res.json({
      success: true,
      users: botUsers.slice(0, 50)
    });
  });

  // API Route: Register or link a Bot User manually
  app.post('/api/bot/register-user', (req, res) => {
    try {
      const { chatId, platform, phone, fullName, username } = req.body;
      if (!chatId) {
        return res.status(200).json({ success: false, error: 'شناسه چت الزامی است' });
      }
      const cleanId = normalizeDigits(String(chatId)).trim();
      const cleanPlatform = (platform === 'bale' ? 'bale' : platform === 'rubika' ? 'rubika' : 'telegram') as 'telegram' | 'bale' | 'rubika';
      const cleanPhone = phone ? normalizePhone(phone) : undefined;
      const cleanUsername = username ? String(username).replace(/^@/, '').trim() : undefined;

      const existingIdx = botUsers.findIndex(u => u.chatId === cleanId && u.platform === cleanPlatform);
      const userObj: BotUser = {
        chatId: cleanId,
        platform: cleanPlatform,
        username: cleanUsername,
        phone: cleanPhone,
        fullName: fullName ? String(fullName).trim() : (cleanUsername || 'کاربر ثبت شده'),
        lastActive: Date.now()
      };

      if (existingIdx >= 0) {
        botUsers[existingIdx] = { ...botUsers[existingIdx], ...userObj };
      } else {
        botUsers.unshift(userObj);
      }

      saveBotUsers();
      res.json({ success: true, user: userObj });
    } catch (e: any) {
      console.warn('Error registering user manually:', e.message);
      res.status(200).json({ success: false, error: e.message });
    }
  });

  // API Route: Sync Settings from React to Server & Restart Bot Polling
  app.post('/api/bot/sync-settings', async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings) {
        return res.json({ success: false, error: 'No settings provided' });
      }

      saveCachedSettings(settings);

      if (settings.telegramToken && settings.telegramToken.trim()) {
        startTelegramPolling(settings.telegramToken).catch(err => console.log('Telegram restart notice:', err.message));
      }
      if (settings.baleToken && settings.baleToken.trim()) {
        startBalePolling(settings.baleToken).catch(err => console.log('Bale restart notice:', err.message));
      }
      if (settings.rubikaToken && settings.rubikaToken.trim()) {
        startRubikaPolling(settings.rubikaToken).catch(err => console.log('Rubika restart notice:', err.message));
      }

      res.json({ success: true, message: 'تنظیمات ذخیره و وضعیت ربات‌ها به‌روزرسانی شد' });
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });

  // API Route: Clear Webhook
  app.post('/api/bot/clear-webhook', async (req, res) => {
    try {
      const { token, platform = 'telegram' } = req.body;
      const cleanTok = cleanToken(token);
      if (!cleanTok) {
        return res.json({ success: false, error: 'Token is required' });
      }

      let deleteRes: any = null;
      let webhookInfo: any = null;

      if (platform === 'telegram') {
        try {
          const infoRes = await axios.get(`https://api.telegram.org/bot${cleanTok}/getWebhookInfo`, { timeout: 10000 });
          webhookInfo = infoRes.data?.result;
        } catch (_) {}

        const del = await axios.post(`https://api.telegram.org/bot${cleanTok}/deleteWebhook`, {
          drop_pending_updates: false
        }, { timeout: 10000 });
        deleteRes = del.data;

        // Restart polling right away
        startTelegramPolling(cleanTok).catch(err => console.log('Telegram polling restart notice:', err.message));
      } else if (platform === 'bale') {
        const del = await axios.post(`https://tapi.bale.ai/bot${cleanTok}/deleteWebhook`, {}, { timeout: 10000 });
        deleteRes = del.data;
        startBalePolling(cleanTok).catch(err => console.log('Bale polling restart notice:', err.message));
      }

      res.json({
        success: true,
        message: 'وبهوک قبلی با موفقیت پاکسازی شد و ارتباط مستقیم با سامانه برقرار گردید.',
        previousWebhook: webhookInfo?.url || 'هیچ وبهوکی تنظیم نبوده است',
        telegramResponse: deleteRes
      });
    } catch (err: any) {
      console.log('Clear webhook notice:', err?.response?.data?.description || err.message);
      res.status(200).json({
        success: false,
        error: 'خطا در پاکسازی وبهوک',
        details: err?.response?.data?.description || err.message
      });
    }
  });

  // API Route: Check Bot Status (Supports Telegram, Bale and Rubika)
  app.get('/api/bot/status', async (req, res) => {
    const requestedPlatform = (req.query.platform as string) || 'telegram';
    const token = (req.query.token as string) || (
      requestedPlatform === 'bale'
        ? cachedSettings?.baleToken
        : requestedPlatform === 'rubika'
          ? cachedSettings?.rubikaToken
          : cachedSettings?.telegramToken
    );
    const cleanTok = cleanToken(token);

    if (!cleanTok) {
      return res.json({ configured: false, platform: requestedPlatform });
    }

    try {
      if (requestedPlatform === 'bale') {
        const meRes = await axios.get(`https://tapi.bale.ai/bot${cleanTok}/getMe`, { timeout: 10000 });
        return res.json({
          configured: true,
          platform: 'bale',
          bot: meRes.data?.result,
          pollingActive: balePollingActive && currentBaleToken === cleanTok,
          connectedUsersCount: botUsers.filter(u => u.platform === 'bale').length
        });
      } else if (requestedPlatform === 'rubika') {
        const meRes = await axios.post(`https://botapi.rubika.ir/v3/${cleanTok}/getMe`, {}, { timeout: 10000 });
        if (meRes.data?.status === 'OK') {
          return res.json({
            configured: true,
            platform: 'rubika',
            bot: meRes.data.data?.bot,
            pollingActive: rubikaPollingActive && currentRubikaToken === cleanTok,
            connectedUsersCount: botUsers.filter(u => u.platform === 'rubika').length
          });
        } else {
          return res.json({
            configured: false,
            platform: 'rubika',
            error: meRes.data?.status || 'توکن روبیکا پاسخ معتبر نداد'
          });
        }
      } else {
        const meRes = await axios.get(`https://api.telegram.org/bot${cleanTok}/getMe`, { timeout: 10000 });
        let webhookInfo: any = null;
        try {
          const webhookRes = await axios.get(`https://api.telegram.org/bot${cleanTok}/getWebhookInfo`, { timeout: 10000 });
          webhookInfo = webhookRes.data?.result;
        } catch (_) {}

        return res.json({
          configured: true,
          platform: 'telegram',
          bot: meRes.data?.result,
          webhook: webhookInfo,
          pollingActive: telegramPollingActive && currentTelegramToken === cleanTok,
          connectedUsersCount: botUsers.filter(u => u.platform === 'telegram').length
        });
      }
    } catch (err: any) {
      console.log(`Bot status notice for ${requestedPlatform}:`, err?.response?.data?.description || err.message);
      res.json({
        configured: false,
        platform: requestedPlatform,
        error: err?.response?.data?.description || err.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
