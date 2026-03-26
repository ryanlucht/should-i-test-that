import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useWizardStore } from '@/stores/wizardStore';

describe('App', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test to reset wizard state
    sessionStorage.clear();
    // Reset Zustand store to defaults between tests
    useWizardStore.setState({ guideEnabled: true });
  });

  it('renders the Bubbly Pill logo text', () => {
    render(<App />);
    // Logo renders "Should I", "Test", "That?" as separate spans
    expect(screen.getByText('Should I')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('That?')).toBeInTheDocument();
  });

  it('renders Start (with Guidance) button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
  });

  it('renders skip guidance link', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /I know what I'm doing/i })).toBeInTheDocument();
  });

  it('navigates to calculator when Start (with Guidance) is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
  });

  it('sets guideEnabled=true when Start (with Guidance) is clicked', () => {
    // First set guideEnabled to false to verify it gets set back to true
    useWizardStore.setState({ guideEnabled: false });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(useWizardStore.getState().guideEnabled).toBe(true);
  });

  it('navigates to calculator and sets guideEnabled=false when skip link is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I know what I'm doing/i }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    expect(useWizardStore.getState().guideEnabled).toBe(false);
  });

  it('can navigate back from calculator to welcome', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Experiment Value Calculator' }));
    expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
  });
});
