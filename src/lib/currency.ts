import type { Currency } from '@/types';

/**
 * Convert an amount from one currency to another using stored exchange rates.
 * Rates are stored as "1 USD = rate units of this currency".
 *
 * Formula: converted = amount * (toRate / fromRate)
 */
export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  currencies: Currency[]
): number {
  if (fromCode === toCode) return amount;
  const from = currencies.find((c) => c.code === fromCode);
  const to = currencies.find((c) => c.code === toCode);
  if (!from || !to) return amount;
  return amount * (to.rate / from.rate);
}

/**
 * Format a number as currency using Intl.NumberFormat.
 * Falls back to prefixing the code if the currency code is unrecognised.
 */
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}

/**
 * Convert + format in one step.
 */
export function convertAndFormat(
  amount: number,
  fromCode: string,
  displayCode: string,
  currencies: Currency[]
): string {
  const converted = convertAmount(amount, fromCode, displayCode, currencies);
  return formatCurrencyAmount(converted, displayCode);
}

/**
 * Convert + compact format (e.g. "$50K", "€1.2M").
 */
export function convertAndFormatCompact(
  amount: number,
  fromCode: string,
  displayCode: string,
  currencies: Currency[]
): string {
  const converted = convertAmount(amount, fromCode, displayCode, currencies);
  const to = currencies.find((c) => c.code === displayCode);
  const symbol = to?.symbol ?? displayCode;

  if (Math.abs(converted) >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(converted) >= 1_000) {
    return `${symbol}${(converted / 1_000).toFixed(0)}K`;
  }
  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
