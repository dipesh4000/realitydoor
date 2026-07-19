import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { acceptConsent, updateProfile } from '../api/session';

vi.mock('../api/session', () => ({
  acceptConsent: vi.fn(() => Promise.resolve()),
  updateProfile: vi.fn(() => Promise.resolve()),
}));

describe('ProfilePage', () => {
  it('requires explicit consent before saving the profile', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);

    const submit = screen.getByRole('button', { name: 'Save and add documents' });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /4 people/i }));
    await user.click(screen.getByRole('radio', { name: /50% MTSP/i }));
    await user.click(screen.getByRole('checkbox', { name: /I agree to document processing/i }));
    expect(submit).toBeEnabled();

    await user.click(submit);
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(4, 50));
    expect(acceptConsent).toHaveBeenCalledOnce();
  });
});
