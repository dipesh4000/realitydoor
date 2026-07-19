import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiPanel from './AiPanel';

vi.mock('../../api/chat', () => ({
  streamMessage: vi.fn(async (_message, handlers) => {
    handlers.onDelta('Add two ');
    handlers.onDelta('recent pay stubs.');
    handlers.onComplete({ sources: [{ title: 'Demo checklist', page: 1 }] });
  }),
}));

describe('AiPanel', () => {
  it('sends contextual suggestions and renders grounded sources', async () => {
    const user = userEvent.setup();
    render(<AiPanel open onOpenChange={() => {}} title="Document guide" subtitle="Know what to add" suggestedQuestions={['What documents are required?']} initialMessages={[]} />);

    await user.click(screen.getByRole('button', { name: 'What documents are required?' }));
    expect(await screen.findByText('Add two recent pay stubs.')).toBeInTheDocument();
    expect(screen.getByText('Demo checklist, p. 1')).toBeInTheDocument();
  });
});
