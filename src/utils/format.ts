export const formatPrice = (price: number) => {
  if (price === undefined || price === null) return "0";
  return new Intl.NumberFormat('fr-FR').format(price);
};

export const formatFullPrice = (price: number) => {
  return `${formatPrice(price)} FCFA`;
};
