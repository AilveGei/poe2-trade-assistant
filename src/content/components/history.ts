// History panel — display recent trade search history

import { HistoryStore, type HistoryEntry } from '../stores/history-store';
import { formatTime } from '../utils/format';
import { createElement } from '../utils/dom';

export class HistoryPanel {
  async render(container: HTMLElement): Promise<void> {
    container.innerHTML = '';
    await HistoryStore.load();
    const entries = HistoryStore.getEntries();

    if (entries.length === 0) {
      const empty = createElement('div', { class: 'ta-empty' });
      empty.textContent = '暂无浏览记录';
      container.appendChild(empty);
      return;
    }

    // Title + clear button
    const toolbar = createElement('div', { class: 'ta-toolbar' });
    const titleEl = createElement('span', { class: 'ta-toolbar-title' });
    titleEl.textContent = `最近 ${entries.length} 条记录`;
    toolbar.appendChild(titleEl);

    const clearBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', async () => {
      await HistoryStore.clear();
      await this.render(container);
    });
    toolbar.appendChild(clearBtn);
    container.appendChild(toolbar);

    // History list
    const list = createElement('div', { class: 'ta-history-list' });
    for (const entry of entries) {
      list.appendChild(this.renderEntry(entry));
    }
    container.appendChild(list);
  }

  private renderEntry(entry: HistoryEntry): HTMLElement {
    const el = createElement('div', { class: 'ta-history-item' });

    const info = createElement('div', { class: 'ta-history-info' });
    info.innerHTML = `
      <div class="ta-history-title">${this.escapeHtml(entry.title)}</div>
      <div class="ta-history-meta">${this.escapeHtml(entry.league)} · ${formatTime(entry.visitedAt)}</div>
    `;
    el.appendChild(info);

    const actions = createElement('div', { class: 'ta-history-actions' });
    const visitBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
    visitBtn.textContent = '跳转';
    visitBtn.addEventListener('click', () => {
      const realm = entry.realm ? `/${entry.realm}` : '';
      const url = `/${entry.version}/search${realm}/${entry.league}/${entry.slug}`;
      window.location.href = url;
    });
    actions.appendChild(visitBtn);
    el.appendChild(actions);

    return el;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
