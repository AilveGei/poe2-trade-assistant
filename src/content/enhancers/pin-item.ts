// Pin item button — adds a pin button to each result row

import type { Enhancer } from './registry';
import { injectButton, getPriceElement, getItemName } from '../utils/dom';
import { parseTradeLocation } from '../services/trade-location';
import { Storage, STORAGE_KEYS } from '../services/storage';

export interface PinnedItem {
  id: string;
  name: string;
  price: string;
  seller: string;
  version?: string;
  realm?: string;
  league?: string;
  slug?: string;
  html: string;
  pinnedAt: number;
}

type PinListener = (items: PinnedItem[]) => void;

class PinManager {
  private items: PinnedItem[] = [];
  private listeners: PinListener[] = [];

  async load(): Promise<void> {
    const saved = await Storage.get<PinnedItem[]>(STORAGE_KEYS.PINNED);
    if (saved) {
      this.items = saved;
      this.notify();
    }
  }

  getItems(): PinnedItem[] {
    return this.items;
  }

  async add(row: Element): Promise<void> {
    const name = getItemName(row);
    const priceEl = getPriceElement(row);
    const price = priceEl?.textContent?.trim() || '';
    const seller = row.querySelector('.profile-link')?.textContent?.trim() || '';
    const loc = parseTradeLocation();

    const item: PinnedItem = {
      id: Date.now().toString(36),
      name,
      price,
      seller,
      version: loc?.version,
      realm: loc?.realm,
      league: loc?.league,
      slug: loc?.slug,
      html: row.outerHTML,
      pinnedAt: Date.now(),
    };

    this.items.push(item);
    await this.save();
    this.notify();
  }

  async remove(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    await this.save();
    this.notify();
  }

  async clear(): Promise<void> {
    this.items = [];
    await Storage.remove(STORAGE_KEYS.PINNED);
    this.notify();
  }

  onChange(fn: PinListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private async save(): Promise<void> {
    await Storage.set(STORAGE_KEYS.PINNED, this.items);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn(this.items);
    }
  }
}

export const pinManager = new PinManager();

export const pinItemEnhancer: Enhancer = {
  name: 'pin-item',
  enabled: true,

  enhance(row: Element) {
    const id = `ta-pin-${row.getAttribute('data-id') || Math.random().toString(36).slice(2)}`;

    injectButton(row, id, '📌 固定', 'ta-pin-btn', () => {
      pinManager.add(row);
    });
  },
};
