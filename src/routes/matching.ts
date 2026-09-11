import { Router } from 'express';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  customers,
  properties,
  propertyRequests,
  propertyShares,
  settings,
} from '../db/schema.ts';
import { rankMatches, buildPublicPropertyMessage, scorePropertyAgainstRequest } from '../services/matching.ts';
import type { Property, PropertyRequest } from '../types.ts';

const router = Router();

type MatchingRow = Record<string, unknown> & { id?: number };

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function boundedScore(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.trunc(n))) : fallback;
}

function mapRequest(row: MatchingRow): PropertyRequest {
  return {
    id: row.id,
    customerId: Number(row.customerId),
    title: typeof row.title === 'string' ? row.title : undefined,
    transactionType: row.transactionType as PropertyRequest['transactionType'],
    propertyType: row.propertyType as PropertyRequest['propertyType'],
    status: row.status as PropertyRequest['status'],
    minPrice: typeof row.minPrice === 'number' ? row.minPrice : undefined,
    maxPrice: typeof row.maxPrice === 'number' ? row.maxPrice : undefined,
    minDeposit: typeof row.minDeposit === 'number' ? row.minDeposit : undefined,
    maxDeposit: typeof row.maxDeposit === 'number' ? row.maxDeposit : undefined,
    minRent: typeof row.minRent === 'number' ? row.minRent : undefined,
    maxRent: typeof row.maxRent === 'number' ? row.maxRent : undefined,
    minArea: typeof row.minArea === 'number' ? row.minArea : undefined,
    maxArea: typeof row.maxArea === 'number' ? row.maxArea : undefined,
    minBedrooms: typeof row.minBedrooms === 'number' ? row.minBedrooms : undefined,
    maxBedrooms: typeof row.maxBedrooms === 'number' ? row.maxBedrooms : undefined,
    areaId: typeof row.areaId === 'number' ? row.areaId : undefined,
    preferredAreas: Array.isArray(row.preferredAreas) ? row.preferredAreas as string[] : undefined,
    features: Array.isArray(row.features) ? row.features as string[] : undefined,
    description: typeof row.description === 'string' ? row.description : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    assignedAgentId: typeof row.assignedAgentId === 'number' ? row.assignedAgentId : undefined,
    createdAt: Number(row.createdAt),
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : undefined,
    expiresAt: typeof row.expiresAt === 'number' ? row.expiresAt : undefined,
  };
}

async function getAgencySettings(): Promise<Record<string, any>> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.id, 1));
    return (rows[0]?.data || {}) as Record<string, any>;
  } catch {
    return {};
  }
}

