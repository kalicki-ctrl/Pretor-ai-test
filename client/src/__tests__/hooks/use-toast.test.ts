// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@/hooks/use-toast';

describe('useToast', () => {
  afterEach(() => {
    // Clean up global toast state between tests
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
  });

  it('has an empty toasts array initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(0);
  });

  it('adds a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hello' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
  });

  it('dismisses a specific toast by id', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      const { id } = result.current.toast({ title: 'Hello' });
      toastId = id;
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss(toastId!);
    });

    // After dismiss, toast is marked open: false
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismisses all toasts when dismiss() is called without id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hello' });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.dismiss();
    });

    // All toasts should be marked as open: false
    result.current.toasts.forEach((t) => {
      expect(t.open).toBe(false);
    });
  });

  it('only keeps 1 toast at a time (TOAST_LIMIT = 1)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'First' });
    });

    act(() => {
      result.current.toast({ title: 'Second' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Second');
  });

  it('updates an existing toast via update()', () => {
    const { result } = renderHook(() => useToast());

    let updateFn: ReturnType<typeof result.current.toast>['update'];
    let toastId: string;
    act(() => {
      const { id, update } = result.current.toast({ title: 'Original' });
      toastId = id;
      updateFn = update;
    });

    expect(result.current.toasts[0].title).toBe('Original');

    act(() => {
      updateFn!({ id: toastId!, title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });
});
