// Bookmarks panel — folder and trade management UI

import { BookmarkStore, type BookmarkFolder, type BookmarkTrade } from '../stores/bookmark-store';
import type { TradeLocation } from '../services/trade-location';
import { Storage, STORAGE_KEYS } from '../services/storage';
import { createElement } from '../utils/dom';
import { escapeHtml, showToast } from '../utils/format';

export class BookmarksPanel {
  private currentLocation: TradeLocation | null = null;
  private _rendering = false;

  setLocation(loc: TradeLocation | null): void {
    this.currentLocation = loc;
  }

  async render(container: HTMLElement): Promise<void> {
    // Guard: skip if a previous async render is still in flight
    // to prevent interleaved DOM operations causing duplicates
    if (this._rendering) return;
    this._rendering = true;
    try {
      // Save expanded folder states before clearing DOM (in-memory for current render,
      // plus reload from storage for cross-page persistence)
      const expandedFolders = this.getExpandedFolderIds(container);
      if (expandedFolders.size === 0) {
        // On page reload, restore from storage
        const saved = await Storage.get<string[]>(STORAGE_KEYS.EXPANDED_FOLDERS);
        if (saved) saved.forEach((id) => expandedFolders.add(id));
      }

      this.tabContentEl = container;
      container.innerHTML = '';
      await BookmarkStore.load();
      const folders = BookmarkStore.getActiveFolders();

      // Current search status bar
      const loc = this.currentLocation;
      if (loc && loc.slug) {
        const itemName = getSearchItemName();
        const statusBar = createElement('div', { class: 'ta-status-bar' });
        statusBar.innerHTML = `
          <span class="ta-status-label">搜索</span>
          <span class="ta-status-name">${escapeHtml(itemName || '未知物品')}</span>
          <span class="ta-status-league">${escapeHtml(loc.league)}</span>
        `;
        // Retry reading the search input — the SPA may not have populated it yet
        if (!itemName) {
          this.retrySearchName(statusBar);
        }
        const saveToBtn = createElement('button', { class: 'ta-btn ta-btn-sm ta-btn-primary' });
        saveToBtn.textContent = '保存到插件书签';
        saveToBtn.title = '将当前搜索链接保存到插件书签';
        saveToBtn.addEventListener('click', () => this.promptSaveToFolder());
        statusBar.appendChild(saveToBtn);
        container.appendChild(statusBar);
      }

      // Toolbar
      const toolbar = createElement('div', { class: 'ta-toolbar' });
      const addFolderBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
      addFolderBtn.textContent = '+ 新建文件夹';
      addFolderBtn.addEventListener('click', () => this.promptCreateFolder());
      toolbar.appendChild(addFolderBtn);

      const exportBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
      exportBtn.textContent = '导出';
      exportBtn.addEventListener('click', () => this.exportAll());
      toolbar.appendChild(exportBtn);

      const importBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
      importBtn.textContent = '导入';
      importBtn.addEventListener('click', () => this.importAll());
      toolbar.appendChild(importBtn);

      container.appendChild(toolbar);

      // Root-level trades
      const rootTrades = BookmarkStore.getRootTrades();
      if (rootTrades.length > 0) {
        container.appendChild(this.renderRootSection(rootTrades));
      }

      // Folder list
      if (folders.length === 0 && rootTrades.length === 0) {
        const empty = createElement('div', { class: 'ta-empty' });
        empty.innerHTML = '暂无插件书签<br><span style="font-size:11px;color:#555">先搜索物品，再点上方「保存到插件书签」</span>';
        container.appendChild(empty);
        return;
      }

      const folderList = createElement('div', { class: 'ta-folder-list' });
      for (const folder of folders) {
        const el = this.renderFolder(folder);
        // Restore expanded state
        if (expandedFolders.has(folder.id)) {
          el.classList.add('ta-folder-expanded');
        }
        folderList.appendChild(el);
      }
      container.appendChild(folderList);
    } finally {
      this._rendering = false;
    }
  }

