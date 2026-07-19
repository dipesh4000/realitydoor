import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExtractionPage from './ExtractionPage';

vi.mock('../api/documents', () => ({
  confirmField: vi.fn(),
  correctField: vi.fn(),
  getDocumentContentUrl: vi.fn(() => '#'),
  getDocumentFields: vi.fn(() => Promise.resolve({ fields: [] })),
  getDocumentPageUrl: vi.fn(() => '#'),
  getDocuments: vi.fn(() => Promise.resolve({
    documents: [{ id: 'doc-unknown', name: 'unrelated-notes.txt', document_type: 'unknown', safety_flags: [] }],
  })),
}));

describe('ExtractionPage', () => {
  it('clearly explains when a document contains no useful application data', async () => {
    render(<MemoryRouter><ExtractionPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Nothing useful to review')).toBeInTheDocument();
      expect(screen.getByText('No useful application data was found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add a different document' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'See readiness' })).not.toBeInTheDocument();
    });
  });
});
