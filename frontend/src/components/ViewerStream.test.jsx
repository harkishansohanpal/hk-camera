import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ViewerStream from './ViewerStream';

vi.mock('../hooks/useNightVision', () => ({
  useNightVision: () => {},
}));

describe('ViewerStream', () => {
  it('shows connecting overlay when status is connecting', () => {
    render(<ViewerStream status="connecting" />);
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });

  it('shows Camera Offline when status is disconnected', () => {
    render(<ViewerStream status="disconnected" />);
    expect(screen.getByText(/Camera Offline/i)).toBeInTheDocument();
  });

  it('shows Could Not Connect when status is error', () => {
    render(<ViewerStream status="error" />);
    expect(screen.getByText(/Could Not Connect/i)).toBeInTheDocument();
  });

  it('shows Waiting for camera when status is waiting', () => {
    render(<ViewerStream status="waiting" />);
    expect(screen.getByText(/Waiting for camera/i)).toBeInTheDocument();
  });

  it('does not show overlay when status is connected', () => {
    render(<ViewerStream status="connected" />);
    expect(screen.queryByText(/Connecting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Camera Offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Could Not Connect/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Waiting for camera/i)).not.toBeInTheDocument();
  });

  it('shows REC badge when isRecording is true', () => {
    render(<ViewerStream status="connected" isRecording={true} />);
    expect(screen.getByText(/REC/i)).toBeInTheDocument();
  });
});
