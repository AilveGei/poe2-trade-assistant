// Bookmark store — persists trade search bookmarks to chrome.storage.local

import { Storage, STORAGE_KEYS } from '../services/storage';

export interface BookmarkTrade {
  id: string;
  title: string;
  version: 'trade' | 'trade2';
  type: string;
  realm?: string; // e.g. 'poe2', 'poe1'
  league: string;
  slug: string;
  createdAt: number;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  icon?: string;
  trades: BookmarkTrade[];
  archived: boolean;
  createdAt: number;
}

export interface BookmarkData {
  folders: BookmarkFolder[];
  rootTrades?: BookmarkTrade[];
}

let bookmarkData: BookmarkData = { folders: [], rootTrades: [] };
let loaded = false;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class BookmarkStore {
  static async load(): Promise<BookmarkData> {
    if (loaded) return bookmarkData;
    const data = await Storage.get<BookmarkData>(STORAGE_KEYS.BOOKMARKS);
    if (data) {
      bookmarkData = data;
    }
    loaded = true;
    return bookmarkData;
  }

  static async save(): Promise<void> {
    await Storage.set(STORAGE_KEYS.BOOKMARKS, bookmarkData);
  }

  static getFolders(): BookmarkFolder[] {
    return bookmarkData.folders;
  }

  static getActiveFolders(): BookmarkFolder[] {
    return bookmarkData.folders.filter((f) => !f.archived);
  }

  static async createFolder(name: string, icon?: string): Promise<BookmarkFolder> {
    const folder: BookmarkFolder = {
      id: generateId(),
      name,
      icon,
      trades: [],
      archived: false,
      createdAt: Date.now(),
    };
    bookmarkData.folders.push(folder);
    await BookmarkStore.save();
    return folder;
  }

  static async renameFolder(folderId: string, name: string): Promise<void> {
    const folder = bookmarkData.folders.find((f) => f.id === folderId);
    if (folder) {
      folder.name = name;
      await BookmarkStore.save();
    }
  }

  static async archiveFolder(folderId: string, archived: boolean): Promise<void> {
    const folder = bookmarkData.folders.find((f) => f.id === folderId);
    if (folder) {
      folder.archived = archived;
      await BookmarkStore.save();
    }
  }

  static async deleteFolder(folderId: string): Promise<void> {
    bookmarkData.folders = bookmarkData.folders.filter((f) => f.id !== folderId);
    await BookmarkStore.save();
  }

  static getRootTrades(): BookmarkTrade[] {
    return bookmarkData.rootTrades || [];
  }

  static async addTrade(
    folderId: string,
    trade: Omit<BookmarkTrade, 'id' | 'createdAt'>
  ): Promise<BookmarkTrade> {
    const newTrade: BookmarkTrade = {
      ...trade,
      id: generateId(),
      createdAt: Date.now(),
    };

    if (folderId === '__root__') {
      if (!bookmarkData.rootTrades) bookmarkData.rootTrades = [];
      bookmarkData.rootTrades.push(newTrade);
    } else {
      const folder = bookmarkData.folders.find((f) => f.id === folderId);
      if (!folder) throw new Error('Folder not found');
      folder.trades.push(newTrade);
    }

    await BookmarkStore.save();
    return newTrade;
  }

  static async renameTrade(folderId: string, tradeId: string, title: string): Promise<void> {
    const trade = folderId === '__root__'
      ? bookmarkData.rootTrades?.find((t) => t.id === tradeId)
      : bookmarkData.folders.find((f) => f.id === folderId)?.trades.find((t) => t.id === tradeId);
    if (trade) {
      trade.title = title;
      await BookmarkStore.save();
    }
  }

  static async removeTrade(folderId: string, tradeId: string): Promise<void> {
    if (folderId === '__root__') {
      if (bookmarkData.rootTrades) {
        bookmarkData.rootTrades = bookmarkData.rootTrades.filter((t) => t.id !== tradeId);
      }
    } else {
      const folder = bookmarkData.folders.find((f) => f.id === folderId);
      if (folder) {
        folder.trades = folder.trades.filter((t) => t.id !== tradeId);
      }
    }
    await BookmarkStore.save();
  }

  static async reorderTrades(folderId: string, tradeIds: string[]): Promise<void> {
    const folder = bookmarkData.folders.find((f) => f.id === folderId);
    if (folder) {
      const tradeMap = new Map(folder.trades.map((t) => [t.id, t]));
      folder.trades = tradeIds.map((id) => tradeMap.get(id)!).filter(Boolean);
      await BookmarkStore.save();
    }
  }

  static async exportFolders(): Promise<string> {
    const data = JSON.stringify(bookmarkData);
    const bytes = new TextEncoder().encode(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static async importFolders(encoded: string): Promise<void> {
    try {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const data = JSON.parse(new TextDecoder().decode(bytes)) as BookmarkData;
      if (data.folders && Array.isArray(data.folders)) {
        bookmarkData = data;
        await BookmarkStore.save();
      }
    } catch {
      throw new Error('Invalid bookmark data');
    }
  }
}
