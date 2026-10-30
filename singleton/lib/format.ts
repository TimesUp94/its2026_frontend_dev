export const formatPrice = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format
