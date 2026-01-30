import '@testing-library/jest-dom';

/**
 * Mock IntersectionObserver for JSDOM environment
 * Required for useScrollSpy hook and any components using IntersectionObserver
 */
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    // Store callback if needed for testing
  }

  observe(_target: Element): void {
    // No-op in tests
  }

  unobserve(_target: Element): void {
    // No-op in tests
  }

  disconnect(): void {
    // No-op in tests
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Assign mock to global
global.IntersectionObserver = MockIntersectionObserver;
