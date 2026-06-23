// Equivalent pricing — calculate chaos-orb equivalent for non-chaos prices
// Uses the official trade API to query currency listing prices

import type { Enhancer } from './registry';
import { Storage, STORAGE_KEYS } from '../services/storage';
import { tradeApi } from '../services/trade-api';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CurrencyRate {
  currency: string;
  chaosEquivalent: number;
  updatedAt: number;
}

// Map Chinese currency names from item.typeLine to internal IDs
const CURRENCY_TYPELINE_MAP: Record<string, string> = {
  '混沌石': 'chaos-orb',
  '神圣石': 'divine-orb',
  '崇高石': 'exalted-orb',
  '剥离石': 'annulment-orb',
  '瓦尔宝珠': 'vaal-orb',
  '富豪石': 'regal-orb',
  '机会石': 'chance-orb',
  '链接石': 'fusing-orb',
  '工匠石': 'jeweller-orb',
  '幻色石': 'chromatic-orb',
  '改造石': 'alteration-orb',
  '点金石': 'regal-orb',
  '增幅石': 'augmentation-orb',
  '蜕变石': 'transmutation-orb',
};

const API_REQUEST_DELAY = 1500; // ms between API calls to avoid rate limiting

class CurrencyPricer {
  private rates: Map<string, number> = new Map();
  private lastFetch = 0;
  private fetching = false;
  private currentLeague = '';

  async getRate(currencyId: string): Promise<number | undefined> {
    return this.rates.get(currencyId);
  }

  async ensureRates(league: string): Promise<void> {
    // Skip if already fetching
    if (this.fetching) return;

    // Cache hit: same league, within TTL, have rates
    if (
      this.currentLeague === league &&
      Date.now() - this.lastFetch < CACHE_TTL_MS &&
      this.rates.size > 1
    ) return;

    // Try loading from storage cache
    const cacheKey = `${STORAGE_KEYS.CURRENCY_CACHE}${league}`;
    const cached = await Storage.get<CurrencyRate[]>(cacheKey);
    if (cached && cached.length > 0) {
      const fresh = cached.filter((r) => Date.now() - r.updatedAt < CACHE_TTL_MS);
      if (fresh.length === cached.length) {
        this.rates.clear();
        for (const r of fresh) {
          this.rates.set(r.currency, r.chaosEquivalent);
        }
        this.lastFetch = Date.now();
        this.currentLeague = league;
        return;
      }
    }

    // Fetch from API
    this.fetching = true;
    try {
      const results = await this.fetchCurrencyRates(league);
      const rates: CurrencyRate[] = [];

      this.rates.clear();
      for (const [currencyId, chaosEq] of results) {
        this.rates.set(currencyId, chaosEq);
        rates.push({
          currency: currencyId,
          chaosEquivalent: chaosEq,
          updatedAt: Date.now(),
        });
      }

      await Storage.set(cacheKey, rates, CACHE_TTL_MS);
      this.lastFetch = Date.now();
      this.currentLeague = league;
    } catch (err) {
      console.warn('[TA] Currency rate fetch failed (non-critical):', err);
    } finally {
      this.fetching = false;
    }
  }

