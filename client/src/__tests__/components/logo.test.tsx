// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/contexts/theme-context';
import { Logo } from '@/components/logo';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Logo', () => {
  it('renders an img element', () => {
    render(<Logo />, { wrapper: Wrapper });
    expect(screen.getByRole('img', { name: /pretor ai logo/i })).toBeInTheDocument();
  });

  it('size="sm" applies smaller dimensions than size="lg"', () => {
    const { container: smContainer } = render(<Logo size="sm" />, { wrapper: Wrapper });
    const { container: lgContainer } = render(<Logo size="lg" />, { wrapper: Wrapper });

    const smDiv = smContainer.firstChild as HTMLElement;
    const lgDiv = lgContainer.firstChild as HTMLElement;

    expect(smDiv.className).toContain('w-10');
    expect(lgDiv.className).toContain('w-20');
  });

  it('applies className prop to the container div', () => {
    const { container } = render(<Logo className="custom-class" />, { wrapper: Wrapper });
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-class');
  });

  it('shows fallback element when image fails to load', () => {
    render(<Logo />, { wrapper: Wrapper });
    const img = screen.getByRole('img', { name: /pretor ai logo/i });

    const fallback = img.nextElementSibling as HTMLElement;
    expect(fallback.classList.contains('hidden')).toBe(true);

    fireEvent.error(img);

    expect(img.style.display).toBe('none');
    expect(fallback.classList.contains('hidden')).toBe(false);
  });
});
