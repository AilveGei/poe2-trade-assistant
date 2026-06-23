// Wraps the poe.game.qq.com official trade API
// Content script runs on same origin, so cookies are auto-included

export interface TradeSearchRequest {
  query: {
    status?: { option: 'online' | 'any' };
    stats?: Array<{ type: string; filters: any[]; disabled?: boolean }>;
    filters?: {
      type_filters?: {
        filters: {
          category?: { option: string };
          rarity?: { option: string };
          sale_type?: { option: string };
        };
      };
      trade_filters?: {
        filters: {
          price?: { min?: number; max?: number };
        };
      };
    };
    term?: string;
  };
  sort?: Record<string, string>;
}

interface TradeSearchResponse {
  id: string;
  result: string[];
  total: number;
  inexact?: boolean;
  error?: { code: number; message: string };
}

interface TradeFetchResponse {
  result: Array<{
    id: string;
    listing: {
      indexed: string;
      account: { name: string };
      price: {
        type: string;
        amount: number;
        currency: string;
      };
      whisper?: string;
      whisper_token?: string;
    };
    item: {
      name: string;
      typeLine: string;
      ilvl?: number;
      identified: boolean;
      sockets?: Array<{ group: number }>;
      explicitMods?: string[];
      implicitMods?: string[];
      pseudoMods?: string[];
      properties?: any[];
      icon?: string;
    };
  }>;
  error?: { code: number; message: string };
}

export class TradeApi {
  private baseUrl = 'https://poe.game.qq.com/api/trade2';

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async search(
    league: string,
    request: TradeSearchRequest,
    signal?: AbortSignal
  ): Promise<TradeSearchResponse> {
    const url = `${this.baseUrl}/search/${encodeURIComponent(league)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      throw new Error(`Trade search failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async fetch(
    itemIds: string[],
    queryId: string,
    signal?: AbortSignal
  ): Promise<TradeFetchResponse> {
    const ids = itemIds.slice(0, 10).join(',');
    const url = `${this.baseUrl}/fetch/${ids}?query=${encodeURIComponent(queryId)}`;
    const res = await fetch(url, {
      method: 'GET',
      signal,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      throw new Error(`Trade fetch failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

export const tradeApi = new TradeApi();
