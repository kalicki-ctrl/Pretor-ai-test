// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SourcesModal } from '@/components/sources-modal';

const mockResponses = {
  groq: {
    content: 'Some content',
    responseTime: 1200,
    sources: [
      { title: 'Example', url: 'https://example.com', type: 'website' as const },
    ],
  },
  openrouter: {
    content: 'Content here',
    responseTime: 800,
    sources: [],
  },
};

function renderModal(props: Partial<React.ComponentProps<typeof SourcesModal>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    responses: mockResponses,
  };
  return render(<SourcesModal {...defaults} {...props} />);
}

describe('SourcesModal', () => {
  it('modal is NOT rendered when isOpen=false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/Verificar Fontes/i)).not.toBeInTheDocument();
  });

  it('modal IS rendered when isOpen=true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByText(/Verificar Fontes/i)).toBeInTheDocument();
  });

  it('AI provider names appear in the sidebar list', () => {
    renderModal();
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking an AI in the sidebar shows its sources in the main area', () => {
    renderModal();
    const groqEntry = screen.getByText('Groq');
    fireEvent.click(groqEntry.closest('[class*="cursor-pointer"]') as HTMLElement);
    // Source title appears in main content
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('source URL is rendered as a link with correct href', () => {
    renderModal();
    const groqEntry = screen.getByText('Groq');
    fireEvent.click(groqEntry.closest('[class*="cursor-pointer"]') as HTMLElement);
    const link = screen.getByRole('link', { name: /Acessar fonte/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('shows no-sources message when provider has no sources', () => {
    renderModal();
    const openrouterEntry = screen.getByText('OpenRouter');
    fireEvent.click(openrouterEntry.closest('[class*="cursor-pointer"]') as HTMLElement);
    expect(screen.getByText(/Nenhuma fonte identificada/i)).toBeInTheDocument();
  });
});
