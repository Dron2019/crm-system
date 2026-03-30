import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import ApartmentDetailsPanel from '@/components/ApartmentDetailsPanel';
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

describe('ApartmentDetailsPanel attach flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches selected apartment to selected open deal', async () => {
    (api.get as any).mockResolvedValue({
      data: {
        data: [
          {
            id: 'deal-1',
            title: 'Warm lead',
            currency: 'USD',
            value: '15000',
          },
        ],
      },
    });
    (api.post as any).mockResolvedValue({ data: { data: { id: 'deal-1' } } });

    const apartment = {
      id: 'apt-123',
      number: 'A-101',
      floor: 10,
      section_id: null,
      rooms: 2,
      area: 67.5,
      price: 84500,
      status_name: 'Вільно',
      status_color: '#2196F3',
    };

    const { user } = renderWithProviders(<ApartmentDetailsPanel apartment={apartment} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/deals', { params: { per_page: 100, status: 'open' } });
    });

    await user.click(screen.getByLabelText('Open deal'));
    await user.click(await screen.findByRole('option', { name: 'Warm lead (USD 15000)' }));
    await user.click(screen.getByRole('button', { name: 'Attach to deal' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/deals/deal-1/attach-apartment', {
        apartment_id: 'apt-123',
      });
      expect(addToastMock).toHaveBeenCalledWith('Apartment attached to deal', 'success');
    });
  });
});
