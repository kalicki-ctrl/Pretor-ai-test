import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptConfirmation } from '@/components/prompt-confirmation';

const defaultProps = {
  understanding: 'I understand you want to know about AI',
  alternatives: ['Alt 1: detailed', 'Alt 2: concise', 'Alt 3: examples'],
  originalPrompt: 'What is artificial intelligence?',
  responseTime: 1234,
  recommendedAI: 'groq',
  aiWeights: { openrouter: 0.3, groq: 0.4, cohere: 0.3 },
  explanation: 'Groq is fastest for this type of question',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PromptConfirmation', () => {
  test('renders the understanding text', () => {
    render(<PromptConfirmation {...defaultProps} />);
    expect(screen.getByText('I understand you want to know about AI')).toBeInTheDocument();
  });

  test('renders all 3 alternative prompts', () => {
    render(<PromptConfirmation {...defaultProps} />);
    expect(screen.getByText('Alt 1: detailed')).toBeInTheDocument();
    expect(screen.getByText('Alt 2: concise')).toBeInTheDocument();
    expect(screen.getByText('Alt 3: examples')).toBeInTheDocument();
  });

  test('renders the original prompt', () => {
    render(<PromptConfirmation {...defaultProps} />);
    expect(screen.getByText('What is artificial intelligence?')).toBeInTheDocument();
  });

  test('onCancel called when cancel/back button clicked', async () => {
    const user = userEvent.setup();
    render(<PromptConfirmation {...defaultProps} />);
    // The cancel button contains "Editar prompt"
    const cancelButton = screen.getByRole('button', { name: /editar prompt/i });
    await user.click(cancelButton);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  test('onConfirm called when confirm button clicked', async () => {
    const user = userEvent.setup();
    render(<PromptConfirmation {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /sim, iniciar pesquisa/i });
    await user.click(confirmButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  test('onConfirm receives the selected prompt and AI config as arguments', async () => {
    const user = userEvent.setup();
    render(<PromptConfirmation {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /sim, iniciar pesquisa/i });
    await user.click(confirmButton);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      defaultProps.originalPrompt,
      defaultProps.recommendedAI,
      expect.any(Object)
    );
  });

  test('shows response time badge', () => {
    render(<PromptConfirmation {...defaultProps} />);
    // responseTime=1234ms => 1.2s
    expect(screen.getByText('1.2s')).toBeInTheDocument();
  });

  test('confirm button is disabled when isLoading=true', () => {
    render(<PromptConfirmation {...defaultProps} isLoading={true} />);
    const confirmButton = screen.getByRole('button', { name: /iniciando pesquisa/i });
    expect(confirmButton).toBeDisabled();
  });

  test('isLoading=true disables the confirm button', () => {
    render(<PromptConfirmation {...defaultProps} isLoading={true} />);
    const confirmButton = screen.getByRole('button', { name: /iniciando pesquisa/i });
    expect(confirmButton).toBeDisabled();
  });

  test('recommended AI (groq) is visually highlighted with a badge or indicator', () => {
    render(<PromptConfirmation {...defaultProps} />);
    // The recommendation section mentions the recommended AI
    expect(screen.getByText(/recomendação pretor ai/i)).toBeInTheDocument();
    expect(screen.getAllByText(/groq/i).length).toBeGreaterThan(0);
  });
});
