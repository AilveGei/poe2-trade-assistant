// Parse a search result row into structured data

import type { BookmarkTrade } from '../stores/bookmark-store';

export interface ParsedItem {
  name: string;
  typeLine: string;
  priceType: string; // currency slug
  priceAmount: number;
  currency: string;
  seller: string;
  itemLevel: number;
  socketCount: number;
  explicitMods: string[];
  implicitMods: string[];
  pseudoMods: string[];
}

export function parseItemRow(row: Element): ParsedItem {
  const priceEl = row.querySelector('.price') || row.querySelector('[data-field="price"]');
  let priceType = '';
  let priceAmount = 0;
  let currency = '';

  if (priceEl) {
    const text = priceEl.textContent?.trim() || '';
    const priceMatch = text.match(/([\d.]+)\s*(.+)/);
    if (priceMatch) {
      priceAmount = parseFloat(priceMatch[1]);
      currency = priceMatch[2].trim();
      // Normalize currency slug
      priceType = normalizeCurrencySlug(currency);
    }
  }

  const header = row.querySelector('.itemHeader');
  const name = header?.textContent?.trim() || '';

  const seller = getText(row, '.profile-link [href]') || '';

  const ilvlEl = row.querySelector('.itemLevel');
  let itemLevel = 0;
  if (ilvlEl) {
    const match = ilvlEl.textContent?.match(/(\d+)/);
    itemLevel = match ? parseInt(match[1], 10) : 0;
  }

  const socketCount = row.querySelectorAll('.sockets .socket').length;

  const explicitMods = Array.from(row.querySelectorAll('.explicitMod')).map(
    (el) => el.textContent?.trim() || ''
  );
  const implicitMods = Array.from(row.querySelectorAll('.implicitMod')).map(
    (el) => el.textContent?.trim() || ''
  );
  const pseudoMods = Array.from(row.querySelectorAll('.pseudoMod')).map(
    (el) => el.textContent?.trim() || ''
  );

  return {
    name,
    typeLine: getText(row, '.typeLine') || name,
    priceType,
    priceAmount,
    currency,
    seller,
    itemLevel,
    socketCount,
    explicitMods,
    implicitMods,
    pseudoMods,
  };
}

function getText(parent: Element, selector: string): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || '';
}

// Map Chinese currency names to slugs
const CURRENCY_ALIASES: Record<string, string> = {
  '混沌石': 'chaos-orb',
  '混沌': 'chaos-orb',
  '神圣石': 'divine-orb',
  '神圣': 'divine-orb',
  '崇高石': 'exalted-orb',
  '崇高': 'exalted-orb',
  '点金石': 'regal-orb',
  '点金': 'regal-orb',
  '富豪石': 'regal-orb',
  '富豪': 'regal-orb',
  '改造石': 'alteration-orb',
  '改造': 'alteration-orb',
  '工匠石': 'jeweller-orb',
  '工匠': 'jeweller-orb',
  '链接石': 'fusing-orb',
  '链接': 'fusing-orb',
  '幻色石': 'chromatic-orb',
  '幻色': 'chromatic-orb',
  '机会石': 'chance-orb',
  '机会': 'chance-orb',
  '增幅石': 'augmentation-orb',
  '增幅': 'augmentation-orb',
  '蜕变石': 'transmutation-orb',
  '蜕变': 'transmutation-orb',
  '棱镜': 'prism',
  '工匠棱镜': 'prism',
  '瓦尔宝珠': 'vaal-orb',
  '瓦尔': 'vaal-orb',
  '剥离石': 'annulment-orb',
  '剥离': 'annulment-orb',
  '镜片': 'mirror-of-kalandra',
  '崇高裂片': 'exalted-shard',
  '神圣裂片': 'divine-shard',
  '混沌裂片': 'chaos-shard',
};

function normalizeCurrencySlug(currency: string): string {
  const trimmed = currency.trim();
  if (CURRENCY_ALIASES[trimmed]) return CURRENCY_ALIASES[trimmed];
  // If already a slug format
  if (/^[a-z-]+$/.test(trimmed)) return trimmed;
  return trimmed;
}
