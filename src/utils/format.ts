export const formatPrice = (price: number) => {
  if (price === undefined || price === null) return "0";
  // Forcer le format avec point comme séparateur de milliers pour éviter les ambiguités (le slash 1/500 mentionné par l'utilisateur)
  return new Intl.NumberFormat('fr-FR').format(price).replace(/\s/g, '.').replace(/\u00a0/g, '.');
};

export const formatFullPrice = (price: number) => {
  return `${formatPrice(price)} FCFA`;
};
