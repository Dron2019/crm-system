import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Currency } from '@/types';
import { useCurrencyStore } from '@/stores/currencyStore';

export function useCurrencies() {
  const setCurrencies = useCurrencyStore((s) => s.setCurrencies);

  const query = useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data } = await api.get('/currencies');
      // API returns { data: [...] } via CurrencyResource collection
      return data.data ?? data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

  useEffect(() => {
    if (query.data) {
      setCurrencies(query.data);
    }
  }, [query.data, setCurrencies]);

  return query;
}
