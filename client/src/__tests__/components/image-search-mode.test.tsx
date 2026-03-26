// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import { ImageSearchMode } from '@/components/image-search-mode';
import { getTranslation } from '@/lib/translations';

// Mock useLanguage hook
vi.mock('@/contexts/language-context', () => ({
  useLanguage: () => ({
    language: 'en-US',
    translations: getTranslation('en-US'),
    setLanguage: vi.fn(),
    detectedLocation: null,
    isDetecting: false,
  }),
}));

// Mock heavy sub-components
vi.mock('@/components/ai-progress-tracker', () => ({
  AIProgressTracker: () => <div data-testid="ai-progress-tracker" />,
}));

vi.mock('@/components/llama-analysis-new', () => ({
  LlamaAnalysisNew: () => <div data-testid="llama-analysis-new" />,
}));

vi.mock('@/components/individual-responses', () => ({
  IndividualResponses: () => <div data-testid="individual-responses" />,
}));

vi.mock('@/components/sources-modal', () => ({
  SourcesModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="sources-modal" /> : null,
}));

// Mock FileReader
global.FileReader = class {
  result = 'data:image/jpeg;base64,/9j/fakeimagedatahere';
  onload: ((e: any) => void) | null = null;
  readAsDataURL() {
    setTimeout(() => {
      this.onload?.({ target: { result: this.result } });
    }, 0);
  }
} as any;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function renderImageSearchMode(onBack = vi.fn()) {
  return render(<ImageSearchMode onBack={onBack} />);
}

describe('ImageSearchMode', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders image upload area', () => {
    renderImageSearchMode();
    expect(
      screen.getByText(/Selecione uma imagem para análise/i)
    ).toBeInTheDocument();
  });

  it('renders prompt input (textarea)', () => {
    renderImageSearchMode();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders back button and calls onBack when clicked', () => {
    const onBack = vi.fn();
    renderImageSearchMode(onBack);
    // The back button has ArrowLeft icon, no accessible name — find by role + position
    const buttons = screen.getAllByRole('button');
    // The first button is the back (ghost/icon) button
    fireEvent.click(buttons[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows image preview after file is selected', async () => {
    renderImageSearchMode();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();
    });
  });

  it('analyze button is disabled when no image is selected', () => {
    renderImageSearchMode();
    // Type enough chars but no image
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'enough text here' } });

    const analyzeButton = screen.getByRole('button', { name: /analy/i });
    expect(analyzeButton).toBeDisabled();
  });

  it('analyze button is disabled when prompt has fewer than 5 chars', async () => {
    renderImageSearchMode();

    // Select an image first
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();
    });

    // Type only 3 chars
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'abc' } });

    const analyzeButton = screen.getByRole('button', { name: /analy/i });
    expect(analyzeButton).toBeDisabled();
  });

  it('calls fetch to /api/analyze-image-advanced on valid submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        promptId: 1,
        responses: {},
        llamaAnalysis: null,
        imageExtraction: null,
      }),
    });

    renderImageSearchMode();

    // Select an image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();
    });

    // Type a prompt with at least 5 chars
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Describe this image' } });

    const analyzeButton = screen.getByRole('button', { name: /analy/i });
    expect(analyzeButton).not.toBeDisabled();
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analyze-image-advanced',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('remove image button clears the image preview', async () => {
    renderImageSearchMode();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument();
    });

    // The remove button shows "×"
    const removeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /preview/i })).not.toBeInTheDocument();
    });
  });
});
