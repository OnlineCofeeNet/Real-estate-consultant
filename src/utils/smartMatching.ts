import { PropertyListing, PropertyRequest, SmartMatchResult } from '../types';

/**
 * Smart Matching Algorithm for Real Estate Consultant
 * Evaluates compatibility between Customer Property Requests and Available Property Listings
 */
export function calculateMatchScore(
  property: PropertyListing,
  request: PropertyRequest
): SmartMatchResult | null {
  // Deal type must match (or request is flexible)
  if (property.dealType !== request.dealType) {
    return null;
  }

  // Property type must match
  if (property.propertyType !== request.propertyType) {
    return null;
  }

  let score = 40; // Base score for matching deal type and property type
  const reasons: string[] = ['نوع معامله و کاربری ملک کاملاً همخوانی دارد'];

  // 1. Neighborhood match (Weight: 25 points)
  const propNeigh = (property.neighborhood || '').trim().toLowerCase();
  const matchedNeigh = request.preferredNeighborhoods.some(n => {
    const cleanReq = n.trim().toLowerCase();
    return propNeigh.includes(cleanReq) || cleanReq.includes(propNeigh);
  });

  if (request.preferredNeighborhoods.length === 0 || matchedNeigh) {
    score += 25;
    if (matchedNeigh) {
      reasons.push(`محله ${property.neighborhood} در اولویت‌های متقاضی قرار دارد`);
    }
  } else {
    // Neighbor not in preferred list, but could be nearby
    score += 5;
    reasons.push(`محله (${property.neighborhood}) در اولویت اعلامی متقاضی نیست اما نزدیک است`);
  }

  // 2. Area match (Weight: 20 points)
  const minArea = request.minArea || 0;
  const maxArea = request.maxArea || Infinity;

  if (property.area >= minArea && property.area <= maxArea) {
    score += 20;
    reasons.push(`متراژ (${property.area} متر) کاملاً در محدوده مد نظر است`);
  } else if (property.area >= minArea * 0.85 && property.area <= maxArea * 1.15) {
    score += 10;
    reasons.push(`متراژ با اختلاف اندک نزدیک به سلیقه متقاضی است`);
  }

  // 3. Price / Rent match (Weight: 15 points)
  if (request.dealType === 'sale') {
    if (request.maxPrice && property.price) {
      if (property.price <= request.maxPrice) {
        score += 15;
        reasons.push('قیمت کل در سقف بودجه خریدار قرار دارد');
      } else if (property.price <= request.maxPrice * 1.1) {
        score += 7;
        reasons.push('قیمت با ۱۰٪ اختلاف قابل مذاکره و تخفیف است');
      }
    } else {
      score += 10;
    }
  } else if (request.dealType === 'rent') {
    const depOk = !request.maxDeposit || !property.deposit || property.deposit <= request.maxDeposit;
    const rentOk = !request.maxMonthlyRent || !property.monthlyRent || property.monthlyRent <= request.maxMonthlyRent;

    if (depOk && rentOk) {
      score += 15;
      reasons.push('میزان رهن و اجاره ماهانه در محدوده بودجه مستأجر است');
    } else if (depOk || rentOk) {
      score += 8;
      reasons.push('یکی از موارد رهن یا اجاره در بودجه است (امکان تبدیل و توافق)');
    }
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(Math.max(score, 10), 100);

  // Generate personalized suggestion message for the client (NEVER contains owner/resident contacts)
  const dealTitle = property.dealType === 'rent' ? 'اجاره' : 'خرید';
  const suggestedMessage = `سلام ${request.customerName} گرامی 🌹\n` +
    `ملک جدیدی در ${property.neighborhood} متناسب با درخواست ${dealTitle} شما ثبت گردید:\n` +
    `🏢 ${property.title}\n` +
    `📐 متراژ: ${property.area} متر ${property.rooms ? `| ${property.rooms} خواب` : ''}\n` +
    (property.price ? `💰 قیمت: ${Number(property.price).toLocaleString('fa-IR')} تومان\n` : '') +
    (property.deposit || property.monthlyRent ? `💰 ودیعه: ${Number(property.deposit || 0).toLocaleString('fa-IR')} | اجاره: ${Number(property.monthlyRent || 0).toLocaleString('fa-IR')} تومان\n` : '') +
    (property.features && property.features.length > 0 ? `🔹 امکانات: ${property.features.join(' | ')}\n` : '') +
    `جهت دریافت تصاویر بیشتر و هماهنگی زمان بازدید با ما تماس حاصل فرمایید.`;

  return {
    property,
    request,
    matchScore: finalScore,
    matchReasons: reasons,
    suggestedMessage
  };
}

/**
 * Generates an internal notification message for agents/consultants
 * (Contains full property specs + optional contact info for agent action)
 */
export function buildAgentPropertyMessage(
  property: PropertyListing,
  agentName: string,
  includePrivateContacts: boolean = true
): string {
  const dealTitle = property.dealType === 'rent' ? 'رهن و اجاره' : property.dealType === 'presale' ? 'پیش‌فروش' : 'فروش فوری';
  let text = `همکار و مباشر گرامی، جناب/سرکار ${agentName} 🤝\n` +
    `فایل جدید ملکی جهت بررسی، بازاریابی و پیگیری ثبت گردید:\n\n` +
    `🏢 عنوان: ${property.title} (${dealTitle})\n` +
    `📍 منطقه/محله: ${property.neighborhood}\n` +
    `📐 متراژ: ${property.area} متر مربع ${property.rooms ? `| ${property.rooms} خواب` : ''} ${property.floor ? `| طبقه ${property.floor}` : ''}\n` +
    (property.price ? `💰 قیمت کل: ${Number(property.price).toLocaleString('fa-IR')} تومان\n` : '') +
    (property.deposit || property.monthlyRent ? `💰 ودیعه: ${Number(property.deposit || 0).toLocaleString('fa-IR')} ت | اجاره: ${Number(property.monthlyRent || 0).toLocaleString('fa-IR')} تومان\n` : '') +
    (property.features && property.features.length > 0 ? `🔹 امکانات: ${property.features.join(' | ')}\n` : '');

  if (property.generatedDescription) {
    text += `\n📝 متن آگهی آماده تبلیغاتی:\n${property.generatedDescription}\n`;
  }

  if (includePrivateContacts) {
    text += `\n🔒 اطلاعات محرمانه هماهنگی بازدید (ویژه کادر املاک):\n`;
    if (property.ownerName || property.ownerPhone) {
      text += `👤 مالک: ${property.ownerName || 'نامشخص'} | تماس: ${property.ownerPhone || '-'}\n`;
    }
    if (property.residentName || property.residentPhone) {
      text += `🔑 ساکن فعلی: ${property.residentName || 'نامشخص'} | تماس: ${property.residentPhone || '-'}\n`;
    }
  }

  return text;
}

/**
 * Finds all matching properties for a given request, sorted by highest score
 */
export function findMatchesForRequest(
  request: PropertyRequest,
  allProperties: PropertyListing[]
): SmartMatchResult[] {
  const results: SmartMatchResult[] = [];

  for (const property of allProperties) {
    const match = calculateMatchScore(property, request);
    if (match && match.matchScore >= 50) {
      results.push(match);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Finds all matching requests for a given property, sorted by highest score
 */
export function findMatchesForProperty(
  property: PropertyListing,
  allRequests: PropertyRequest[]
): SmartMatchResult[] {
  const results: SmartMatchResult[] = [];

  for (const request of allRequests) {
    const match = calculateMatchScore(property, request);
    if (match && match.matchScore >= 50) {
      results.push(match);
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
