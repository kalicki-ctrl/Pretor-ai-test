import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

const VALID_PROMPT = 'This is a valid prompt with enough chars';

async function submitAndComplete() {
  setupMockFetch();
  render(<CollaborativeAIMode onBack={vi.fn()} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_PROMPT } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Iniciar Colaboração AI/i }));
  });
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

describe('CollaborativeAIMode', () => {
  it('renders prompt input initially', () => {
    render(<CollaborativeAIMode onBack={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('submit button is disabled when input has fewer than 10 chars', () => {
    render(<CollaborativeAIMode onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'short' } });
    expect(screen.getByRole('button', { name: /Iniciar Colaboração AI/i })).toBeDisabled();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<CollaborativeAIMode onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows loading/processing state after submitting a valid prompt', async () => {
    setupMockFetch();
    render(<CollaborativeAIMode onBack={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_PROMPT } });
    const submitBtn = screen.getByRole('button', { name: /Iniciar Colaboração AI/i });
    expect(submitBtn).not.toBeDisabled();
    await act(async () => { fireEvent.click(submitBtn); });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows results with AI responses after all rounds complete', async () => {
    await submitAndComplete();
    expect(screen.getByText(/Refined Grok response/i)).toBeInTheDocument();
  });

  it('displays final synthesis content after collaboration completes', async () => {
    await submitAndComplete();
    expect(screen.getByText(/Final synthesis here/i)).toBeInTheDocument();
  });
});
