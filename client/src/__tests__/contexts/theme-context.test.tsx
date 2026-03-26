// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

function TestComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme('dark')}>set-dark</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  // Reset html element classes and attributes
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  test('default theme is light when no localStorage value', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  test('loads dark from localStorage if previously saved', async () => {
    localStorage.setItem('theme', 'dark');
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  test('toggleTheme switches from light to dark', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('light');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  test('toggleTheme switches from dark to light', async () => {
    localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  test('setTheme dark saves dark to localStorage', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    await user.click(screen.getByText('set-dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  test('changing theme updates document.documentElement', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });
    await user.click(screen.getByText('set-dark'));
    expect(
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    ).toBe(true);
  });

  test('useTheme outside provider throws an error', () => {
    // Suppress React error boundary console output
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BadComponent() {
      useTheme();
      return null;
    }
    expect(() => render(<BadComponent />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
