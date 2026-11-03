export function cn(...classes) {
  return classes
    .flatMap((entry) => {
      if (!entry) return [];
      if (Array.isArray(entry)) return entry;
      return String(entry).split(' ');
    })
    .filter(Boolean)
    .join(' ');
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}
