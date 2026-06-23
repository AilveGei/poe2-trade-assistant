// DOM query and manipulation helpers specific to the POE trade site

export function waitForElement(selector: string, timeoutMs = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeoutMs);
  });
}

export function waitForElements(
  selector: string,
  container: Element,
  timeoutMs = 10000
): Promise<Element[]> {
  return new Promise((resolve) => {
    const existing = Array.from(container.querySelectorAll(selector));
    if (existing.length > 0) return resolve(existing);

    const observer = new MutationObserver(() => {
      const els = Array.from(container.querySelectorAll(selector));
      if (els.length > 0) {
        observer.disconnect();
        resolve(els);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve([]);
    }, timeoutMs);
  });
}

export function getResultRows(): NodeListOf<Element> {
  return document.querySelectorAll('.resultset > div.row');
}

export function isEnhanced(row: Element): boolean {
  return row.hasAttribute('data-ta-enhanced');
}

export function markEnhanced(row: Element): void {
  row.setAttribute('data-ta-enhanced', 'true');
}

export function getPriceElement(row: Element): Element | null {
  return row.querySelector('.price') || row.querySelector('[data-field="price"]');
}

export function getWhisperButton(row: Element): HTMLAnchorElement | null {
  return row.querySelector('a.pm-btn');
}

export function getItemName(row: Element): string {
  const header = row.querySelector('.itemHeader');
  return header?.textContent?.trim() || '';
}

export function getSellerName(row: Element): string {
  const link = row.querySelector('.profile-link [href]');
  if (!link) return '';
  const href = link.getAttribute('href') || '';
  return href.replace('/account/view-profile/', '').replace(/^\//, '');
}

export function getItemLevel(row: Element): number {
  const el = row.querySelector('.itemLevel');
  if (!el) return 0;
  const match = el.textContent?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function getSockets(row: Element): number {
  return row.querySelectorAll('.sockets .socket').length;
}

export function getExplicitMods(row: Element): string[] {
  return Array.from(row.querySelectorAll('.explicitMod')).map((el) => el.textContent?.trim() || '');
}

export function getImplicitMods(row: Element): string[] {
  return Array.from(row.querySelectorAll('.implicitMod')).map((el) => el.textContent?.trim() || '');
}

export function getPseudoMods(row: Element): string[] {
  return Array.from(row.querySelectorAll('.pseudoMod')).map((el) => el.textContent?.trim() || '');
}

export function injectButton(
  row: Element,
  id: string,
  label: string,
  className: string,
  onClick: () => void
): HTMLButtonElement {
  let container = row.querySelector('.details .btns');
  if (!container) {
    container = document.createElement('div');
    container.className = 'btns';
    const details = row.querySelector('.details');
    if (details) details.appendChild(container);
  }

  const existing = container.querySelector(`#${id}`);
  if (existing) return existing as HTMLButtonElement;

  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = label;
  btn.className = className;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  container.appendChild(btn);
  return btn;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (string | HTMLElement)[] = []
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}
