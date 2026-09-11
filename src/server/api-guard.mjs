import crypto from 'node:crypto';
import express from 'express';

const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-me');
const originalUse = express.application.use;
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

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

function authGate(req, res, next) {
  const publicPath = req.path.startsWith('/auth/') || req.path.startsWith('/webhook/');
  if (publicPath) return next();

  const raw = req.get('authorization') || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'احراز هویت الزامی است.' });
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
