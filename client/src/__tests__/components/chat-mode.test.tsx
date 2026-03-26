import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LanguageContext } from '@/contexts/language-context';
import { getTranslation } from '@/lib/translations';
import { ChatMode } from '@/components/chat-mode';

const translations = getTranslation('en-US');

const mockLanguageValue = {
  language: 'en-US',
  translations,
  setLanguage: vi.fn(),
  detectedLocation: null,
  isDetecting: false,
};

const mockChatResponse = {
  success: true,
  responses: {
    groq: { content: 'I am Groq AI response', responseTime: 800, tokens: 100 },
    openrouter: { content: 'I am OpenRouter response', responseTime: 1200, tokens: 150 },
  },
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockChatResponse),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageContext.Provider value={mockLanguageValue}>
      {children}
    </LanguageContext.Provider>
  );
}

function renderChatMode(props: Partial<React.ComponentProps<typeof ChatMode>> = {}) {
  const defaults = {
    onBack: vi.fn(),
  };
  return render(<ChatMode {...defaults} {...props} />, { wrapper: Wrapper });
}

/** The send button only has an SVG icon and no accessible name, so select it by exclusion. */
function getSendButton() {
  const buttons = screen.getAllByRole('button');
  return buttons.find(btn => !btn.textContent?.includes('Back'))!;
}

describe('ChatMode', () => {
  it('renders a text input/textarea', () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('renders a send button', () => {
    renderChatMode();
    const sendButton = getSendButton();
    expect(sendButton).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    renderChatMode();
    const sendButton = getSendButton();
    expect(sendButton).toBeDisabled();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    renderChatMode({ onBack });
    const backButton = screen.getByRole('button', { name: /back/i });
    await userEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('after typing a message and clicking send, the user message appears in the chat', async () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello AI!');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);
    expect(screen.getByText('Hello AI!')).toBeInTheDocument();
  });

  it('fetch is called with POST to /api/chat when message is sent', async () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test message');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('the fetch body includes the message field', async () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'My question');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body).toHaveProperty('message');
    expect(body.message).toContain('My question');
  });

  it('after fetch response arrives, AI response text appears in chat (after selecting provider)', async () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello AI!');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);

    // Wait for the AI selection buttons to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /groq/i })).toBeInTheDocument();
    });

    // Click Groq to select the AI response
    const groqButton = screen.getByRole('button', { name: /groq/i });
    await userEvent.click(groqButton);

    await waitFor(() => {
      expect(screen.getByText('I am Groq AI response')).toBeInTheDocument();
    });
  });

  it('send button is disabled while waiting for response (isLoading state)', async () => {
    // Use a promise that we control to simulate pending fetch
    let resolveFetch!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingPromise));

    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test loading state');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);

    // During loading the button should be disabled
    await waitFor(() => {
      expect(sendButton).toBeDisabled();
    });

    // Resolve the fetch
    resolveFetch({
      ok: true,
      json: vi.fn().mockResolvedValue(mockChatResponse),
    });
  });

  it('input is cleared after sending', async () => {
    renderChatMode();
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello AI!');
    expect(textarea).toHaveValue('Hello AI!');
    const sendButton = getSendButton();
    await userEvent.click(sendButton);
    expect(textarea).toHaveValue('');
  });
});
