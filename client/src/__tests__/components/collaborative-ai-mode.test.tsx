import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollaborativeAIMode } from '@/components/collaborative-ai-mode';

// Minimal toast mock
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function setupMockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/initial')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              responses: [
                {
                  id: 'grok',
                  name: 'Grok',
                  provider: 'openrouter',
                  initialResponse: 'Grok initial response',
                  color: '#FF6B6B',
                  roundHistory: [],
                },
                {
                  id: 'llama3',
                  name: 'Llama3',
                  provider: 'groq',
                  initialResponse: 'Llama initial response',
                  color: '#4ECDC4',
                  roundHistory: [],
                },
                {
                  id: 'cohere',
                  name: 'Cohere',
                  provider: 'cohere',
                  initialResponse: 'Cohere initial response',
                  color: '#45B7D1',
                  roundHistory: [],
                },
              ],
            }),
        });
      }
      if (url.includes('/refine')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              responses: [
                {
                  id: 'grok',
                  name: 'Grok',
                  provider: 'openrouter',
                  initialResponse: 'Initial',
                  refinedResponse: 'Refined Grok response',
                  reasoning: 'reasoning',
                  color: '#FF6B6B',
                  roundHistory: [
                    {
                      roundNumber: 1,
                      response: 'R1',
                      reasoning: 'r',
                      timestamp: new Date().toISOString(),
                    },
                  ],
                },
                {
                  id: 'llama3',
                  name: 'Llama3',
                  provider: 'groq',
                  initialResponse: 'Initial',
                  refinedResponse: 'Refined Llama response',
                  reasoning: 'reasoning',
                  color: '#4ECDC4',
                  roundHistory: [],
                },
                {
                  id: 'cohere',
                  name: 'Cohere',
                  provider: 'cohere',
                  initialResponse: 'Initial',
                  refinedResponse: 'Refined Cohere response',
                  reasoning: 'reasoning',
                  color: '#45B7D1',
                  roundHistory: [],
                },
              ],
            }),
        });
      }
      if (url.includes('/synthesize')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              synthesis: { content: 'Final synthesis here' },
            }),
        });
      }
      return Promise.resolve({ ok: false });
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CollaborativeAIMode', () => {
  it('renders prompt input initially', () => {
    const onBack = vi.fn();
    render(<CollaborativeAIMode onBack={onBack} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('submit button is disabled when input has fewer than 10 chars', () => {
    render(<CollaborativeAIMode onBack={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'short' } });
    const submitBtn = screen.getByRole('button', { name: /Iniciar Colaboração AI/i });
    expect(submitBtn).toBeDisabled();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<CollaborativeAIMode onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /Voltar/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows loading/processing state after submitting a valid prompt', async () => {
    setupMockFetch();
    render(<CollaborativeAIMode onBack={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'This is a valid prompt with enough chars' } });

    const submitBtn = screen.getByRole('button', { name: /Iniciar Colaboração AI/i });
    expect(submitBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // After clicking, a processing screen should be shown (no textarea anymore)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows results with AI responses after all rounds complete', async () => {
    setupMockFetch();
    render(<CollaborativeAIMode onBack={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'This is a valid prompt with enough chars' } });

    // Click submit and run all async timers
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Colaboração AI/i }));
    });

    // Run all pending timers and flush promises in a loop until settled
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // After processing, should show the results screen with refined responses
    expect(screen.getByText(/Refined Grok response/i)).toBeInTheDocument();
  });

  it('displays final synthesis content after collaboration completes', async () => {
    setupMockFetch();
    render(<CollaborativeAIMode onBack={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'This is a valid prompt with enough chars' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Colaboração AI/i }));
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText(/Final synthesis here/i)).toBeInTheDocument();
  });
});
