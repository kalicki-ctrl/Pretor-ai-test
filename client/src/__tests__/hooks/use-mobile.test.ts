// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.push(cb)
    ),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    mql,
    triggerChange: (newMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport is mobile (matches: true)', () => {
    // Set window.innerWidth to a mobile width so the hook's innerWidth check also passes
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport is not mobile (matches: false)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    mockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when resize event triggers a change', () => {
    // Start as desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    const { triggerChange } = mockMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    act(() => {
      triggerChange(true);
    });

    expect(result.current).toBe(true);
  });
});
