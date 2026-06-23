// Application orchestrator — wires up sidebar, enhancers, and trade location

import { BookmarkStore } from './stores/bookmark-store';
import { Sidebar } from './components/sidebar';
import { BookmarksPanel } from './components/bookmarks';
import { HistoryPanel } from './components/history';
import { PinnedPanel } from './components/pinned';
import { TradeLocationWatcher } from './services/trade-location';
import { HistoryStore } from './stores/history-store';
import { enhancerRegistry } from './enhancers/registry';
import { regroupSimilarEnhancer } from './enhancers/regroup-similar';
import { pinItemEnhancer, pinManager } from './enhancers/pin-item';
import { highlightModsEnhancer } from './enhancers/highlight-mods';
import { equivalentPricingEnhancer, currencyPricer } from './enhancers/equivalent-pricing';
import { keyboardShortcutEnhancer } from './enhancers/keyboard-shortcut';

export class App {
  private sidebar = new Sidebar();
  private bookmarks = new BookmarksPanel();
  private history = new HistoryPanel();
  private pinned = new PinnedPanel();
  private locationWatcher = new TradeLocationWatcher();

  async init(): Promise<void> {
    // Register tab renderers FIRST (before sidebar.init creates DOM)
    // so switchTab in init finds the callbacks immediately
    this.sidebar.onTab('bookmarks', async (container) => {
      await this.bookmarks.render(container);
    });

    this.sidebar.onTab('history', async (container) => {
      await this.history.render(container);
    });

    this.sidebar.onTab('pinned', (container) => {
      this.pinned.render(container);
      // Listen for pin changes
      const unsub = pinManager.onChange(() => {
        this.pinned.render(container);
      });
      (container as any).__taPinUnsub = unsub;
    });

    this.sidebar.onTab('about', (container) => {
      container.innerHTML = `
        <div class="ta-about">
          <h3>流放之路2 市集交易助手</h3>
          <p>版本: 0.1.0</p>
          <p>增强腾讯服网页市集体验</p>
          <hr>
          <p>功能列表:</p>
          <ul>
            <li>📁 书签管理 — 收藏交易搜索</li>
            <li>📜 浏览历史 — 自动记录</li>
            <li>📌 物品固定 — 暂存比较</li>
            <li>📦 相同结果合并</li>
            <li>💰 等价价格计算</li>
            <li>🎨 词缀高亮</li>
            <li>⌨️ 空格快捷键跳转</li>
          </ul>
          <hr>
          <p>参考: <a href="https://github.com/exile-center/better-trading" target="_blank">Better Trading</a></p>
        </div>
      `;
    });

    // Initialize sidebar — switchTab will now find registered callbacks
    await this.sidebar.init();

    // Watch trade location
    let lastHistoryUrl = '';
    let lastRenderLoc = ''; // track last rendered location to avoid redundant re-renders
    this.locationWatcher.onChange((loc) => {
      this.bookmarks.setLocation(loc);

      if (loc && loc.slug) {
        // Add to history (avoid duplicates for same URL)
        const urlKey = `${loc.version}/${loc.type}/${loc.league}/${loc.slug}`;
        if (urlKey !== lastHistoryUrl) {
          lastHistoryUrl = urlKey;

          // Try to get a title from the page
          let title = `${loc.type} - ${loc.league}`;
          try {
            const searchInput = document.querySelector(
              '.search-panel .search-bar input, .search-left input, .multiselect__input, [placeholder*="搜索"], [placeholder*="查找"]'
            ) as HTMLInputElement;
            if (searchInput?.value) {
              title = `${searchInput.value} - ${loc.league}`;
            }
          } catch {
            // ignore
          }
          HistoryStore.addEntry(loc, title);
        }

        // Update currency rates when on a valid trade page
        if (loc.league && loc.type === 'search') {
          currencyPricer.ensureRates(loc.league).catch(() => {});
        }
      }

      // Only re-render if the location slug actually changed
      const locKey = loc ? `${loc.league}/${loc.slug}` : '';
      if (locKey !== lastRenderLoc) {
        lastRenderLoc = locKey;
        this.sidebar.refreshCurrentTab();
      }
    });

    // Start location watcher
    this.locationWatcher.start();

    // Restore pinned items from storage
    await pinManager.load();

    // Register enhancers
    enhancerRegistry.register(regroupSimilarEnhancer);
    enhancerRegistry.register(pinItemEnhancer);
    enhancerRegistry.register(highlightModsEnhancer);
    enhancerRegistry.register(equivalentPricingEnhancer);
    enhancerRegistry.register(keyboardShortcutEnhancer);

    // Start the enhancer pipeline — use document.body since .resultset
    // may not be inside #trade on the Tencent server
    enhancerRegistry.start(document.body);
  }
}
