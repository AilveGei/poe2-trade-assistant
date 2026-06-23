// Formatting utilities

export function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatPrice(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded} ${currency}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(message: string): void {
  const existing = document.querySelector('.ta-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'ta-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('ta-toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('ta-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
