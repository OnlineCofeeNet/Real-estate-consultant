import type { Property, PropertyRequest, PropertyType, TransactionType } from '../types';

/** جزئیات امتیاز هر معیار */
export type ScoreBreakdown = {
  key: string;
  label: string;
  weight: number;
  earned: number;
  max: number;
  note?: string;
};

export type MatchTier = 'excellent' | 'good' | 'fair' | 'weak' | 'none';

export type MatchResult = {
  property: Property;
  score: number; // 0..100
  tier: MatchTier;
  reasons: string[];
  breakdown: ScoreBreakdown[];
};

/** وزن‌های پایه (نسبت‌ها بعداً نرمال می‌شوند) */
const BASE_WEIGHTS = {
  transactionType: 28,
  propertyType: 14,
  status: 6,
  budget: 22,
  area: 12,
  bedrooms: 8,
  location: 10,
  features: 8,
  textSimilarity: 4,
  freshness: 3,
} as const;

/** شباهت نوع ملک (سخت‌گیرانه با کمی انعطاف) */
const TYPE_SIMILARITY: Partial<Record<PropertyType, Partial<Record<PropertyType, number>>>> = {
  apartment: { apartment: 1, office: 0.35, villa: 0.25 },
  villa: { villa: 1, apartment: 0.3, land: 0.2 },
  shop: { shop: 1, office: 0.4, warehouse: 0.25 },
  office: { office: 1, apartment: 0.3, shop: 0.35 },
  warehouse: { warehouse: 1, shop: 0.3 },
  land: { land: 1, villa: 0.2 },
  other: { other: 1 },
};

/** سازگاری نوع معامله */
const TX_SIMILARITY: Partial<Record<TransactionType, Partial<Record<TransactionType, number>>>> = {
  sale: { sale: 1 },
  rent: { rent: 1, rent_mortgage: 0.55, mortgage: 0.25 },
  mortgage: { mortgage: 1, rent_mortgage: 0.5, rent: 0.2 },
  rent_mortgage: { rent_mortgage: 1, rent: 0.55, mortgage: 0.45 },
};

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

