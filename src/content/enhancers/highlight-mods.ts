// Highlight search result mods that match the active search filters

import type { Enhancer } from './registry';

// Read active stat filters from the search panel (Tencent server DOM)
function getSearchFilterMods(): string[] {
  const mods: string[] = [];

  // Tencent server: expanded stat filter groups inside .search-advanced-pane.brown
  // Only include actively enabled filters (not .disabled)
  const filterGroups = document.querySelectorAll(
    '.search-advanced-pane.brown .filter-group.expanded .filter.full-span:not(.disabled)'
  );
  for (const group of filterGroups) {
    // Extract mod text from the clickable title
    // Structure: <span class="filter-title-clickable">
    //   <i class="mutate-type">外延</i><span>驱灵祭坛有 #% 的概率...</span>
    // </span>
    const titleEl = group.querySelector('.filter-title-clickable');
    if (!titleEl) continue;

    const spanEl = titleEl.querySelector('span');
    let text = spanEl?.textContent?.trim();

    if (!text) {
      // Fallback: strip the type label from full text content
      text = titleEl.textContent?.trim() || '';
      const iEl = titleEl.querySelector('i.mutate-type');
      if (iEl) {
        text = text.replace(iEl.textContent?.trim() || '', '').trim();
      }
    }

    if (text) mods.push(text);
  }

  return mods;
}

// Check if a mod text matches any filter pattern (simple substring match on Chinese core)
function modMatchesFilter(modText: string, filterPatterns: string[]): boolean {
  // Strip non-Chinese prefix (e.g. "S1 [35—70]", "[10]") and normalize whitespace
  const cleanMod = modText
    .trim()
    .replace(/^[^一-鿿]+/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  // Numbers and Chinese number words are variable between filter and results
  const modCore = cleanMod
    .replace(/\d+/g, '')
    .replace(/[一二两]/g, '');

  for (const pattern of filterPatterns) {
    // Build filter core: remove variable parts (#, digits, Chinese number words, %)
    const filterCore = pattern
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/[#一二两]/g, '')
      .replace(/\d+/g, '')
      .replace(/%/g, '');

    if (filterCore.length > 2 && modCore.includes(filterCore)) return true;
  }
  return false;
}

export const highlightModsEnhancer: Enhancer = {
  name: 'highlight-mods',
  enabled: true,

  enhance(row: Element) {
    const filters = getSearchFilterMods();
    if (filters.length === 0) return;

    // Check explicit mods
    const explicitMods = row.querySelectorAll('.item-mod--explicit');
    for (const mod of explicitMods) {
      const text = mod.textContent?.trim() || '';
      if (modMatchesFilter(text, filters)) {
        (mod as HTMLElement).style.backgroundColor = '#2a4a2a';
        (mod as HTMLElement).style.color = '#8f8';
        (mod as HTMLElement).style.fontWeight = 'bold';
      }
    }

    // Check implicit mods
    const implicitMods = row.querySelectorAll('.item-mod--implicit');
    for (const mod of implicitMods) {
      const text = mod.textContent?.trim() || '';
      if (modMatchesFilter(text, filters)) {
        (mod as HTMLElement).style.backgroundColor = '#2a4a2a';
        (mod as HTMLElement).style.color = '#8f8';
        (mod as HTMLElement).style.fontWeight = 'bold';
      }
    }

    // Check pseudo / total mods
    const pseudoMods = row.querySelectorAll('.item-mod--pseudo, .item-mod--total');
    for (const mod of pseudoMods) {
      const text = mod.textContent?.trim() || '';
      if (modMatchesFilter(text, filters)) {
        (mod as HTMLElement).style.backgroundColor = '#2a2a4a';
        (mod as HTMLElement).style.color = '#88f';
        (mod as HTMLElement).style.fontWeight = 'bold';
      }
    }
  },
};
