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
import { rankMatches, buildPublicPropertyMessage } from '../services/matching.ts';
import type { Property, PropertyRequest } from '../types.ts';

const router = Router();

function mapRequest(row: any): PropertyRequest {
  return {
    id: row.id,
    customerId: row.customerId,
    title: row.title ?? undefined,
    transactionType: row.transactionType,
    propertyType: row.propertyType ?? undefined,
    status: row.status,
    minPrice: row.minPrice ?? undefined,
    maxPrice: row.maxPrice ?? undefined,
    minDeposit: row.minDeposit ?? undefined,
    maxDeposit: row.maxDeposit ?? undefined,
    minRent: row.minRent ?? undefined,
    maxRent: row.maxRent ?? undefined,
    minArea: row.minArea ?? undefined,
    maxArea: row.maxArea ?? undefined,
    minBedrooms: row.minBedrooms ?? undefined,
    maxBedrooms: row.maxBedrooms ?? undefined,
    areaId: row.areaId ?? undefined,
    preferredAreas: row.preferredAreas ?? undefined,
    features: row.features ?? undefined,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    assignedAgentId: row.assignedAgentId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
  };
}

async function getAgencySettings(): Promise<any> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.id, 1));
    return rows[0]?.data || {};
  } catch {
    return {};
  }
}

// ---------- CRUD درخواست ----------
router.get('/requests', async (_req, res) => {
  try {
    const rows = await db.select().from(propertyRequests);
    res.json(rows.map(mapRequest));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.customerId || !body.transactionType) {
      return res.status(400).json({ error: 'customerId و transactionType الزامی است' });
    }
    const now = Date.now();
    const result = await db.insert(propertyRequests).values({
      ...body,
      status: body.status || 'open',
      createdAt: now,
      updatedAt: now,
    }).returning();
    res.json(mapRequest(result[0]));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(propertyRequests)
      .set({ ...req.body, updatedAt: Date.now() })
      .where(eq(propertyRequests.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/requests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(propertyRequests).where(eq(propertyRequests.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- مچ کردن ----------
router.get('/requests/:id/matches', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const minScore = parseInt(String(req.query.minScore || '40'), 10);
    const reqRows = await db.select().from(propertyRequests).where(eq(propertyRequests.id, id));
    const request = reqRows[0];
    if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });

    const allProps = await db.select().from(properties);
    const mappedProps = allProps as unknown as Property[];
    const matches = rankMatches(mappedProps, mapRequest(request), minScore);

    res.json({
      request: mapRequest(request),
      matches: matches.map((m) => ({
        property: m.property,
        score: m.score,
        reasons: m.reasons,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** مچ معکوس: برای یک فایل، کدام درخواست‌ها مناسب‌اند */
router.get('/properties/:propertyId/matches', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId, 10);
    const minScore = parseInt(String(req.query.minScore || '40'), 10);
    const propRows = await db.select().from(properties).where(eq(properties.id, propertyId));
    const property = propRows[0] as unknown as Property;
    if (!property) return res.status(404).json({ error: 'فایل یافت نشد' });

    const reqs = await db.select().from(propertyRequests);
    const openReqs = reqs.filter((r) => r.status === 'open' || r.status === 'matched');

    const results = openReqs
      .map((r) => {
        const mapped = mapRequest(r);
        const ranked = rankMatches([property], mapped, minScore);
        return ranked[0]
          ? { request: mapped, score: ranked[0].score, reasons: ranked[0].reasons }
          : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score);

    res.json({ property, matches: results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- ارسال امن فایل به مشتری (بدون تلفن مالک) ----------
router.post('/share', async (req, res) => {
  try {
    const { propertyId, customerId, requestId, preferredChannel } = req.body || {};
    if (!propertyId || !customerId) {
      return res.status(400).json({ error: 'propertyId و customerId الزامی است' });
    }

    const propRows = await db.select().from(properties).where(eq(properties.id, propertyId));
    const property = propRows[0] as unknown as Property;
    if (!property) return res.status(404).json({ error: 'فایل یافت نشد' });

    const custRows = await db.select().from(customers).where(eq(customers.id, customerId));
    const customer = custRows[0];
    if (!customer) return res.status(404).json({ error: 'مشتری یافت نشد' });

    const agency = await getAgencySettings();
    const botLink =
      agency.telegramAgencyId
        ? `https://t.me/${String(agency.telegramAgencyId).replace(/^@/, '')}`
        : agency.baleAgencyId
          ? `https://ble.ir/${String(agency.baleAgencyId).replace(/^@/, '')}`
          : undefined;

    const message = buildPublicPropertyMessage(property, {
      name: agency.agencyName,
      phone: agency.phone1,
      botLink,
    });

    // تشخیص کانال: اول بات، وگرنه پیامک
    type Channel = 'telegram' | 'bale' | 'rubika' | 'sms';
    let channel: Channel = 'sms';
    let chatId: string | undefined;

    if (preferredChannel === 'sms') {
      channel = 'sms';
    } else if (customer.telegramId || customer.messengerId) {
      channel = 'telegram';
      chatId = customer.telegramId || customer.messengerId || undefined;
    } else if (customer.baleId) {
      channel = 'bale';
      chatId = customer.baleId;
    } else if (customer.rubikaId) {
      channel = 'rubika';
      chatId = customer.rubikaId;
    } else {
      channel = 'sms';
    }

    let status: 'sent' | 'failed' = 'failed';
    let errorDetail = '';

    try {
      if (channel === 'sms') {
        const smsText = botLink
          ? `${message}\n\nبرای دریافت فایل‌های بیشتر در ربات عضو شوید:\n${botLink}`
          : message;

        // استفاده از endpoint موجود پیامک در سرور
        await axios.post(
          'http://127.0.0.1:3000/api/bot/send-sms',
          {
            phone: customer.phone,
            message: smsText,
            customerName: customer.fullName,
          },
          { timeout: 20000 },
        );
        status = 'sent';
      } else {
        await axios.post(
          'http://127.0.0.1:3000/api/send-message',
          {
            platform: channel,
            chatId,
            text: message,
            phone: customer.phone,
            customerName: customer.fullName,
          },
          { timeout: 20000 },
        );
        status = 'sent';
      }
    } catch (err: any) {
      errorDetail = err?.response?.data?.error || err?.message || 'ارسال ناموفق';

      // اگر بات شکست خورد، fallback به SMS
      if (channel !== 'sms' && customer.phone) {
        try {
          const smsText = botLink
            ? `${message}\n\nعضویت در ربات:\n${botLink}`
            : message;
          await axios.post(
            'http://127.0.0.1:3000/api/bot/send-sms',
            {
              phone: customer.phone,
              message: smsText,
              customerName: customer.fullName,
            },
            { timeout: 20000 },
          );
          channel = 'sms';
          status = 'sent';
          errorDetail = '';
        } catch (e2: any) {
          errorDetail = e2?.response?.data?.error || e2?.message || errorDetail;
        }
      }
    }

    const shareRows = await db.insert(propertyShares).values({
      propertyId,
      customerId,
      requestId: requestId || null,
      channel,
      message,
      status,
      matchScore: req.body.matchScore ?? null,
      createdAt: Date.now(),
    }).returning();

    if (status === 'sent') {
      res.json({ success: true, channel, share: shareRows[0], preview: message });
    } else {
      res.status(502).json({ success: false, channel, error: errorDetail || 'ارسال انجام نشد', preview: message });
    }
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
