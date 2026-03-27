import { create } from 'zustand';
import type { Currency } from '@/types';
import { convertAndFormat, convertAndFormatCompact } from '@/lib/currency';

interface CurrencyState {
  /** ISO-3 code of the user's chosen display currency */
  displayCurrency: string;
  /** List of all active currencies fetched from the API */
  currencies: Currency[];
  setDisplayCurrency: (code: string) => void;
  setCurrencies: (currencies: Currency[]) => void;
  /**
   * Convert + format an amount from `fromCurrency` into the display currency.
   * @param amount     The raw monetary value
   * @param fromCode   The ISO code the amount is stored in (e.g. deal.currency)
   */
  format: (amount: number, fromCode?: string) => string;
  /**
   * Same as format() but uses compact notation (e.g. "$50K").
   */
  formatCompact: (amount: number, fromCode?: string) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  displayCurrency: 'USD',
  currencies: [],

  setDisplayCurrency: (code) => set({ displayCurrency: code }),
  setCurrencies: (currencies) => set({ currencies }),

  format(amount, fromCode) {
    const { displayCurrency, currencies } = get();
    const from = fromCode ?? displayCurrency;
    if (currencies.length === 0) {
      // Fallback while currencies are loading
      return `${from} ${Number(amount).toLocaleString()}`;
    }
    return convertAndFormat(amount, from, displayCurrency, currencies);
  },

  formatCompact(amount, fromCode) {
    const { displayCurrency, currencies } = get();
    const from = fromCode ?? displayCurrency;
    if (currencies.length === 0) {
      const n = Number(amount);
      return n >= 1000 ? `${from} ${(n / 1000).toFixed(0)}K` : `${from} ${n}`;
    }
    return convertAndFormatCompact(amount, from, displayCurrency, currencies);
  },
}));
