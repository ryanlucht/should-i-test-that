import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test to reset wizard state
    sessionStorage.clear();
  });

  it('renders the Welcome page title', () => {
    render(<App />);
    expect(screen.getByText('Should I Test That?')).toBeInTheDocument();
  });

  it('renders Get Started button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('navigates to Calculator page when Get Started is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(button);
    // Calculator page has the progress indicator
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    // First section should be visible
    expect(screen.getByText('Baseline Metrics')).toBeInTheDocument();
  });

  it('can navigate back from Calculator to Welcome', () => {
    render(<App />);
    // Go to calculator
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    // Header title is clickable to go back
    fireEvent.click(screen.getByRole('button', { name: 'Experiment Value Calculator' }));
    // Should be back on welcome page
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });
});
