import type { Property, PropertyRequest } from '../types';

export type MatchResult = {
  property: Property;
  score: number; // 0..100
  reasons: string[];
};

function inRange(value: number | undefined | null, min?: number | null, max?: number | null): boolean {
  if (value == null) return min == null && max == null;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function softScoreRange(
  value: number | undefined | null,
  min?: number | null,
  max?: number | null,
  weight = 20,
): { points: number; ok: boolean; note?: string } {
  if (min == null && max == null) return { points: weight * 0.5, ok: true };
  if (value == null) return { points: 0, ok: false, note: 'مقدار نامشخص' };
  if (inRange(value, min, max)) return { points: weight, ok: true };

  // نزدیکی نسبی خارج از بازه
  const mid = ((min ?? value) + (max ?? value)) / 2;
  const span = Math.max(Math.abs((max ?? mid) - (min ?? mid)), 1);
  const dist = Math.abs(value - mid) / span;
  const points = Math.max(0, weight * (1 - Math.min(dist, 1.5) / 1.5));
  return { points, ok: points >= weight * 0.4, note: 'نزدیک به بازه' };
}

/** امتیازدهی فایل ملک نسبت به درخواست مشتری */
export function scorePropertyAgainstRequest(property: Property, request: PropertyRequest): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // نوع معامله — حیاتی
  if (property.transactionType === request.transactionType) {
    score += 25;
    reasons.push('نوع معامله یکسان');
  } else {
    return { property, score: 0, reasons: ['نوع معامله متفاوت'] };
  }

  // نوع ملک
  if (!request.propertyType || property.propertyType === request.propertyType) {
    score += 15;
    if (request.propertyType) reasons.push('نوع ملک مطابق');
  } else {
    reasons.push('نوع ملک متفاوت');
  }

  // فقط فایل‌های موجود
  if (property.status && property.status !== 'available') {
    score = Math.min(score, 15);
    reasons.push('وضعیت ملک موجود نیست');
  } else {
    score += 5;
  }

  // قیمت / رهن / اجاره
  if (request.transactionType === 'sale') {
    const r = softScoreRange(property.price, request.minPrice, request.maxPrice, 25);
    score += r.points;
    if (r.ok) reasons.push('بودجه فروش');
    else if (r.note) reasons.push(`قیمت: ${r.note}`);
  } else {
    const d = softScoreRange(property.deposit, request.minDeposit, request.maxDeposit, 12);
    const rent = softScoreRange(property.rent, request.minRent, request.maxRent, 13);
    score += d.points + rent.points;
    if (d.ok) reasons.push('ودیعه');
    if (rent.ok) reasons.push('اجاره');
  }

  // متراژ
  {
    const r = softScoreRange(property.area, request.minArea, request.maxArea, 12);
    score += r.points;
    if (r.ok) reasons.push('متراژ');
  }

  // اتاق
  {
    const r = softScoreRange(property.bedrooms, request.minBedrooms, request.maxBedrooms, 8);
    score += r.points;
    if (r.ok && request.minBedrooms != null) reasons.push('تعداد اتاق');
  }

  // منطقه
  if (request.areaId && property.areaId === request.areaId) {
    score += 10;
    reasons.push('منطقه مطابق');
  } else if (request.preferredAreas && request.preferredAreas.length > 0 && property.address) {
    const addr = property.address.toLowerCase();
    const hit = request.preferredAreas.some((a) => addr.includes(String(a).toLowerCase()));
    if (hit) {
      score += 8;
      reasons.push('محله ترجیحی');
    }
  }

  // امکانات مشترک
  const reqFeatures = (request.features || []) as string[];
  const propFeatures = (property.features || []) as string[];
  if (reqFeatures.length > 0) {
    const common = reqFeatures.filter((f) => propFeatures.includes(f));
    const ratio = common.length / reqFeatures.length;
    score += Math.round(ratio * 10);
    if (common.length) reasons.push(`امکانات: ${common.length}/${reqFeatures.length}`);
  }

  return {
    property,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

export function rankMatches(
  properties: Property[],
  request: PropertyRequest,
  minScore = 40,
): MatchResult[] {
  return properties
    .map((p) => scorePropertyAgainstRequest(p, request))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

/** متن معرفی فایل بدون شماره مالک */
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

  lines.push(`نوع: ${typeLabel[property.propertyType] || property.propertyType} · ${txLabel[property.transactionType] || property.transactionType}`);

  if (property.area) lines.push(`متراژ: ${property.area} متر`);
  if (property.bedrooms != null) lines.push(`اتاق: ${property.bedrooms}`);
  if (property.floor != null) lines.push(`طبقه: ${property.floor}${property.totalFloors ? ` از ${property.totalFloors}` : ''}`);

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
  // عمداً شماره مالک ارسال نمی‌شود
  if (agency?.name) lines.push(`🏢 ${agency.name}`);
  if (agency?.phone) lines.push(`📞 ${agency.phone}`);
  if (agency?.botLink) lines.push(`🤖 عضویت در ربات: ${agency.botLink}`);

  return lines.join('\n');
}
