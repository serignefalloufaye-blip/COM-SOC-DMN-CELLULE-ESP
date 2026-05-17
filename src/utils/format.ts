export const formatPrice = (price: number) => {
  if (price === undefined || price === null || isNaN(price)) return "0";
  // Replacing all types of space variants (space, no-break space, narrow no-break space) with a simple classic space.
  return new Intl.NumberFormat('fr-FR').format(price).replace(/[\s\u00A0\u202F]/g, ' ');
};

export const formatFullPrice = (price: number) => {
  return `${formatPrice(price)} FCFA`;
};
