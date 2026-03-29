// @vitest-environment jsdom
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageProvider } from '@/contexts/language-context';
import { IndividualResponses } from '@/components/individual-responses';

const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: clipboardWriteText },
  writable: true,
  configurable: true,
});

const mockResponses = {
  groq: { content: 'Groq response content here', responseTime: 1500, tokens: 200 },
  openrouter: { content: 'OpenRouter response content', responseTime: 2000, tokens: 300 },
  cohere: { content: '', error: 'API key not configured', responseTime: 0, tokens: 0 },
};

const longContent = 'A'.repeat(300);
const mockResponsesLong = {
  groq: { content: longContent, responseTime: 1500, tokens: 200 },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function renderResponses(responses = mockResponses) {
  return render(<IndividualResponses responses={responses} />, { wrapper: Wrapper });
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false }),
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IndividualResponses', () => {
  it('renders response cards for providers with content', async () => {
    await act(async () => {
      renderResponses();
    });
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
  });

  it('shows error state for provider with error', async () => {
    await act(async () => {
      renderResponses();
    });
    expect(screen.getByText(/API key not configured/)).toBeInTheDocument();
  });

  it('response content is initially truncated (collapsed state)', async () => {
    await act(async () => {
      renderResponses(mockResponsesLong);
    });
    const truncated = longContent.substring(0, 200) + '...';
    expect(screen.getByText(truncated)).toBeInTheDocument();
    expect(screen.queryByText(longContent)).not.toBeInTheDocument();
  });

  it('clicking expand button shows full content', async () => {
    await act(async () => {
      renderResponses(mockResponsesLong);
    });

    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    await act(async () => {
      fireEvent.click(showMoreButton);
    });

    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('copy button triggers navigator.clipboard.writeText with response content', async () => {
    await act(async () => {
      renderResponses();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyButtons[0]);
    });

    expect(clipboardWriteText).toHaveBeenCalledWith('Groq response content here');
  });

  it('shows response time for providers', async () => {
    await act(async () => {
      renderResponses();
    });
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0s/)).toBeInTheDocument();
  });

  it('displays token count when non-zero', async () => {
    await act(async () => {
      renderResponses();
    });
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('cache badge is visible when response has cached: true', async () => {
    const cachedResponses = {
      groq: { content: 'Groq response content here', responseTime: 1500, tokens: 200, cached: true },
    };
    await act(async () => {
      renderResponses(cachedResponses);
    });
    expect(screen.getByText(/Cache/)).toBeInTheDocument();
  });
});
