// Regroup similar search results (same seller, item, price)

import type { Enhancer } from './registry';
import { getItemName, getSellerName, getPriceElement } from '../utils/dom';

interface ResultHash {
  seller: string;
  itemName: string;
  price: string;
}

function computeHash(row: Element): ResultHash | null {
  const seller = getSellerName(row);
  const itemName = getItemName(row);
  const priceEl = getPriceElement(row);
  const price = priceEl?.textContent?.trim() || '';

  if (!seller || !itemName || !price) return null;

  return { seller, itemName, price };
}

function hashToString(h: ResultHash): string {
  return `${h.seller}|${h.itemName}|${h.price}`;
}

export const regroupSimilarEnhancer: Enhancer = {
  name: 'regroup-similar',
  enabled: true,

  enhance(row: Element) {
    const resultset = row.closest('.resultset');
    if (!resultset) return;

    const hash = computeHash(row);
    if (!hash) return;

    const key = hashToString(hash);
    const groupKey = `ta-group-${key}`;

    // Check if this row is already processed
    if (row.hasAttribute('data-ta-grouped')) return;

    // Find if there's already a group header for this key
    const existingGroup = resultset.querySelector(
      `[data-ta-group-key="${groupKey}"]`
    );

    if (existingGroup) {
      // Hide this row under existing group
      row.classList.add('ta-grouped-item');
      row.style.display = 'none';

      // Update count
      const countBadge = existingGroup.querySelector('.ta-group-count');
      if (countBadge) {
        const current = parseInt(countBadge.textContent || '1', 10);
        countBadge.textContent = String(current + 1);
      }
    } else {
      // Check if there are multiple rows with the same hash coming after this one
      const allRows = Array.from(
        resultset.querySelectorAll('.resultset > div.row')
      );
      const currentIndex = allRows.indexOf(row);
      const dups = allRows
        .slice(currentIndex + 1)
        .filter((r) => {
          const h = computeHash(r);
          return h && hashToString(h) === key;
        });

      if (dups.length > 0) {
        // Create group header
        const details = row.querySelector('.details');
        if (!details) return;

        const btns = details.querySelector('.btns');
        if (!btns) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'ta-regroup-btn';
        toggleBtn.setAttribute('data-ta-group-key', groupKey);
        toggleBtn.innerHTML = `📦 <span class="ta-group-count">${dups.length + 1}</span> 个相同结果`;

        toggleBtn.addEventListener('click', () => {
          const isExpanded = toggleBtn.classList.toggle('ta-expanded');
          const groupItems = resultset.querySelectorAll(
            `.ta-grouped-item[data-ta-parent-group="${groupKey}"]`
          );
          for (const item of groupItems) {
            (item as HTMLElement).style.display = isExpanded ? '' : 'none';
          }
          toggleBtn.innerHTML = isExpanded
            ? `📦 <span class="ta-group-count">${dups.length + 1}</span> 个相同结果 (展开)`
            : `📦 <span class="ta-group-count">${dups.length + 1}</span> 个相同结果`;
        });

        btns.appendChild(toggleBtn);

        // Mark duplicates
        for (const dup of dups) {
          dup.setAttribute('data-ta-grouped', 'true');
          dup.setAttribute('data-ta-parent-group', groupKey);
          dup.classList.add('ta-grouped-item');
          (dup as HTMLElement).style.display = 'none';
        }
      }

      row.setAttribute('data-ta-grouped', 'true');
    }
  },
};
