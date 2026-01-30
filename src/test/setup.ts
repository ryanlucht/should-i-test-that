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
    void _callback;
    void _options;
  }

  observe(_target: Element): void {
    // No-op in tests
    void _target;
  }

  unobserve(_target: Element): void {
    // No-op in tests
    void _target;
  }

  disconnect(): void {
    // No-op in tests
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Assign mock to globalThis (works in both Node and browser environments)
globalThis.IntersectionObserver = MockIntersectionObserver;
