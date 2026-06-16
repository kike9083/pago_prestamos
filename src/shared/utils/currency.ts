export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  return parseFloat(cleaned);
};
