// Sidebar container — the main UI shell injected into the trade site

import { createElement } from '../utils/dom';
import { Storage, STORAGE_KEYS } from '../services/storage';

type TabId = 'bookmarks' | 'history' | 'pinned' | 'about';

interface SidebarState {
  collapsed: boolean;
  activeTab: TabId;
}

export class Sidebar {
  private container!: HTMLElement;
  private toggleBtn!: HTMLElement;
  private tabContent!: HTMLElement;
  private activeTab: TabId = 'bookmarks';
  private collapsed = true;
  private tabCallbacks: Record<TabId, ((container: HTMLElement) => void) | null> = {
    bookmarks: null,
    history: null,
    pinned: null,
    about: null,
  };

  async init(): Promise<void> {
    // Load saved state
    const state = await Storage.get<SidebarState>(STORAGE_KEYS.UI_STATE);
    if (state) {
      this.collapsed = state.collapsed ?? true;
      this.activeTab = state.activeTab || 'bookmarks';
    }

    this.createDOM();
    this.setupToggle();
    this.switchTab(this.activeTab);
  }

  private createDOM(): void {
    // Toggle button
    this.toggleBtn = createElement('button', {
      id: 'ta-toggle-btn',
      class: 'ta-toggle-btn',
      title: '交易助手',
    });
    this.toggleBtn.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon32.png')}" style="width:24px;height:24px">`;
    document.body.appendChild(this.toggleBtn);

    // Sidebar container
    this.container = createElement('div', {
      id: 'ta-sidebar',
      class: `ta-sidebar ${this.collapsed ? 'ta-collapsed' : ''}`,
    });

    // Header
    const header = createElement('div', { class: 'ta-header' });
    header.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon32.png')}" style="width:20px;height:20px;margin-right:8px;vertical-align:middle"><span class="ta-title">交易助手</span>`;
    const closeBtn = createElement('button', { class: 'ta-close-btn' });
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.toggle());
    header.appendChild(closeBtn);

    // Tab bar
    const tabBar = createElement('div', { class: 'ta-tab-bar' });
    const tabs: Array<{ id: TabId; label: string }> = [
      { id: 'bookmarks', label: '书签' },
      { id: 'history', label: '历史' },
      { id: 'pinned', label: '固定' },
      { id: 'about', label: '关于' },
    ];

    for (const tab of tabs) {
      const tabBtn = createElement('button', {
        class: `ta-tab ${this.activeTab === tab.id ? 'ta-tab-active' : ''}`,
        'data-tab': tab.id,
      });
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => this.switchTab(tab.id));
      tabBar.appendChild(tabBtn);
    }

    // Tab content area
    this.tabContent = createElement('div', { class: 'ta-tab-content' });

    this.container.appendChild(header);
    this.container.appendChild(tabBar);
    this.container.appendChild(this.tabContent);
    document.body.appendChild(this.container);
  }

  private setupToggle(): void {
    this.toggleBtn.addEventListener('click', () => this.toggle());
  }

  private toggle(): void {
    this.collapsed = !this.collapsed;
    this.container.classList.toggle('ta-collapsed', this.collapsed);
    this.toggleBtn.classList.toggle('ta-hidden', !this.collapsed);
    this.saveState();
  }

  private switchTab(tabId: TabId): void {
    this.activeTab = tabId;
    this.saveState();

    // Update tab buttons
    const tabs = this.container.querySelectorAll('.ta-tab');
    tabs.forEach((t) => t.classList.remove('ta-tab-active'));
    const activeTab = this.container.querySelector(`.ta-tab[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('ta-tab-active');

    // Clear content
    this.tabContent.innerHTML = '';

    // Call tab renderer
    if (this.tabCallbacks[tabId]) {
      this.tabCallbacks[tabId]!(this.tabContent);
    } else {
      // Default placeholder
      this.tabContent.innerHTML = `<div class="ta-tab-placeholder">${this.getPlaceholder(tabId)}</div>`;
    }
  }

  private getPlaceholder(tabId: TabId): string {
    const placeholders: Record<TabId, string> = {
      bookmarks: '书签功能加载中...',
      history: '历史记录加载中...',
      pinned: '固定物品加载中...',
      about: '加载中...',
    };
    return placeholders[tabId];
  }

  onTab(tabId: TabId, render: (container: HTMLElement) => void): void {
    this.tabCallbacks[tabId] = render;
  }

  refreshCurrentTab(): void {
    const cb = this.tabCallbacks[this.activeTab];
    if (cb) {
      cb(this.tabContent);
    }
  }

  private async saveState(): Promise<void> {
    await Storage.set(STORAGE_KEYS.UI_STATE, {
      collapsed: this.collapsed,
      activeTab: this.activeTab,
    });
  }
}
