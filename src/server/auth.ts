import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export type ServerRole = 'admin' | 'manager' | 'agent' | 'accountant';
export type Permission = 'dashboard:read' | 'customers:read' | 'customers:write' | 'contracts:read' | 'contracts:write' | 'finance:read' | 'finance:write' | 'properties:read' | 'properties:write' | 'settings:read' | 'settings:write' | 'users:read' | 'users:write' | 'audit:read' | 'backup:read' | 'backup:write';
export interface AuthPrincipal { id: number; username: string; role: ServerRole; }
declare global { namespace Express { interface Request { user?: AuthPrincipal; } } }
const ITERATIONS = 310_000;
const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-only-change-me');
const VALID_ROLES: ServerRole[] = ['admin', 'manager', 'agent', 'accountant'];
if (process.env.NODE_ENV === 'production' && SECRET.length < 32) console.warn('AUTH_SECRET is missing or too short; configure a random secret of at least 32 characters before production deployment.');
function b64url(value: Buffer | string) { return Buffer.from(value).toString('base64url'); }
function sign(input: string) { return crypto.createHmac('sha256', SECRET).update(input).digest('base64url'); }
function timingSafeEqual(a: string, b: string) { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && crypto.timingSafeEqual(aa, bb); }
function isRole(value: unknown): value is ServerRole { return typeof value === 'string' && VALID_ROLES.includes(value as ServerRole); }
export function issueToken(principal: { id: number; username: string; role: string }): string { if (!isRole(principal.role)) throw new Error('Invalid persisted user role.'); const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })); const payload = b64url(JSON.stringify({ sub: principal.id, username: principal.username, role: principal.role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })); const input = `${header}.${payload}`; return `${input}.${sign(input)}`; }
export function verifyToken(token: string): AuthPrincipal | null { try { const [header, payload, signature] = token.split('.'); if (!header || !payload || !signature || !timingSafeEqual(sign(`${header}.${payload}`), signature)) return null; const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); if (!data.sub || !data.username || !data.exp || data.exp <= Math.floor(Date.now() / 1000) || !isRole(data.role)) return null; return { id: Number(data.sub), username: String(data.username), role: data.role }; } catch { return null; } }
export async function verifyPassword(password: string, saltBase64: string, expectedHash: string): Promise<boolean> { return new Promise((resolve, reject) => { crypto.pbkdf2(Buffer.from(password, 'utf8'), Buffer.from(saltBase64, 'base64'), ITERATIONS, 32, 'sha256', (error, derived) => { if (error) return reject(error); const expected = Buffer.from(expectedHash, 'base64'); resolve(expected.length === derived.length && crypto.timingSafeEqual(expected, derived)); }); }); }
export function authRequired(req: Request, res: Response, next: NextFunction) { const raw = req.header('authorization') || ''; const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : ''; const principal = token ? verifyToken(token) : null; if (!principal) return res.status(401).json({ error: 'احراز هویت الزامی است.' }); req.user = principal; return next(); }
const rolePermissions: Record<ServerRole, Set<Permission>> = { admin: new Set(['dashboard:read','customers:read','customers:write','contracts:read','contracts:write','finance:read','finance:write','properties:read','properties:write','settings:read','settings:write','users:read','users:write','audit:read','backup:read','backup:write']), manager: new Set(['dashboard:read','customers:read','customers:write','contracts:read','contracts:write','finance:read','finance:write','properties:read','properties:write','settings:read','audit:read','backup:read']), agent: new Set(['dashboard:read','customers:read','customers:write','contracts:read','contracts:write','properties:read','properties:write']), accountant: new Set(['dashboard:read','customers:read','contracts:read','finance:read','finance:write','properties:read','audit:read']) };
export function hasPermission(role: ServerRole | undefined, permission: Permission) { return Boolean(role && rolePermissions[role]?.has(permission)); }
export function requirePermission(permission: Permission) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user || !hasPermission(req.user.role, permission)) return res.status(403).json({ error: 'شما مجوز انجام این عملیات را ندارید.' }); return next(); }; }
export function publicUser(user: any) { return { id: user.id, username: user.username, role: user.role, phone: user.phone, email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt }; }
export async function findUser(username: string) { const result = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase())); return result[0]; }
