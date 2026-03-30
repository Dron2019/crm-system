import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import ApartmentImportExportDialog from '@/components/ApartmentImportExportDialog';
import { renderWithProviders } from '@/test/test-utils';

const addToastMock = vi.fn();

vi.mock('@/stores/toastStore', () => ({
  useToastStore: (selector: any) => selector({ addToast: addToastMock }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '@/lib/api';

describe('ApartmentImportExportDialog happy paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    } as any);

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/apartments/import-template') {
        return Promise.resolve({
          data: new Blob(['template'], { type: 'text/csv' }),
          headers: { 'content-disposition': 'attachment; filename="apartments-import-template.csv"' },
        });
      }

      if (url === '/projects/proj-1/buildings') {
        return Promise.resolve({
          data: { data: [{ id: 'b1', name: 'Building A' }] },
        });
      }

      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('downloads template, imports file, and exports csv', async () => {
    (api.post as any)
      .mockResolvedValueOnce({ data: { message: 'Import done', skipped: 0 } })
      .mockResolvedValueOnce({
        data: new Blob(['export'], { type: 'text/csv' }),
        headers: { 'content-disposition': 'attachment; filename="apartments-2026-03-30.csv"' },
      });

    renderWithProviders(
      <ApartmentImportExportDialog projectId="proj-1" buildingId="b1" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Import / Export Apartments' }));

    fireEvent.click(screen.getByRole('button', { name: 'Download Template' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/apartments/import-template', { responseType: 'blob' });
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['number,floor'], 'apartments.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/apartments/import', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(addToastMock).toHaveBeenCalledWith('Import done', 'success');
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/apartments/export',
        expect.objectContaining({
          project_id: 'proj-1',
          building_id: 'b1',
          fields: expect.arrayContaining(['project_name', 'building_name', 'number']),
        }),
        { responseType: 'blob' },
      );
      expect(addToastMock).toHaveBeenCalledWith('Apartments export generated', 'success');
    });
  });
});
