// @vitest-environment jsdom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LanguageProvider } from '@/contexts/language-context';
import { IndividualResponses } from '@/components/individual-responses';

// Mock fetch for language detection
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ success: false }),
} as any);

// Mock clipboard API (jsdom doesn't support it)
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

const mockResponses = {
  groq: { content: 'Groq response content here', responseTime: 1500, tokens: 200 },
  openrouter: { content: 'OpenRouter response content', responseTime: 2000, tokens: 300 },
  cohere: { content: '', error: 'API key not configured', responseTime: 0, tokens: 0 },
};

// Long content for truncation tests
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

describe('IndividualResponses', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

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
    // Content should be truncated to 200 chars + "..."
    const truncated = longContent.substring(0, 200) + '...';
    expect(screen.getByText(truncated)).toBeInTheDocument();
    // Full content (300 chars) should not be fully rendered in DOM
    expect(screen.queryByText(longContent)).not.toBeInTheDocument();
  });

  it('clicking expand button shows full content', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderResponses(mockResponsesLong);
    });

    // Find and click the expand button
    const showMoreButton = screen.getByRole('button', { name: /show more/i });
    await act(async () => {
      await user.click(showMoreButton);
    });

    // Full content should now be visible
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('copy button triggers navigator.clipboard.writeText with response content', async () => {
    const user = userEvent.setup();
    await act(async () => {
      renderResponses();
    });

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    await act(async () => {
      await user.click(copyButtons[0]);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Groq response content here');
  });

  it('shows response time for providers', async () => {
    await act(async () => {
      renderResponses();
    });
    // 1500ms -> "1.5s"
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();
    // 2000ms -> "2.0s"
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
