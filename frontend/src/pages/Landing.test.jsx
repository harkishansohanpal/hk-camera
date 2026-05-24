import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing', () => {
  it('renders without crashing', () => {
    renderLanding();
    expect(screen.getByText('HK Camera', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows HK Camera heading', () => {
    renderLanding();
    const headings = screen.getAllByText(/HK Camera/i);
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
