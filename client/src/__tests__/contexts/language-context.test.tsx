// @vitest-environment jsdom
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';

function TestComponent() {
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <button onClick={() => setLanguage('pt-BR')}>set-pt</button>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      success: true,
      location: {
        country: 'United States',
        countryCode: 'US',
        language: 'en-US',
        timezone: 'America/New_York',
      },
    }),
  }));
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LanguageProvider', () => {
  test('default language is en-US initially', async () => {
    await act(async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('en-US');
    });
  });

  test('setLanguage updates language in context', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );
    });
    await user.click(screen.getByText('set-pt'));
    expect(screen.getByTestId('language').textContent).toBe('pt-BR');
  });

  test('setLanguage saves to localStorage', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );
    });
    await user.click(screen.getByText('set-pt'));
    expect(localStorage.getItem('preferredLanguage')).toBe('pt-BR');
  });

  test('loads saved language from localStorage on mount', async () => {
    localStorage.setItem('preferredLanguage', 'pt-BR');
    await act(async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('pt-BR');
    });
  });

  test('document.documentElement.lang is updated on language change', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );
    });
    await user.click(screen.getByText('set-pt'));
    expect(document.documentElement.lang).toBe('pt');
  });

  test('useLanguage outside provider throws an error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BadComponent() {
      useLanguage();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow('useLanguage must be used within a LanguageProvider');
    consoleError.mockRestore();
  });
});
