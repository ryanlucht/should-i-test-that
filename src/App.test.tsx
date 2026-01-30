import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('Should I Test That?')).toBeInTheDocument();
  });

  it('renders the setup complete card', () => {
    render(<App />);
    expect(screen.getByText('Project Setup Complete')).toBeInTheDocument();
  });
});
