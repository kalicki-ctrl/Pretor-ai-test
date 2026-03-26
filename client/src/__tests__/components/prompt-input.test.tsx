// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ThemeProvider } from '@/contexts/theme-context';
import { LanguageProvider } from '@/contexts/language-context';
import { PromptInput } from '@/components/prompt-input';

// Mock fetch so LanguageProvider's location detection does not fail
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false }),
  } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}

function renderPromptInput(props: Partial<React.ComponentProps<typeof PromptInput>> = {}) {
  const defaults = {
    prompt: '',
    onPromptChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
  };
  return render(<PromptInput {...defaults} {...props} />, { wrapper: Wrapper });
}

describe('PromptInput', () => {
  it('submit button is disabled when prompt has fewer than 10 chars', () => {
    renderPromptInput({ prompt: 'short' });
    // Button rendered; disabled when canSubmit is false
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons[buttons.length - 1];
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled when prompt has 10 or more chars', () => {
    renderPromptInput({ prompt: 'long enough prompt here' });
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons[buttons.length - 1];
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onPromptChange with new value when typing', async () => {
    const onPromptChange = vi.fn();
    renderPromptInput({ onPromptChange });
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'a');
    expect(onPromptChange).toHaveBeenCalled();
  });

  it('calls onSubmit when Ctrl+Enter is pressed with valid prompt', async () => {
    const onSubmit = vi.fn();
    renderPromptInput({ prompt: 'long enough prompt here', onSubmit });
    const textarea = screen.getByRole('textbox');
    textarea.focus();
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows character count in the UI', () => {
    renderPromptInput({ prompt: 'hello' });
    expect(screen.getByText(/5\/10/)).toBeInTheDocument();
  });

  it('textarea is disabled when isLoading is true', () => {
    renderPromptInput({ prompt: 'long enough prompt here', isLoading: true });
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });
});
