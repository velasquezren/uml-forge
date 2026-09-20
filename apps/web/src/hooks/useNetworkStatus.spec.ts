import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  it('detecta estado online y transicion a offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current).toBe('boolean');

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
  });
});