router.get('/requests', async (_req, res) => {
  try {
    const rows = await db.select().from(propertyRequests);
    res.json(rows.map((row) => mapRequest(row as MatchingRow)));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const body = req.body || {};
    const customerId = positiveInt(body.customerId);
    const allowedTransactions = ['sale', 'rent', 'mortgage', 'rent_mortgage'];
    if (!customerId || !allowedTransactions.includes(body.transactionType)) {
      return res.status(400).json({ error: 'customerId و transactionType معتبر الزامی است' });
    }

    const customerRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId));
    if (!customerRows[0]) return res.status(404).json({ error: 'مشتری یافت نشد' });

    const now = Date.now();
    const result = await db.insert(propertyRequests).values({
      customerId,
      title: typeof body.title === 'string' ? body.title.slice(0, 200) : undefined,
      transactionType: body.transactionType,
      propertyType: body.propertyType || undefined,
      status: 'open',
      minPrice: Number.isFinite(body.minPrice) ? body.minPrice : undefined,
      maxPrice: Number.isFinite(body.maxPrice) ? body.maxPrice : undefined,
      minDeposit: Number.isFinite(body.minDeposit) ? body.minDeposit : undefined,
      maxDeposit: Number.isFinite(body.maxDeposit) ? body.maxDeposit : undefined,
      minRent: Number.isFinite(body.minRent) ? body.minRent : undefined,
      maxRent: Number.isFinite(body.maxRent) ? body.maxRent : undefined,
      minArea: Number.isFinite(body.minArea) ? body.minArea : undefined,
      maxArea: Number.isFinite(body.maxArea) ? body.maxArea : undefined,
      minBedrooms: Number.isFinite(body.minBedrooms) ? body.minBedrooms : undefined,
      maxBedrooms: Number.isFinite(body.maxBedrooms) ? body.maxBedrooms : undefined,
      areaId: positiveInt(body.areaId) ?? undefined,
      preferredAreas: Array.isArray(body.preferredAreas) ? body.preferredAreas.slice(0, 20) : undefined,
      features: Array.isArray(body.features) ? body.features.slice(0, 30) : undefined,
      description: typeof body.description === 'string' ? body.description.slice(0, 2000) : undefined,
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : undefined,
      assignedAgentId: positiveInt(body.assignedAgentId) ?? undefined,
      createdAt: now,
      updatedAt: now,
    }).returning();
    res.status(201).json(mapRequest(result[0] as MatchingRow));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const id = positiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'شناسه درخواست نامعتبر است' });
    const existing = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id));
    if (!existing[0]) return res.status(404).json({ error: 'درخواست یافت نشد' });

    const allowedStatuses = ['open', 'matched', 'closed', 'archived'];
    const status = req.body?.status;
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است' });
    }
    if (Object.keys(req.body || {}).some((key) => !['status'].includes(key))) {
      return res.status(400).json({ error: 'فقط تغییر وضعیت از این مسیر مجاز است' });
    }

    await db.update(propertyRequests)
      .set({ status, updatedAt: Date.now() })
      .where(eq(propertyRequests.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/requests/:id', async (req, res) => {
  try {
    const id = positiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'شناسه درخواست نامعتبر است' });
    const result = await db.delete(propertyRequests).where(eq(propertyRequests.id, id)).returning({ id: propertyRequests.id });
    if (!result[0]) return res.status(404).json({ error: 'درخواست یافت نشد' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/requests/:id/matches', async (req, res) => {
  try {
    const id = positiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'شناسه درخواست نامعتبر است' });
    const minScore = boundedScore(req.query.minScore, 35);
    const reqRows = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id));
    const request = reqRows[0];
    if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });

    const allProps = await db.select().from(properties);
    const mappedProps = allProps as unknown as Property[];
    const matches = rankMatches(mappedProps, mapRequest(request as MatchingRow), minScore);

    res.json({
      request: mapRequest(request as MatchingRow),
      matches: matches.map((m) => ({
        property: m.property,
        score: m.score,
        tier: m.tier,
        reasons: m.reasons,
        breakdown: m.breakdown,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/properties/:propertyId/matches', async (req, res) => {
  try {
    const propertyId = positiveInt(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    const minScore = boundedScore(req.query.minScore, 35);
    const propRows = await db.select().from(properties).where(eq(properties.id, propertyId));
    const property = propRows[0] as unknown as Property;
    if (!property) return res.status(404).json({ error: 'فایل یافت نشد' });

    const reqs = await db.select().from(propertyRequests);
    const openReqs = reqs.filter((r) => r.status === 'open' || r.status === 'matched');
    const results = openReqs
      .map((r) => {
        const mapped = mapRequest(r as MatchingRow);
        const ranked = rankMatches([property], mapped, minScore);
        return ranked[0] ? {
          request: mapped,
          score: ranked[0].score,
          tier: ranked[0].tier,
          reasons: ranked[0].reasons,
          breakdown: ranked[0].breakdown,
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score);

    res.json({ property, matches: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/auto-match/:propertyId', async (req, res) => {
  try {
    const propertyId = positiveInt(req.params.propertyId);
    if (!propertyId) return res.status(400).json({ error: 'شناسه فایل نامعتبر است' });
    const minScore = boundedScore(req.body?.minScore ?? req.query.minScore, 50);
    const markMatchedScore = boundedScore(req.body?.markMatchedScore, 70);

    const propRows = await db.select().from(properties).where(eq(properties.id, propertyId));
    const property = propRows[0] as unknown as Property;
    if (!property) return res.status(404).json({ error: 'فایل یافت نشد' });

    const reqs = await db.select().from(propertyRequests);
    const openReqs = reqs.filter((r) => r.status === 'open' || r.status === 'matched');
    const matches: Array<{ request: PropertyRequest; score: number; tier: string; reasons: string[]; breakdown: unknown }> = [];
    let marked = 0;

    for (const r of openReqs) {
      const mapped = mapRequest(r as MatchingRow);
      const result = scorePropertyAgainstRequest(property, mapped);
      if (result.score < minScore || result.tier === 'none') continue;
      matches.push({ request: mapped, score: result.score, tier: result.tier, reasons: result.reasons, breakdown: result.breakdown });
      if (result.score >= markMatchedScore && r.id != null && r.status === 'open') {
        await db.update(propertyRequests).set({ status: 'matched', updatedAt: Date.now() }).where(eq(propertyRequests.id, r.id));
        marked += 1;
      }
    }

    matches.sort((a, b) => b.score - a.score);
    res.json({ propertyId, count: matches.length, markedMatched: marked, matches });
  } catch (e: any) {
    console.error('auto-match error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/share', async (req, res) => {
  try {
    const propertyId = positiveInt(req.body?.propertyId);
    const customerId = positiveInt(req.body?.customerId);
    const requestId = req.body?.requestId == null ? null : positiveInt(req.body.requestId);
    const matchScore = req.body?.matchScore == null ? null : boundedScore(req.body.matchScore, 0);
    const preferredChannel = req.body?.preferredChannel;

    if (!propertyId || !customerId) return res.status(400).json({ error: 'propertyId و customerId معتبر الزامی است' });
    if (req.body?.requestId != null && !requestId) return res.status(400).json({ error: 'requestId نامعتبر است' });

    const propRows = await db.select().from(properties).where(eq(properties.id, propertyId));
    const property = propRows[0] as unknown as Property;
    if (!property) return res.status(404).json({ error: 'فایل یافت نشد' });

    const custRows = await db.select().from(customers).where(eq(customers.id, customerId));
    const customer = custRows[0];
    if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });

    if (requestId) {
      const requestRows = await db.select().from(propertyRequests).where(eq(propertyRequests.id, requestId));
      const request = requestRows[0];
      if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });
      if (request.customerId !== customerId) return res.status(403).json({ error: 'این درخواست متعلق به مشتری انتخاب‌شده نیست' });
    }

    const agency = await getAgencySettings();
    const botLink = agency.telegramAgencyId
      ? `https://t.me/${String(agency.telegramAgencyId).replace(/^@/, '')}`
      : agency.baleAgencyId
        ? `https://ble.ir/${String(agency.baleAgencyId).replace(/^@/, '')}`
        : undefined;
    const message = buildPublicPropertyMessage(property, { name: agency.agencyName, phone: agency.phone1, botLink });

    type Channel = 'telegram' | 'bale' | 'rubika' | 'sms';
    let channel: Channel = 'sms';
    let chatId: string | undefined;
    if (preferredChannel === 'sms') channel = 'sms';
    else if (customer.telegramId || customer.messengerId) { channel = 'telegram'; chatId = customer.telegramId || customer.messengerId || undefined; }
    else if (customer.baleId) { channel = 'bale'; chatId = customer.baleId; }
    else if (customer.rubikaId) { channel = 'rubika'; chatId = customer.rubikaId; }

    let status: 'sent' | 'failed' = 'failed';
    let errorDetail = '';
    try {
      if (channel === 'sms') {
        const smsText = botLink ? `${message}\n\nبرای دریافت فایل‌های بیشتر در ربات عضو شوید:\n${botLink}` : message;
        await axios.post('http://127.0.0.1:3000/api/bot/send-sms', { phone: customer.phone, message: smsText, customerName: customer.fullName }, { timeout: 20000 });
        status = 'sent';
      } else {
        await axios.post('http://127.0.0.1:3000/api/send-message', { platform: channel, chatId, text: message, phone: customer.phone, customerName: customer.fullName }, { timeout: 20000 });
        status = 'sent';
      }
    } catch (err: any) {
      errorDetail = err?.response?.data?.error || err?.message || 'ارسال ناموفق';
      if (channel !== 'sms' && customer.phone) {
        try {
          const smsText = botLink ? `${message}\n\nعضویت در ربات:\n${botLink}` : message;
          await axios.post('http://127.0.0.1:3000/api/bot/send-sms', { phone: customer.phone, message: smsText, customerName: customer.fullName }, { timeout: 20000 });
          channel = 'sms'; status = 'sent'; errorDetail = '';
        } catch (e2: any) {
          errorDetail = e2?.response?.data?.error || e2?.message || errorDetail;
        }
      }
    }

    const shareRows = await db.insert(propertyShares).values({ propertyId, customerId, requestId, channel, message, status, matchScore, createdAt: Date.now() }).returning();
    if (status === 'sent') res.json({ success: true, channel, share: shareRows[0], preview: message });
    else res.status(502).json({ success: false, channel, error: errorDetail || 'ارسال انجام نشد', preview: message });
  } catch (e: any) {
    console.error('share error', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/shares', async (_req, res) => {
  try {
    const rows = await db.select().from(propertyShares);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
