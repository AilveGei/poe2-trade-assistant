// Pinned items panel — display temporarily pinned items

import { pinManager, type PinnedItem } from '../enhancers/pin-item';
import { createElement } from '../utils/dom';
import { formatTime } from '../utils/format';

export class PinnedPanel {
  private containerEl: HTMLElement | null = null;

  render(container: HTMLElement): void {
    this.containerEl = container;
    container.innerHTML = '';

    const items = pinManager.getItems();

    // Toolbar
    const toolbar = createElement('div', { class: 'ta-toolbar' });
    const titleEl = createElement('span', { class: 'ta-toolbar-title' });
    titleEl.textContent = `已固定 ${items.length} 个物品`;
    toolbar.appendChild(titleEl);

    if (items.length > 0) {
      const clearBtn = createElement('button', { class: 'ta-btn ta-btn-sm' });
      clearBtn.textContent = '清空';
      clearBtn.addEventListener('click', () => {
        pinManager.clear();
      });
      toolbar.appendChild(clearBtn);
    }
    container.appendChild(toolbar);

    if (items.length === 0) {
      const empty = createElement('div', { class: 'ta-empty' });
      empty.textContent = '暂无固定物品。在搜索结果中点击"固定"按钮添加';
      container.appendChild(empty);
      return;
    }

    const list = createElement('div', { class: 'ta-pinned-list' });
    for (const item of items) {
      list.appendChild(this.renderItem(item));
    }
    container.appendChild(list);
  }

  private renderItem(item: PinnedItem): HTMLElement {
    const el = createElement('div', { class: 'ta-pinned-item' });

    const info = createElement('div', { class: 'ta-pinned-info' });
    info.innerHTML = `
      <div class="ta-pinned-name">${this.escapeHtml(item.name)}</div>
      <div class="ta-pinned-price">${this.escapeHtml(item.price)}</div>
      <div class="ta-pinned-seller">${this.escapeHtml(item.seller)} · ${formatTime(item.pinnedAt)}</div>
    `;
    el.appendChild(info);

    const actions = createElement('div', { class: 'ta-pinned-actions' });

    if (item.slug && item.league) {
      const visitBtn = createElement('button', { class: 'ta-btn ta-btn-xs' });
      visitBtn.textContent = '跳转';
      visitBtn.addEventListener('click', () => {
        const realm = item.realm ? `/${item.realm}` : '';
        const url = `/${item.version || 'trade2'}/search${realm}/${item.league}/${item.slug}`;
        window.location.href = url;
      });
      actions.appendChild(visitBtn);
    }

    const deleteBtn = createElement('button', { class: 'ta-btn ta-btn-xs ta-btn-danger' });
    deleteBtn.textContent = '移除';
    deleteBtn.addEventListener('click', () => {
      pinManager.remove(item.id);
    });
    actions.appendChild(deleteBtn);
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
