// Enhancer pipeline — registers and runs enhancers on search result rows

import { getResultRows, isEnhanced, markEnhanced } from '../utils/dom';

export interface Enhancer {
  name: string;
  enabled: boolean;
  enhance(row: Element): Promise<void> | void;
}

class EnhancerRegistry {
  private enhancers: Enhancer[] = [];
  private observer: MutationObserver | null = null;

  register(enhancer: Enhancer): void {
    this.enhancers.push(enhancer);
  }

  unregister(name: string): void {
    this.enhancers = this.enhancers.filter((e) => e.name !== name);
  }

  setEnabled(name: string, enabled: boolean): void {
    const enhancer = this.enhancers.find((e) => e.name === name);
    if (enhancer) enhancer.enabled = enabled;
  }

  getEnhancers(): Enhancer[] {
    return this.enhancers;
  }

  start(container: Element): void {
    this.processAll(container);

    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      if (shouldProcess) {
        this.processAll(container);
      }
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private processAll(container: Element): void {
    const rows = container.querySelectorAll('.resultset > div.row');
    for (const row of rows) {
      if (isEnhanced(row)) continue;
      markEnhanced(row);

      for (const enhancer of this.enhancers) {
        if (!enhancer.enabled) continue;
        try {
          const result = enhancer.enhance(row);
          if (result instanceof Promise) {
            result.catch((err) =>
              console.error(`[TA] Enhancer "${enhancer.name}" error:`, err)
            );
          }
        } catch (err) {
          console.error(`[TA] Enhancer "${enhancer.name}" error:`, err);
        }
      }
    }
  }
}

export const enhancerRegistry = new EnhancerRegistry();
