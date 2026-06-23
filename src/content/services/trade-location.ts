// Parses the current trade URL to extract version, type, league, and search slug

export interface TradeLocation {
  version: 'trade' | 'trade2';
  type: 'search' | 'bulk' | 'exchange' | 'unknown';
  realm?: string; // e.g. 'poe2', 'poe1' (Tencent server game version prefix)
  league: string;
  slug: string;
  live: boolean;
}

const POLL_INTERVAL_MS = 500;

export function parseTradeLocation(): TradeLocation | null {
  const { pathname } = window.location;

  // Strip trailing slash and split into segments
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);

  // Expected Tencent server formats:
  //   /trade2/search/{game}/{league}/{slug}       (5 segments, e.g. /trade2/search/poe2/奥杜尔秘符/n3dqMb2i0)
  //   /trade2/search/{league}/{slug}               (4 segments, e.g. /trade2/search/Standard/abc123)
  //   /trade2/search/{game}/{league}/{slug}/live   (6 segments)
  //   /trade2/search/{league}/{slug}/live          (5 segments)
  const isTrade = segments.length >= 1 && (segments[0] === 'trade' || segments[0] === 'trade2');
  const isSearch = segments.length >= 2 && (segments[1] === 'search' || segments[1] === 'bulk' || segments[1] === 'exchange');

  if (isTrade && isSearch) {
    const version = segments[0];
    const type = segments[1];
    const live = segments[segments.length - 1] === 'live';
    const lastIdx = live ? segments.length - 2 : segments.length - 1;
    const slug = segments[lastIdx] || '';

    // Determine realm and league
    // Tencent server: /trade2/search/poe2/{league}/{slug}
    // Standard:       /trade2/search/{league}/{slug}
    let leagueIdx = 2;
    let realm: string | undefined;
    if (segments[leagueIdx] === 'poe2' || segments[leagueIdx] === 'poe1') {
      realm = segments[leagueIdx];
      leagueIdx = 3;
    }
    const league = leagueIdx < lastIdx ? segments[leagueIdx] : segments[2] || '';

    if (slug) {
      return {
        version,
        type,
        realm,
        league: decodeURIComponent(league),
        slug: decodeURIComponent(slug),
        live,
      } as TradeLocation;
    }
  }

  // Partial match — on the trade site but not a search results page
  if (segments.length >= 1 && (segments[0] === 'trade' || segments[0] === 'trade2')) {
    return {
      version: segments[0] as 'trade' | 'trade2',
      type: 'unknown',
      league: '',
      slug: '',
      live: false,
    };
  }

  return null;
}

export class TradeLocationWatcher {
  private current: TradeLocation | null = null;
  private pollTimer: number | null = null;
  private listeners: Array<(loc: TradeLocation | null) => void> = [];
  private tabActive = true;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      this.tabActive = !document.hidden;
      if (this.tabActive) {
        this.checkNow();
      }
    });
    window.addEventListener('popstate', () => this.checkNow());
  }

  start() {
    this.checkNow();
    this.pollTimer = window.setInterval(() => {
      if (this.tabActive) {
        this.checkNow();
      }
    }, POLL_INTERVAL_MS);
  }

  stop() {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  onChange(fn: (loc: TradeLocation | null) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  getCurrent(): TradeLocation | null {
    return this.current;
  }

  private checkNow() {
    const loc = parseTradeLocation();
    if (this.locationsEqual(loc, this.current)) return;

    this.current = loc;
    for (const fn of this.listeners) {
      fn(loc);
    }
  }

  private locationsEqual(
    a: TradeLocation | null,
    b: TradeLocation | null
  ): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.version === b.version &&
      a.type === b.type &&
      a.realm === b.realm &&
      a.league === b.league &&
      a.slug === b.slug &&
      a.live === b.live
    );
  }
}
