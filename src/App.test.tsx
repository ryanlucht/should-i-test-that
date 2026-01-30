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

  it('renders mode selection cards', () => {
    render(<App />);
    expect(screen.getByText('Basic Mode')).toBeInTheDocument();
    expect(screen.getByText('Advanced Mode')).toBeInTheDocument();
  });

  it('renders Get Started button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('navigates to Calculator page when Get Started is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(button);
    expect(screen.getByText('Calculator')).toBeInTheDocument();
  });

  it('can navigate back from Calculator to Welcome', () => {
    render(<App />);
    // Go to calculator
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(screen.getByText('Calculator')).toBeInTheDocument();
    // Go back to welcome
    fireEvent.click(screen.getByText('Back to Welcome'));
    expect(screen.getByText('Should I Test That?')).toBeInTheDocument();
  });
});
