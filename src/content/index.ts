// Content script entry point for poe2-trade-assistant

import { App } from './app';

// Wait for DOM to be ready before initializing
function initApp(): void {
  // Inject global styles
  injectStyles();

  // Start the app
  const app = new App();
  app.init().catch((err) => {
    console.error('[TA] Failed to initialize:', err);
  });
}

function injectStyles(): void {
  // We inject styles directly into the page (not shadow DOM)
  // so they can override trade site styles
  const style = document.createElement('style');
  style.id = 'ta-styles';
  style.textContent = getStyles();
  document.head.appendChild(style);
}

function getStyles(): string {
  return `
/* ─── Toggle Button ─── */
#ta-toggle-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #1a1a2e;
  color: #e0a848;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  transition: opacity 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
#ta-toggle-btn:hover {
  transform: scale(1.1);
  background: #2a2a3e;
}
#ta-toggle-btn.ta-hidden {
  opacity: 0;
  pointer-events: none;
}

/* ─── Sidebar ─── */
#ta-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  height: 100vh;
  z-index: 2147483646;
  background: #0d0d1a;
  border-left: 1px solid #2a2a3e;
  color: #c8c8d4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 12px rgba(0,0,0,0.3);
  transition: transform 0.25s ease;
}
#ta-sidebar.ta-collapsed {
  transform: translateX(100%);
}

/* ─── Header ─── */
.ta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a3e;
  background: #12122a;
}
.ta-title {
  font-size: 15px;
  font-weight: 600;
  color: #e0a848;
}
.ta-close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.ta-close-btn:hover {
  color: #fff;
  background: #333;
}

/* ─── Tab Bar ─── */
.ta-tab-bar {
  display: flex;
  border-bottom: 1px solid #2a2a3e;
  background: #111122;
}
.ta-tab {
  flex: 1;
  background: none;
  border: none;
  color: #888;
  font-size: 12px;
  padding: 10px 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.ta-tab:hover {
  color: #ccc;
}
.ta-tab-active {
  color: #e0a848;
  border-bottom-color: #e0a848;
}

/* ─── Tab Content ─── */
.ta-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.ta-tab-content::-webkit-scrollbar {
  width: 6px;
}
.ta-tab-content::-webkit-scrollbar-track {
  background: #0d0d1a;
}
.ta-tab-content::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

/* ─── Toolbar ─── */
.ta-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-bottom: 1px solid #1a1a2e;
  margin-bottom: 6px;
}
.ta-toolbar-title {
  flex: 1;
  font-size: 12px;
  color: #888;
}

/* ─── Status Bar ─── */
.ta-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #1a2a1a;
  border: 1px solid #2a4a2a;
  border-radius: 4px;
  margin: 6px 4px;
}
.ta-status-label {
  font-size: 11px;
  color: #6c6;
  white-space: nowrap;
}
.ta-status-league {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  margin-left: auto;
}
.ta-status-name {
  flex: 1;
  font-size: 12px;
  color: #e0a848;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Buttons ─── */
.ta-btn {
  background: #2a2a4e;
  color: #c8c8d4;
  border: 1px solid #3a3a5e;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}
.ta-btn:hover {
  background: #3a3a6e;
}
.ta-btn-sm {
  padding: 4px 10px;
}
.ta-btn-xs {
  padding: 2px 6px;
  font-size: 11px;
  background: transparent;
  border: none;
}
.ta-btn-xs:hover {
  background: rgba(255,255,255,0.1);
}
.ta-btn-danger:hover {
  color: #e55;
}
.ta-btn-primary {
  background: #3a6a3a !important;
  border-color: #4a8a4a !important;
  color: #fff !important;
}
.ta-btn-primary:hover {
  background: #4a8a4a !important;
}

/* ─── Empty State ─── */
.ta-empty {
  text-align: center;
  padding: 32px 16px;
  color: #666;
  font-size: 13px;
}
.ta-empty-sm {
  padding: 12px;
  font-size: 12px;
}

/* ─── Folder ─── */
.ta-folder {
  margin-bottom: 4px;
  border-radius: 4px;
  background: #111122;
  border: 1px solid #1a1a2e;
}
.ta-folder-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  gap: 6px;
}
.ta-folder-header:hover {
  background: #1a1a2e;
}
.ta-folder-icon {
  font-size: 14px;
}
.ta-folder-name {
  flex: 1;
  font-weight: 500;
  color: #c8c8d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ta-folder-count {
  background: #2a2a4e;
  color: #888;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
}
.ta-folder-actions {
  display: flex;
  gap: 2px;
  opacity: 0.4;
}
.ta-folder-header:hover .ta-folder-actions {
  opacity: 1;
}

/* ─── Trade List ─── */
.ta-trade-list {
  display: none;
  border-top: 1px solid #1a1a2e;
}
.ta-folder-expanded .ta-trade-list {
  display: block;
}
.ta-trade-item {
  display: flex;
  align-items: center;
  padding: 6px 10px 6px 24px;
  border-bottom: 1px solid #0d0d1a;
}
.ta-trade-item:hover {
  background: #1a1a2e;
}
.ta-trade-info {
  flex: 1;
  min-width: 0;
}
.ta-trade-title {
  font-size: 12px;
  color: #c8c8d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ta-trade-meta {
  font-size: 11px;
  color: #666;
}
.ta-trade-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
}
.ta-trade-item:hover .ta-trade-actions {
  opacity: 1;
}

/* ─── History ─── */
.ta-history-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #0d0d1a;
}
.ta-history-item:hover {
  background: #1a1a2e;
}
.ta-history-info {
  flex: 1;
  min-width: 0;
}
.ta-history-title {
  font-size: 12px;
  color: #c8c8d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ta-history-meta {
  font-size: 11px;
  color: #666;
}
.ta-history-actions {
  opacity: 0;
}
.ta-history-item:hover .ta-history-actions {
  opacity: 1;
}

/* ─── Pinned ─── */
.ta-pinned-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #0d0d1a;
}
.ta-pinned-item:hover {
  background: #1a1a2e;
}
.ta-pinned-info {
  flex: 1;
  min-width: 0;
}
.ta-pinned-name {
  font-size: 12px;
  color: #c8c8d4;
}
.ta-pinned-price {
  font-size: 12px;
  color: #e0a848;
}
.ta-pinned-seller {
  font-size: 11px;
  color: #666;
}
.ta-pinned-actions {
  opacity: 0;
}
.ta-pinned-item:hover .ta-pinned-actions {
  opacity: 1;
}

/* ─── About ─── */
.ta-about {
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
}
.ta-about h3 {
  color: #e0a848;
  margin: 0 0 8px;
}
.ta-about hr {
  border: none;
  border-top: 1px solid #2a2a3e;
  margin: 12px 0;
}
.ta-about ul {
  padding-left: 20px;
  margin: 6px 0;
}
.ta-about li {
  margin-bottom: 4px;
}
.ta-about a {
  color: #6af;
  text-decoration: none;
}
.ta-about a:hover {
  text-decoration: underline;
}

/* ─── Equivalent Price ─── */
.ta-equivalent-price {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  background: #1a2a1a;
  color: #6c6;
  border-radius: 3px;
  font-size: 11px;
  cursor: help;
}

/* ─── Regroup Button ─── */
.ta-regroup-btn {
  background: #2a2a4e !important;
  color: #c8c8d4 !important;
  border: 1px solid #3a3a5e !important;
  border-radius: 4px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
  cursor: pointer !important;
}
.ta-regroup-btn:hover {
  background: #3a3a6e !important;
}
.ta-regroup-btn.ta-expanded {
  background: #3a3a1a !important;
  border-color: #6a6a3e !important;
}

/* ─── Pin Button ─── */
.ta-pin-btn {
  background: transparent !important;
  border: none !important;
  color: #888 !important;
  font-size: 12px !important;
  cursor: pointer !important;
  padding: 2px 4px !important;
}
.ta-pin-btn:hover {
  color: #e0a848 !important;
}


	/* ─── Modal ─── */
	.ta-modal-overlay {
	  position: absolute;
	  top: 0;
	  left: 0;
	  right: 0;
	  bottom: 0;
	  background: rgba(0,0,0,0.6);
	  z-index: 10;
	  display: flex;
	  align-items: center;
	  justify-content: center;
	}
	.ta-modal {
	  background: #1a1a2e;
	  border: 1px solid #3a3a5e;
	  border-radius: 8px;
	  width: 90%;
	  max-width: 280px;
	  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
	}
	.ta-modal-header {
	  padding: 12px 16px;
	  font-size: 14px;
	  font-weight: 600;
	  color: #e0a848;
	  border-bottom: 1px solid #2a2a3e;
	}
	.ta-modal-body {
	  padding: 12px 16px;
	}
	.ta-modal-field {
	  margin-bottom: 12px;
	}
	.ta-modal-field:last-child {
	  margin-bottom: 0;
	}
	.ta-modal-label {
	  display: block;
	  font-size: 11px;
	  color: #888;
	  margin-bottom: 4px;
	}
	.ta-modal-input {
	  width: 100%;
	  box-sizing: border-box;
	  background: #0d0d1a;
	  border: 1px solid #3a3a5e;
	  border-radius: 4px;
	  color: #c8c8d4;
	  padding: 6px 8px;
	  font-size: 13px;
	}
	.ta-modal-input:focus {
	  outline: none;
	  border-color: #e0a848;
	}
	.ta-folder-options {
	  max-height: 150px;
	  overflow-y: auto;
	}
	.ta-folder-option {
	  display: flex;
	  align-items: center;
	  gap: 6px;
	  padding: 5px 8px;
	  cursor: pointer;
	  border-radius: 4px;
	  font-size: 12px;
	  color: #c8c8d4;
	}
	.ta-folder-option:hover {
	  background: #2a2a4e;
	}
	.ta-folder-option input[type="radio"] {
	  accent-color: #e0a848;
	}
	.ta-modal-footer {
	  display: flex;
	  justify-content: flex-end;
	  gap: 6px;
	  padding: 8px 16px;
	  border-top: 1px solid #2a2a3e;
	}

	/* ─── Drag and Drop ─── */
	.ta-dragging {
	  opacity: 0.4;
	}
	.ta-folder-drag-over {
	  background: #2a4a2a !important;
	  border-radius: 4px;
	}
	.ta-folder-drag-over .ta-folder-name {
	  color: #4c4 !important;
	}
		/* ─── Toast Notification ─── */
.ta-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #1a1a2e;
  color: #c8c8d4;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 2147483647;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  border: 1px solid #2a2a3e;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.ta-toast.ta-toast-show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
`.trim();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
