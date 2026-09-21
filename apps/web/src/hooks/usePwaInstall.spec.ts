import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePwaInstall, type BeforeInstallPromptEvent } from './usePwaInstall';

describe('usePwaInstall', () => {
  it('inicializa con isInstallable en falso', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isInstallable).toBe(false);
  });

  it('captura beforeinstallprompt y permite la instalacion', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    const promptMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(mockEvent, {
      platforms: ['web'],
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      prompt: promptMock,
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.isInstallable).toBe(true);

    let installed = false;
    await act(async () => {
      installed = await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(installed).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('actualiza estado cuando se dispara appinstalled', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
  });
});
