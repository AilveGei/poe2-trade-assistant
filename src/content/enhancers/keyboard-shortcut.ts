// Keyboard shortcut: press Space to auto-click first valid hideout button

import type { Enhancer } from './registry';
import { showToast } from '../utils/format';

function getFirstValidHideoutBtn(): HTMLButtonElement | HTMLAnchorElement | null {
  const rows = document.querySelectorAll('.resultset > div.row');
  for (const row of rows) {
    const btns = row.querySelectorAll('a.pm-btn, button.pm-btn, .ta-hideout-btn');
    for (const btn of btns) {
      const htmlBtn = btn as HTMLButtonElement | HTMLAnchorElement;
      if (!htmlBtn.disabled && htmlBtn.getAttribute('aria-disabled') !== 'true') {
        return htmlBtn;
      }
    }
  }
  return null;
}

export const keyboardShortcutEnhancer: Enhancer = {
  name: 'keyboard-shortcut',
  enabled: true,

  enhance() {
    // Only set up listener once
    if (document.body.hasAttribute('data-ta-keyboard-setup')) return;
    document.body.setAttribute('data-ta-keyboard-setup', 'true');

    document.addEventListener('keydown', (e) => {
      // Space key, not in input/textarea
      if (
        e.key === ' ' &&
        e.target === document.body &&
        !e.repeat
      ) {
        e.preventDefault();
        const btn = getFirstValidHideoutBtn();
        if (btn) {
          btn.click();
        } else {
          // Show toast notification
          showToast('未找到可跳转的藏身处');
        }
      }
    });
  },
};

