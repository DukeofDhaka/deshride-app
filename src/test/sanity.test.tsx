import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Sanity Check', () => {
  it('renders a simple component and asserts it is in the document', () => {
    render(<div data-testid="sanity">Sanity Check</div>);
    const element = screen.getByTestId('sanity');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Sanity Check');
  });
});