  private renderRootSection(trades: BookmarkTrade[]): HTMLElement {
    const section = createElement('div', { class: 'ta-folder' });

    const header = createElement('div', { class: 'ta-folder-header' });
    header.innerHTML = '<span class="ta-folder-icon">📂</span>'
      + '<span class="ta-folder-name" style="color:#888;font-style:italic;">未分类</span>'
      + `<span class="ta-folder-count">${trades.length}</span>`;

    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ta-folder-actions')) return;
      section.classList.toggle('ta-folder-expanded');
    });

    section.appendChild(header);

    const tradeList = createElement('div', { class: 'ta-trade-list' });
    for (const trade of trades) {
      tradeList.appendChild(this.renderTrade(trade, '__root__'));
    }
    section.appendChild(tradeList);

    section.classList.add('ta-folder-expanded');
    return section;
  }

  private renderFolder(folder: BookmarkFolder): HTMLElement {
    const el = createElement('div', { class: 'ta-folder' });
    el.setAttribute('data-folder-id', folder.id);

    // Folder header
    const header = createElement('div', { class: 'ta-folder-header' });
    header.innerHTML = `<span class="ta-folder-icon">📁</span>
      <span class="ta-folder-name">${escapeHtml(folder.name)}</span>
      <span class="ta-folder-count">${folder.trades.length}</span>`;

    const actions = createElement('div', { class: 'ta-folder-actions' });

    const saveBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    saveBtn.title = '收藏当前搜索到此文件夹';
    saveBtn.innerHTML = '➕';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveCurrentTrade(folder.id);
    });
    actions.appendChild(saveBtn);

    const renameBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    renameBtn.title = '重命名';
    renameBtn.innerHTML = '✏️';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.promptRenameFolder(folder);
    });
    actions.appendChild(renameBtn);

    const archiveBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    archiveBtn.title = '归档';
    archiveBtn.innerHTML = '📦';
    archiveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await BookmarkStore.archiveFolder(folder.id, true);
      await this.render(this.tabContentEl!);
    });
    actions.appendChild(archiveBtn);

    header.appendChild(actions);
    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ta-folder-actions')) return;
      el.classList.toggle('ta-folder-expanded');
      this.saveExpandedFolders();
    });

    // Drop target for dragging root trades into this folder
    header.addEventListener('dragover', (e) => {
      const dragEl = document.querySelector('.ta-dragging');
      if (!dragEl) return;
      e.preventDefault();
      header.classList.add('ta-folder-drag-over');
    });
    header.addEventListener('dragleave', () => {
      header.classList.remove('ta-folder-drag-over');
    });
    header.addEventListener('drop', async (e) => {
      e.preventDefault();
      header.classList.remove('ta-folder-drag-over');
      const dragEl = document.querySelector('.ta-dragging');
      if (!dragEl) return;
      const tradeId = dragEl.getAttribute('data-drag-id');
      if (!tradeId) return;

      const rootTrades = BookmarkStore.getRootTrades();
      const trade = rootTrades.find((t) => t.id === tradeId);
      if (!trade) return;

      await BookmarkStore.addTrade(folder.id, {
        title: trade.title,
        version: trade.version,
        type: trade.type,
        realm: trade.realm,
        league: trade.league,
        slug: trade.slug,
      });
      await BookmarkStore.removeTrade('__root__', tradeId);
      await this.render(this.tabContentEl!);
      showToast(`已移动到「${folder.name}」`);
    });

    el.appendChild(header);

    // Trade list
    const tradeList = createElement('div', { class: 'ta-trade-list' });
    if (folder.trades.length === 0) {
      tradeList.innerHTML = '<div class="ta-empty ta-empty-sm">暂无收藏</div>';
    } else {
      for (const trade of folder.trades) {
        tradeList.appendChild(this.renderTrade(trade, folder.id));
      }
    }
    el.appendChild(tradeList);

    return el;
  }

  private renderTrade(trade: BookmarkTrade, folderId: string): HTMLElement {
    const el = createElement('div', { class: 'ta-trade-item' });
    el.setAttribute('title', `${trade.league} / ${trade.type}`);

    // Make root-level trades draggable into folders
    if (folderId === '__root__') {
      el.draggable = true;
      el.addEventListener('dragstart', () => {
        el.classList.add('ta-dragging');
        el.setAttribute('data-drag-id', trade.id);
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('ta-dragging');
        document.querySelectorAll('.ta-folder-drag-over').forEach((el) => el.classList.remove('ta-folder-drag-over'));
      });
    }

    const info = createElement('div', { class: 'ta-trade-info' });
    info.innerHTML = `
      <div class="ta-trade-title">${escapeHtml(trade.title)}</div>
      <div class="ta-trade-meta">${escapeHtml(trade.league)}</div>
    `;
    el.appendChild(info);

    const actions = createElement('div', { class: 'ta-trade-actions' });

    const visitBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    visitBtn.title = '跳转';
    visitBtn.innerHTML = '🔗';
    visitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const realm = trade.realm ? `/${trade.realm}` : '';
      const url = `/${trade.version}/search${realm}/${trade.league}/${trade.slug}`;
      window.location.href = url;
    });
    actions.appendChild(visitBtn);

    const renameBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    renameBtn.title = '重命名';
    renameBtn.innerHTML = '✏️';
    renameBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const title = prompt('输入新名称:', trade.title);
      if (title && title.trim()) {
        await BookmarkStore.renameTrade(folderId, trade.id, title.trim());
        await this.render(this.tabContentEl!);
      }
    });
    actions.appendChild(renameBtn);

    const deleteBtn = createElement('button', { class: 'ta-btn ta-btn-xs ta-btn-danger' });
    deleteBtn.title = '删除';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await BookmarkStore.removeTrade(folderId, trade.id);
      await this.render(this.tabContentEl!);
    });
    actions.appendChild(deleteBtn);

    el.appendChild(actions);
    return el;
  }

  private async promptSaveToFolder(): Promise<void> {
    const loc = this.currentLocation;
    if (!loc || !loc.slug) {
      showToast('请先进行一个物品搜索');
      return;
    }

    const itemName = getSearchItemName();
    const defaultTitle = itemName ? `${itemName} - ${loc.league}` : `${loc.type} - ${loc.league}`;
    const result = await this.showSaveDialog(defaultTitle);
    if (!result) return;

    await BookmarkStore.addTrade(result.folderId, {
      title: result.title,
      version: loc.version,
      type: loc.type,
      realm: loc.realm,
      league: loc.league,
      slug: loc.slug,
    });

    showToast('已收藏到书签');
    await this.render(this.tabContentEl!);
  }

  private showSaveDialog(defaultTitle: string): Promise<{ title: string; folderId: string } | null> {
    return new Promise((resolve) => {
      const overlay = createElement('div', { class: 'ta-modal-overlay' });
      const modal = createElement('div', { class: 'ta-modal' });

      // Header
      const header = createElement('div', { class: 'ta-modal-header' });
      header.textContent = '保存到书签';
      modal.appendChild(header);

      // Body
      const body = createElement('div', { class: 'ta-modal-body' });

      // Name input
      const nameField = createElement('div', { class: 'ta-modal-field' });
      const nameLabel = createElement('label', { class: 'ta-modal-label' });
      nameLabel.textContent = '名称';
      nameField.appendChild(nameLabel);
      const nameInput = createElement('input', { class: 'ta-modal-input' }) as HTMLInputElement;
      nameInput.type = 'text';
      nameInput.value = defaultTitle;
      nameField.appendChild(nameInput);
      body.appendChild(nameField);

      // Folder selection
      const folderField = createElement('div', { class: 'ta-modal-field' });
      const folderLabel = createElement('label', { class: 'ta-modal-label' });
      folderLabel.textContent = '选择文件夹';
      folderField.appendChild(folderLabel);

      const options = createElement('div', { class: 'ta-folder-options' });

      // Root-level option
      const rootOpt = this.createRadioOption('__root__', '不选择文件夹（保存到最外层）', true);
      options.appendChild(rootOpt);

      // Folder options
      const folders = BookmarkStore.getActiveFolders();
      for (const folder of folders) {
        const opt = this.createRadioOption(folder.id, '📁 ' + folder.name, false);
        options.appendChild(opt);
      }

      folderField.appendChild(options);
      body.appendChild(folderField);
      modal.appendChild(body);

      // Footer
      const footer = createElement('div', { class: 'ta-modal-footer' });

      const cancelBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
      cancelBtn.textContent = '取消';
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });
      footer.appendChild(cancelBtn);

      const saveBtn = createElement('button', { class: 'ta-btn ta-btn-sm ta-btn-primary' });
      saveBtn.textContent = '保存';
      saveBtn.addEventListener('click', () => {
        const title = nameInput.value.trim();
        if (!title) {
          showToast('请输入名称');
          return;
        }
        const selected = options.querySelector('input[type="radio"]:checked') as HTMLInputElement;
        if (!selected) return;
        overlay.remove();
        resolve({ title, folderId: selected.value });
      });
      footer.appendChild(saveBtn);

      modal.appendChild(footer);
      overlay.appendChild(modal);

      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      this.tabContentEl?.appendChild(overlay);

      nameInput.focus();
      nameInput.select();

      // Keyboard shortcuts
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      });
    });
  }

  private createRadioOption(value: string, label: string, checked: boolean): HTMLElement {
    const el = createElement('label', { class: 'ta-folder-option' });
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'ta-save-folder';
    radio.value = value;
    radio.checked = checked;
    const span = createElement('span');
    span.textContent = label;
    el.appendChild(radio);
    el.appendChild(span);
    return el;
  }

  /** Collect IDs of currently expanded folders from the rendered DOM */
  private getExpandedFolderIds(container: HTMLElement): Set<string> {
    const ids = new Set<string>();
    if (!container || !container.querySelector) return ids;
    for (const el of container.querySelectorAll('.ta-folder.ta-folder-expanded')) {
      const id = el.getAttribute('data-folder-id');
      if (id) ids.add(id);
    }
    return ids;
  }

  private async promptCreateFolder(): Promise<void> {
    const name = prompt('输入文件夹名称:');
    if (name && name.trim()) {
      await BookmarkStore.createFolder(name.trim());
      await this.render(this.tabContentEl!);
    }
  }

  private async promptRenameFolder(folder: BookmarkFolder): Promise<void> {
    const name = prompt('输入新名称:', folder.name);
    if (name && name.trim()) {
      await BookmarkStore.renameFolder(folder.id, name.trim());
      await this.render(this.tabContentEl!);
    }
  }

  private async saveCurrentTrade(folderId: string): Promise<void> {
    const loc = this.currentLocation;
    if (!loc || !loc.slug) {
      showToast('请先进行一个物品搜索');
      return;
    }

    const itemName = getSearchItemName();
    const defaultTitle = itemName ? `${itemName} - ${loc.league}` : `${loc.type} - ${loc.league}`;
    const result = await this.showSaveDialog(defaultTitle);
    if (!result) return;

    await BookmarkStore.addTrade(result.folderId, {
      title: result.title,
      version: loc.version,
      type: loc.type,
      realm: loc.realm,
      league: loc.league,
      slug: loc.slug,
    });

    showToast('已收藏到书签');
    await this.render(this.tabContentEl!);
  }

  private async exportAll(): Promise<void> {
    const data = await BookmarkStore.exportFolders();
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poe2-bookmarks-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('书签已导出');
  }

  private async importAll(): Promise<void> {
    const data = await this.pickImportFile();
    if (!data) return;
    try {
      await BookmarkStore.importFolders(data.trim());
      await this.render(this.tabContentEl!);
      showToast('导入成功');
    } catch {
      showToast('导入失败，数据格式不正确');
    }
  }

  private pickImportFile(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt';
      input.style.display = 'none';
      input.addEventListener('change', () => {
        document.body.removeChild(input);
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => { showToast('读取文件失败'); resolve(null); };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  private tabContentEl: HTMLElement | null = null;

  private saveExpandedFolders(): void {
    if (!this.tabContentEl) return;
    const ids: string[] = [];
    for (const el of this.tabContentEl.querySelectorAll('.ta-folder.ta-folder-expanded')) {
      const id = el.getAttribute('data-folder-id');
      if (id) ids.push(id);
    }
    Storage.set(STORAGE_KEYS.EXPANDED_FOLDERS, ids);
  }

  /** Retry reading the search input — the SPA populates it asynchronously */
  private retrySearchName(statusBar: HTMLElement, attempts = 8): void {
    const nameEl = statusBar.querySelector('.ta-status-name');
    if (!nameEl) return;
    let tries = 0;
    const check = () => {
      const name = getSearchItemName();
      if (name) {
        nameEl.textContent = name;
        return;
      }
      tries++;
      if (tries < attempts) setTimeout(check, 500);
    };
    setTimeout(check, 500);
  }
}

// Try to extract what the user is searching for from the trade site DOM
function getSearchItemName(): string {
  // Common selectors for the search name/query field on the trade site
  const selectors = [
    '.search-panel .search-bar input',
    '.search-left input',
    'input.multiselect__input',
    'input[placeholder*="搜索"]',
    'input[placeholder*="查找"]',
    'input[placeholder*="物品"]',
    '.search-panel input[name="q"]',
    '.search-panel input[type="text"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLInputElement;
    if (el?.value?.trim()) {
      return el.value.trim();
    }
  }

  // Fallback: try to find the page title or search result header
  const title = document.querySelector('.search-panel-title, .search-result-info');
  if (title?.textContent?.trim()) {
    return title.textContent.trim();
  }

  return '';
}
