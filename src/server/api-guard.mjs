import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-me');
const originalUse = express.application.use;
const originalGet = express.application.get;
const originalPost = express.application.post;
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const BOT_USERS_FILE = path.join(process.cwd(), 'bot-users.json');
const BOT_SETTINGS_FILE = path.join(process.cwd(), 'bot-settings.json');

function timingSafeEqual(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature || !SECRET) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
    if (!timingSafeEqual(expected, signature)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!data?.sub || !data?.username || !data?.role || !data?.exp || data.exp <= now || data.exp > now + TOKEN_TTL_SECONDS + 60) return null;
    return { id: Number(data.sub), username: String(data.username), role: String(data.role) };
  } catch {
    return null;
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function authGate(req, res, next) {
  const publicPath = req.path.startsWith('/auth/') || req.path.startsWith('/webhook/');
  if (publicPath) return next();

  const raw = req.get('authorization') || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'احراز هویت الزامی است.' });

  // A registered bot identifier must never be silently redirected to another platform.
  if (req.path === '/send-message' && req.body?.platform && req.body?.chatId) {
    const users = readJson(BOT_USERS_FILE, []);
    const platform = String(req.body.platform);
    const input = String(req.body.chatId).replace(/^@/, '').trim().toLowerCase();
    const candidates = users.filter((entry) => String(entry.platform) === platform);
    const crossPlatformMatch = users.some((entry) => {
      if (String(entry.platform) === platform) return false;
      return [entry.chatId, entry.username, entry.phone].filter(Boolean).some((value) => String(value).replace(/^@/, '').trim().toLowerCase() === input);
    });
    const samePlatformMatch = candidates.some((entry) => [entry.chatId, entry.username, entry.phone].filter(Boolean).some((value) => String(value).replace(/^@/, '').trim().toLowerCase() === input));
    if (crossPlatformMatch && !samePlatformMatch) {
      return res.status(409).json({ success: false, error: 'شناسه مخاطب متعلق به پلتفرم دیگری است.' });
    }
  }

  req.user = user;
  return next();
}

// server.ts mounts the DB API first and then registers the bot routes. Wrapping
// that /api mount protects both the DB router and every later /api route.
express.application.use = function patchedUse(...args) {
  if (args[0] === '/api' && typeof args[1] === 'function' && !args[1].__serverApiGuardWrapped) {
    const original = args[1];
    const guarded = function guardedApiMiddleware(req, res, next) {
      return authGate(req, res, (error) => {
        if (error) return next(error);
        return original(req, res, next);
      });
    };
    guarded.__serverApiGuardWrapped = true;
    return originalUse.call(this, '/api', guarded, ...args.slice(2));
  }
  return originalUse.apply(this, args);
};

// Remove the historical silent 50-user cap and make the endpoint support offset/limit.
express.application.get = function patchedGet(pathname, ...handlers) {
  if (pathname === '/api/bot/connected-users' && handlers.length) {
    const originalHandler = handlers[handlers.length - 1];
    const wrapped = function connectedUsersHandler(req, res, next) {
      const originalJson = res.json.bind(res);
      res.json = (payload) => {
        const users = Array.isArray(payload?.users) ? readJson(BOT_USERS_FILE, payload.users) : payload?.users;
        const requestedLimit = Number(req.query.limit);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(Math.floor(requestedLimit), 5000) : users.length;
        const offset = Math.max(0, Number(req.query.offset) || 0);
        return originalJson({ success: true, total: users.length, offset, limit, users: users.slice(offset, offset + limit) });
      };
      return originalHandler(req, res, next);
    };
    return originalGet.call(this, pathname, ...handlers.slice(0, -1), wrapped);
  }
  return originalGet.call(this, pathname, ...handlers);
};

// Do not let an unconfigured SMS provider return a fake success response.
express.application.post = function patchedPost(pathname, ...handlers) {
  if (pathname === '/api/bot/send-sms' && handlers.length) {
    const originalHandler = handlers[handlers.length - 1];
    const wrapped = function smsHandler(req, res, next) {
      const settings = readJson(BOT_SETTINGS_FILE, {});
      if (!settings?.smsProvider || settings.smsProvider === 'none' || !settings?.smsToken) {
        return res.status(503).json({ success: false, simulated: false, error: 'سرویس پیامک تنظیم نشده است؛ پیامکی ارسال نشد.' });
      }
      return originalHandler(req, res, next);
    };
    return originalPost.call(this, pathname, ...handlers.slice(0, -1), wrapped);
  }
  return originalPost.call(this, pathname, ...handlers);
};