function softRangeScore(
  value: number | null | undefined,
  min?: number | null,
  max?: number | null,
  tolerancePercent = 0.25,
): { ratio: number; note?: string } {
  if (min == null && max == null) return { ratio: 0.55, note: 'بازه تعریف نشده' };
  if (value == null || Number.isNaN(value)) return { ratio: 0, note: 'مقدار فایل نامشخص' };

  const lo = min ?? value;
  const hi = max ?? value;
  const span = Math.max(Math.abs(hi - lo), Math.abs(lo) * 0.1, 1);

  if (value >= lo && value <= hi) {
    const mid = (lo + hi) / 2;
    const centrality = 1 - Math.abs(value - mid) / (span / 2 + 1e-9);
    return { ratio: 0.92 + 0.08 * clamp(centrality), note: 'داخل بازه' };
  }

  const overshoot = value < lo ? lo - value : value - hi;
  const tol = span * tolerancePercent;
  if (overshoot <= tol) {
    const ratio = 1 - (overshoot / tol) * 0.65;
    return { ratio: clamp(ratio), note: 'نزدیک به بازه' };
  }

  const extra = (overshoot - tol) / (span + tol);
  const ratio = 0.35 * Math.exp(-1.8 * extra);
  return { ratio: clamp(ratio), note: 'خارج از بازه' };
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0.5;
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((x) => {
    if (sb.has(x)) inter += 1;
  });
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function textSimilarity(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;
  return jaccard(ta, tb);
}

function typeScore(reqType: PropertyType | undefined, propType: PropertyType): { ratio: number; note?: string } {
  if (!reqType) return { ratio: 0.6, note: 'نوع ملک در درخواست مشخص نشده' };
  if (reqType === propType) return { ratio: 1, note: 'نوع ملک یکسان' };
  const sim = TYPE_SIMILARITY[reqType]?.[propType] ?? TYPE_SIMILARITY[propType]?.[reqType] ?? 0;
  if (sim > 0) return { ratio: sim, note: 'نوع ملک نزدیک' };
  return { ratio: 0.05, note: 'نوع ملک متفاوت' };
}

function txScore(reqTx: TransactionType, propTx: TransactionType): { ratio: number; hardFail: boolean; note?: string } {
  if (reqTx === propTx) return { ratio: 1, hardFail: false, note: 'نوع معامله یکسان' };
  const sim = TX_SIMILARITY[reqTx]?.[propTx] ?? 0;
  if (sim >= 0.45) return { ratio: sim, hardFail: false, note: 'نوع معامله نزدیک' };
  if ((reqTx === 'sale') !== (propTx === 'sale') && (reqTx === 'sale' || propTx === 'sale')) {
    return { ratio: 0, hardFail: true, note: 'فروش و اجاره قابل تطبیق نیستند' };
  }
  return { ratio: sim, hardFail: sim < 0.2, note: 'نوع معامله متفاوت' };
}

function statusScore(status?: string): { ratio: number; note?: string } {
  switch (status) {
    case 'available':
      return { ratio: 1, note: 'موجود' };
    case 'reserved':
      return { ratio: 0.45, note: 'رزرو شده' };
    case 'rented':
    case 'sold':
      return { ratio: 0.05, note: 'خارج از دسترس' };
    case 'archived':
      return { ratio: 0, note: 'بایگانی' };
    default:
      return { ratio: 0.5, note: 'وضعیت نامشخص' };
  }
}

function freshnessScore(listedAt?: number, createdAt?: number): number {
  const t = listedAt || createdAt;
  if (!t) return 0.4;
  const days = (Date.now() - t) / (24 * 3600 * 1000);
  if (days <= 7) return 1;
  if (days <= 30) return 0.85;
  if (days <= 90) return 0.65;
  if (days <= 180) return 0.45;
  return 0.25;
}

function locationScore(property: Property, request: PropertyRequest): { ratio: number; note?: string } {
  if (request.areaId && property.areaId === request.areaId) {
    return { ratio: 1, note: 'منطقه دقیق' };
  }

  const preferred = (request.preferredAreas || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean);
  if (preferred.length && property.address) {
    const addr = property.address.toLowerCase();
    const hits = preferred.filter((p) => addr.includes(p));
    if (hits.length) {
      return { ratio: clamp(0.7 + 0.3 * (hits.length / preferred.length)), note: `محله: ${hits[0]}` };
    }
  }

  const soft = textSimilarity(property.address, request.description);
  if (soft > 0.15) return { ratio: 0.35 + soft * 0.4, note: 'شباهت موقعیت در متن' };

  if (!request.areaId && preferred.length === 0) return { ratio: 0.5, note: 'منطقه مشخص نشده' };
  return { ratio: 0.15, note: 'خارج از محدوده ترجیحی' };
}

function tierFromScore(score: number): MatchTier {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'weak';
  return 'none';
}

export function scorePropertyAgainstRequest(property: Property, request: PropertyRequest): MatchResult {
  const breakdown: ScoreBreakdown[] = [];
  const reasons: string[] = [];

  const tx = txScore(request.transactionType, property.transactionType);
  if (tx.hardFail) {
    return {
      property,
      score: 0,
      tier: 'none',
      reasons: [tx.note || 'ناسازگار'],
      breakdown: [{
        key: 'transactionType',
        label: 'نوع معامله',
        weight: BASE_WEIGHTS.transactionType,
        earned: 0,
        max: BASE_WEIGHTS.transactionType,
        note: tx.note,
      }],
    };
  }

  type Crit = { key: keyof typeof BASE_WEIGHTS; label: string; ratio: number; active: boolean; note?: string };
  const criteria: Crit[] = [];

  criteria.push({ key: 'transactionType', label: 'نوع معامله', ratio: tx.ratio, active: true, note: tx.note });

  const typ = typeScore(request.propertyType, property.propertyType);
  criteria.push({ key: 'propertyType', label: 'نوع ملک', ratio: typ.ratio, active: Boolean(request.propertyType), note: typ.note });

  const st = statusScore(property.status);
  criteria.push({ key: 'status', label: 'وضعیت فایل', ratio: st.ratio, active: true, note: st.note });

  if (request.transactionType === 'sale') {
    const r = softRangeScore(property.price, request.minPrice, request.maxPrice, 0.2);
    criteria.push({
      key: 'budget',
      label: 'بودجه خرید',
      ratio: r.ratio,
      active: request.minPrice != null || request.maxPrice != null,
      note: r.note,
    });
  } else {
    const d = softRangeScore(property.deposit, request.minDeposit, request.maxDeposit, 0.25);
    const rent = softRangeScore(property.rent, request.minRent, request.maxRent, 0.25);
    const hasDeposit = request.minDeposit != null || request.maxDeposit != null;
    const hasRent = request.minRent != null || request.maxRent != null;
    let ratio = 0.5;
    if (hasDeposit && hasRent) ratio = d.ratio * 0.45 + rent.ratio * 0.55;
    else if (hasDeposit) ratio = d.ratio;
    else if (hasRent) ratio = rent.ratio;
    else ratio = (d.ratio + rent.ratio) / 2;
    criteria.push({
      key: 'budget',
      label: 'ودیعه / اجاره',
      ratio,
      active: hasDeposit || hasRent,
      note: [d.note, rent.note].filter(Boolean).join(' · '),
    });
  }

  const area = softRangeScore(property.area, request.minArea, request.maxArea, 0.2);
  criteria.push({
    key: 'area',
    label: 'متراژ',
    ratio: area.ratio,
    active: request.minArea != null || request.maxArea != null,
    note: area.note,
  });

  const beds = softRangeScore(property.bedrooms, request.minBedrooms, request.maxBedrooms, 0.5);
  criteria.push({
    key: 'bedrooms',
    label: 'اتاق',
    ratio: beds.ratio,
    active: request.minBedrooms != null || request.maxBedrooms != null,
    note: beds.note,
  });

  const loc = locationScore(property, request);
  criteria.push({
    key: 'location',
    label: 'موقعیت',
    ratio: loc.ratio,
    active: Boolean(request.areaId) || (request.preferredAreas || []).length > 0,
    note: loc.note,
  });

  const reqFeatures = (request.features || []) as string[];
  const propFeatures = (property.features || []) as string[];
  const featRatio = reqFeatures.length
    ? reqFeatures.filter((f) => propFeatures.includes(f)).length / reqFeatures.length
    : jaccard(reqFeatures, propFeatures);
  criteria.push({
    key: 'features',
    label: 'امکانات',
    ratio: featRatio,
    active: reqFeatures.length > 0,
    note: reqFeatures.length
      ? `${reqFeatures.filter((f) => propFeatures.includes(f)).length}/${reqFeatures.length} مورد`
      : undefined,
  });

  const textRatio = Math.max(
    textSimilarity(request.description, property.title),
    textSimilarity(request.description, property.description),
    textSimilarity(request.title, property.title),
    0,
  );
  criteria.push({
    key: 'textSimilarity',
    label: 'شباهت متنی',
    ratio: textRatio,
    active: Boolean(request.description || request.title),
    note: textRatio > 0.2 ? 'کلیدواژه مشترک' : undefined,
  });

  criteria.push({
    key: 'freshness',
    label: 'تازگی آگهی',
    ratio: freshnessScore(property.listedAt, property.createdAt),
    active: true,
  });

  let totalWeight = 0;
  let earned = 0;

  for (const c of criteria) {
    const base = BASE_WEIGHTS[c.key];
    const weight = c.active ? base : base * 0.35;
    const part = weight * clamp(c.ratio);
    totalWeight += weight;
    earned += part;
    breakdown.push({
      key: c.key,
      label: c.label,
      weight: Math.round(weight * 10) / 10,
      earned: Math.round(part * 10) / 10,
      max: Math.round(weight * 10) / 10,
      note: c.note,
    });
    if (c.ratio >= 0.75 && c.note) reasons.push(c.note);
    else if (c.active && c.ratio >= 0.55 && c.note) reasons.push(c.note);
  }

  let finalScore = totalWeight > 0 ? Math.round(clamp(earned / totalWeight) * 100) : 0;

  if (property.status === 'sold' || property.status === 'rented') {
    finalScore = Math.min(finalScore, 25);
    reasons.push('فایل معامله‌شده');
  } else if (property.status === 'reserved') {
    finalScore = Math.min(finalScore, 72);
  }

  for (const b of breakdown) {
    if (b.note && (b.note.includes('خارج') || b.note.includes('متفاوت') || b.note.includes('نامشخص'))) {
      if (!reasons.includes(b.note) && reasons.length < 8) reasons.push(b.note);
    }
  }

  return {
    property,
    score: finalScore,
    tier: tierFromScore(finalScore),
    reasons: reasons.slice(0, 8),
    breakdown,
  };
}

export function rankMatches(
  properties: Property[],
  request: PropertyRequest,
  minScore = 35,
): MatchResult[] {
  return properties
    .map((p) => scorePropertyAgainstRequest(p, request))
    .filter((m) => m.score >= minScore && m.tier !== 'none')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.property.listedAt || b.property.createdAt || 0) - (a.property.listedAt || a.property.createdAt || 0);
    });
}

