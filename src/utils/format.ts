export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR').format(price);
};

export const formatFullPrice = (price: number) => {
  return `${formatPrice(price)} FCFA`;
};