  private async fetchCurrencyRates(
    league: string
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    result.set('chaos-orb', 1);

    // Single search for all currency listings (not one per currency)
    const searchRes = await tradeApi.search(league, {
      query: {
        status: { option: 'online' },
        filters: {
          type_filters: {
            filters: {
              category: { option: 'currency' },
            },
          },
        },
      },
      sort: { price: 'asc' },
    });

    if (!searchRes.result || searchRes.result.length === 0) {
      return result;
    }

    // Fetch up to 30 results in batches of 10, with delays between batches
    const allIds = searchRes.result.slice(0, 30);
    const pricesByCurrency = new Map<string, number[]>();

    for (let i = 0; i < allIds.length; i += 10) {
      if (i > 0) {
        await delay(API_REQUEST_DELAY);
      }

      const batch = allIds.slice(i, i + 10);
      const fetchRes = await tradeApi.fetch(batch, searchRes.id);
      if (!fetchRes.result) continue;

      for (const r of fetchRes.result) {
        if (!r.listing?.price) continue;

        // Determine currency being sold from the item typeLine
        const typeLine = (r.item?.typeLine || r.item?.name || '').trim();
        const currencyId = CURRENCY_TYPELINE_MAP[typeLine];
        if (!currencyId) continue;

        // price.amount is chaos-orb cost for 1 of this currency
        if (!pricesByCurrency.has(currencyId)) {
          pricesByCurrency.set(currencyId, []);
        }
        pricesByCurrency.get(currencyId)!.push(r.listing.price.amount);
      }
    }

    // Calculate median per currency
    for (const [id, prices] of pricesByCurrency) {
      if (prices.length > 0) {
        result.set(id, medianOf(prices));
      }
    }

    return result;
  }

  /**
   * Try to get chaos equivalent from the DOM price display directly
   * (used as fallback when API fails)
   */
  async getChaosEquivalent(
    priceAmount: number,
    currencyName: string
  ): Promise<{ chaos: number; divine?: number } | null> {
    const slug = this.normalizeSlug(currencyName);
    if (slug === 'chaos-orb') return null;

    const rate = this.rates.get(slug);
    if (!rate || rate <= 0) return null;

    const chaosEq = priceAmount * rate;

    // If chaos value is high, also show divine equivalent
    let divine: number | undefined;
    const divineRate = this.rates.get('divine-orb');
    if (divineRate && divineRate > 0 && chaosEq >= divineRate) {
      divine = chaosEq / divineRate;
    }

    return { chaos: chaosEq, divine };
  }

  private normalizeSlug(name: string): string {
    // Chinese name mapping
    const map: Record<string, string> = {
      '混沌石': 'chaos-orb',
      '混沌': 'chaos-orb',
      '神圣石': 'divine-orb',
      '神圣': 'divine-orb',
      '崇高石': 'exalted-orb',
      '崇高': 'exalted-orb',
      '剥离石': 'annulment-orb',
      '剥离': 'annulment-orb',
      '瓦尔宝珠': 'vaal-orb',
      '瓦尔': 'vaal-orb',
      '富豪石': 'regal-orb',
      '富豪': 'regal-orb',
      '改造石': 'alteration-orb',
      '改造': 'alteration-orb',
      '工匠石': 'jeweller-orb',
      '工匠': 'jeweller-orb',
      '链接石': 'fusing-orb',
      '链接': 'fusing-orb',
    };

    return map[name] || name;
  }
}

export const currencyPricer = new CurrencyPricer();

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export const equivalentPricingEnhancer: Enhancer = {
  name: 'equivalent-pricing',
  enabled: true,

  async enhance(row: Element) {
    const priceEl = row.querySelector('.price') || row.querySelector('[data-field="price"]');
    if (!priceEl) return;

    const text = priceEl.textContent?.trim() || '';
    const match = text.match(/([\d.]+)\s*(.+)/);
    if (!match) return;

    const amount = parseFloat(match[1]);
    const currencyName = match[2].trim();

    // Skip if already chaos (no conversion needed)
    if (currencyName.includes('混沌') || currencyName === 'chaos') return;

    const eq = await currencyPricer.getChaosEquivalent(amount, currencyName);
    if (!eq) return;

    // Inject equivalent price display
    const eqSpan = document.createElement('span');
    eqSpan.className = 'ta-equivalent-price';
    eqSpan.title = '基于市集通货挂牌价估算';

    let textContent = `≈ ${eq.chaos.toFixed(1)} 混沌`;
    if (eq.divine !== undefined) {
      textContent += ` (≈ ${eq.divine.toFixed(1)} 神圣)`;
    }
    eqSpan.textContent = textContent;

    // Insert after the price element
    priceEl.parentElement?.insertBefore(eqSpan, priceEl.nextSibling);
  },
};