export function buildPublicPropertyMessage(
  property: Property,
  agency?: { name?: string; phone?: string; botLink?: string },
): string {
  const lines: string[] = [];
  lines.push(`🏠 ${property.title}`);
  lines.push(`کد فایل: ${property.code}`);

  const typeLabel: Record<string, string> = {
    apartment: 'آپارتمان',
    villa: 'ویلا',
    shop: 'مغازه',
    land: 'زمین',
    office: 'اداری',
    warehouse: 'انبار',
    other: 'سایر',
  };
  const txLabel: Record<string, string> = {
    sale: 'فروش',
    rent: 'اجاره',
    mortgage: 'رهن کامل',
    rent_mortgage: 'رهن و اجاره',
  };

  lines.push(
    `نوع: ${typeLabel[property.propertyType] || property.propertyType} · ${txLabel[property.transactionType] || property.transactionType}`,
  );

  if (property.area) lines.push(`متراژ: ${property.area} متر`);
  if (property.bedrooms != null) lines.push(`اتاق: ${property.bedrooms}`);
  if (property.floor != null) {
    lines.push(`طبقه: ${property.floor}${property.totalFloors ? ` از ${property.totalFloors}` : ''}`);
  }

  if (property.transactionType === 'sale' && property.price != null) {
    lines.push(`قیمت: ${property.price.toLocaleString('fa-IR')} ریال`);
  } else {
    if (property.deposit != null) lines.push(`ودیعه: ${property.deposit.toLocaleString('fa-IR')} ریال`);
    if (property.rent != null) lines.push(`اجاره: ${property.rent.toLocaleString('fa-IR')} ریال`);
  }

  if (property.address) lines.push(`موقعیت: ${property.address}`);
  if (property.description) lines.push(`\n${property.description}`);

  lines.push('\n—');
  lines.push('برای هماهنگی بازدید با مشاور املاک در ارتباط باشید.');
  if (agency?.name) lines.push(`🏢 ${agency.name}`);
  if (agency?.phone) lines.push(`📞 ${agency.phone}`);
  if (agency?.botLink) lines.push(`🤖 عضویت در ربات: ${agency.botLink}`);

  return lines.join('\n');
}
