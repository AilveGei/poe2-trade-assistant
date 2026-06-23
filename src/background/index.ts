// Background service worker
// Only used to relay trade API requests (avoids CORS issues in some contexts)
// and schedule cache cleanup

const CACHE_CLEAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

chrome.runtime.onInstalled.addListener(() => {
  scheduleCacheClean();
});

function scheduleCacheClean() {
  chrome.alarms?.create('cache-clean', { periodInMinutes: 30 });
}

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cache-clean') {
    // Clean expired cache entries
    chrome.storage.local.get(null, (items) => {
      const now = Date.now();
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(items)) {
        if (typeof value === 'object' && value !== null && '_expiry' in value) {
          if (value._expiry <= now) {
            updates[key] = undefined;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.remove(Object.keys(updates));
      }
    });
  }
});
