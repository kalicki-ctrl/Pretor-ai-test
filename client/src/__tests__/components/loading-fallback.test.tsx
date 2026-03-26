import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingFallback } from '@/components/loading-fallback';

describe('LoadingFallback', () => {
  it('renders default message "Carregando..."', () => {
    render(<LoadingFallback />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders a custom message when provided', () => {
    render(<LoadingFallback message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders a loading indicator with animate-spin class', () => {
    const { container } = render(<LoadingFallback />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
