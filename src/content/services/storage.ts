// chrome.storage.local wrapper with TTL support

export interface ExpiryEntry<T> {
  data: T;
  _expiry: number; // timestamp in ms
}

export class Storage {
  static async get<T>(key: string): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    const entry = result[key];
    if (!entry) return undefined;

    // Check if it's an expiry entry
    if (typeof entry === 'object' && entry !== null && '_expiry' in entry) {
      if (entry._expiry <= Date.now()) {
        await chrome.storage.local.remove(key);
        return undefined;
      }
      return entry.data as T;
    }

    return entry as T;
  }

  static async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    let data: any = value;
    if (ttlMs !== undefined) {
      data = {
        data: value,
        _expiry: Date.now() + ttlMs,
      };
    }
    await chrome.storage.local.set({ [key]: data });
  }

  static async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  static async getKeysByPrefix(prefix: string): Promise<Record<string, any>> {
    const all = await chrome.storage.local.get(null);
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }
    return result;
  }
}

// Storage keys
export const STORAGE_KEYS = {
  BOOKMARKS: 'ta_bookmarks',
  HISTORY: 'ta_history',
  CURRENCY_CACHE: 'ta_currency_cache_',
  UI_STATE: 'ta_ui_state',
  EXPANDED_FOLDERS: 'ta_expanded_folders',
  PINNED: 'ta_pinned',
} as const;
