import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No hay datos" />);
    expect(screen.getByText('No hay datos')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState title="Vacío" description="Agrega un elemento" />);
    expect(screen.getByText('Agrega un elemento')).toBeInTheDocument();
  });
});
