import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookieBanner from './CookieBanner';

vi.mock('../lib/consent', () => ({
  consentStatus: vi.fn(),
  acceptConsent: vi.fn(),
  rejectConsent: vi.fn(),
}));

import { consentStatus, acceptConsent, rejectConsent } from '../lib/consent';

function renderBanner() {
  return render(
    <BrowserRouter>
      <CookieBanner />
    </BrowserRouter>
  );
}

describe('CookieBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders banner when consent not given', () => {
    consentStatus.mockReturnValue(null);
    renderBanner();
    expect(screen.getByText(/Your Privacy/i)).toBeInTheDocument();
    expect(screen.getByText(/Accept/i)).toBeInTheDocument();
    expect(screen.getByText(/Only Essential/i)).toBeInTheDocument();
  });

  it('does not render when consent given', () => {
    consentStatus.mockReturnValue('accepted');
    renderBanner();
    expect(screen.queryByText(/Your Privacy/i)).not.toBeInTheDocument();
  });

  it('clicking Accept calls acceptConsent and hides banner', () => {
    consentStatus.mockReturnValue(null);
    renderBanner();
    fireEvent.click(screen.getByText(/Accept/i));
    expect(acceptConsent).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Your Privacy/i)).not.toBeInTheDocument();
  });

  it('clicking Only Essential calls rejectConsent and hides banner', () => {
    consentStatus.mockReturnValue(null);
    renderBanner();
    fireEvent.click(screen.getByText(/Only Essential/i));
    expect(rejectConsent).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Your Privacy/i)).not.toBeInTheDocument();
  });
});
