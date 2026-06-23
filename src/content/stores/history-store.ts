// Trade history store — automatically logs visited trade searches

import { Storage, STORAGE_KEYS } from '../services/storage';
import type { TradeLocation } from '../services/trade-location';

const MAX_HISTORY = 50;

export interface HistoryEntry {
  id: string;
  version: string;
  type: string;
  realm?: string;
  league: string;
  slug: string;
  title: string;
  visitedAt: number;
}

interface HistoryData {
  entries: HistoryEntry[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class HistoryStore {
  private static data: HistoryData = { entries: [] };
  private static loaded = false;

  static async load(force = false): Promise<HistoryData> {
    if (HistoryStore.loaded && !force) return HistoryStore.data;
    const data = await Storage.get<HistoryData>(STORAGE_KEYS.HISTORY);
    if (data) {
      HistoryStore.data = data;
    } else {
      HistoryStore.data = { entries: [] };
    }
    HistoryStore.loaded = true;
    return HistoryStore.data;
  }

  static async clear(): Promise<void> {
    HistoryStore.data = { entries: [] };
    HistoryStore.loaded = false;
    await Storage.remove(STORAGE_KEYS.HISTORY);
  }

  private static async save(): Promise<void> {
    await Storage.set(STORAGE_KEYS.HISTORY, HistoryStore.data);
  }

  static getEntries(): HistoryEntry[] {
    return HistoryStore.data.entries;
  }

  static async addEntry(
    location: TradeLocation,
    title: string
  ): Promise<void> {
    if (!location || !location.slug) return;

    // Remove duplicate if exists (same slug)
    HistoryStore.data.entries = HistoryStore.data.entries.filter(
      (e) => !(e.slug === location.slug && e.league === location.league)
    );

    // Add new entry
    HistoryStore.data.entries.unshift({
      id: generateId(),
      version: location.version,
      type: location.type,
      realm: location.realm,
      league: location.league,
      slug: location.slug,
      title: title || `${location.type} - ${location.league}`,
      visitedAt: Date.now(),
    });

    // Trim to max
    if (HistoryStore.data.entries.length > MAX_HISTORY) {
      HistoryStore.data.entries = HistoryStore.data.entries.slice(0, MAX_HISTORY);
    }

    await HistoryStore.save();
  }
}
