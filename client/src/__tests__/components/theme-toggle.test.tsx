// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/contexts/theme-context';
import { ThemeToggle } from '@/components/theme-toggle';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />, { wrapper: Wrapper });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clicking the button toggles the theme', async () => {
    render(<ThemeToggle />, { wrapper: Wrapper });
    const button = screen.getByRole('button');
    // Initially light theme → shows Moon icon; sr-only says "Toggle theme"
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await userEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('has an accessible label via sr-only text', () => {
    render(<ThemeToggle />, { wrapper: Wrapper });
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });
});
