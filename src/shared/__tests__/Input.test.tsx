import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../components/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input id="test" label="Test Label" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input id="test" label="Test" error="Campo requerido" />);
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
