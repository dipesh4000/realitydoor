import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Button, Callout, Modal } from './index';

describe('UI primitives', () => {
  it('supports accessible semantic states and dialog actions', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <>
        <Callout tone="success" title="Ready to review">Your files are safe.</Callout>
        <Button>Continue</Button>
        <Modal open title="Delete this session?" description="This action cannot be undone." onClose={onClose}>
          <Button variant="danger">Delete everything</Button>
        </Modal>
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Delete this session?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledOnce();

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
