// @vitest-environment jsdom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageProvider } from '@/contexts/language-context';
import { AIProgressTracker } from '@/components/ai-progress-tracker';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function renderTracker(props: Partial<React.ComponentProps<typeof AIProgressTracker>> = {}) {
  const defaults: React.ComponentProps<typeof AIProgressTracker> = {
    isAnalyzing: true,
    responses: {},
    onComplete: undefined,
  };
  return render(<AIProgressTracker {...defaults} {...props} />, { wrapper: Wrapper });
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false }),
  } as any);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AIProgressTracker', () => {
  it('renders progress bar when isAnalyzing=true with empty responses', async () => {
    await act(async () => {
      renderTracker({ isAnalyzing: true, responses: {} });
    });
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });

  it('shows AI provider names', async () => {
    await act(async () => {
      renderTracker({ isAnalyzing: true, responses: {} });
    });
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('Cohere')).toBeInTheDocument();
    expect(screen.getByText('Llama3')).toBeInTheDocument();
  });

  it('calls onComplete when all AI responses have content', async () => {
    const onComplete = vi.fn();
    const responses = {
      openrouter: { content: 'OpenRouter response', responseTime: 1000 },
      groq: { content: 'Groq response', responseTime: 800 },
      cohere: { content: 'Cohere response', responseTime: 1200 },
      llama3: { content: 'Llama3 response', responseTime: 900 },
    };

    await act(async () => {
      renderTracker({ isAnalyzing: true, responses, onComplete });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('shows error state for a provider that has error field set', async () => {
    const responses = {
      openrouter: { content: '', error: 'API key not configured', responseTime: 0 },
    };

    await act(async () => {
      renderTracker({ isAnalyzing: true, responses });
    });

    expect(screen.getByText('API key not configured')).toBeInTheDocument();
  });

  it('displays response time when provider has responseTime > 0', async () => {
    const responses = {
      groq: { content: 'Groq response', responseTime: 1500 },
    };

    await act(async () => {
      renderTracker({ isAnalyzing: true, responses });
    });

    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();
  });
});
