import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formalizeDate = (timestamp: number | string | Date | undefined | null) => {
  if (!timestamp) return '---';
  const d = new Date(timestamp);
  return format(d, 'dd MMM yyyy à HH:mm', { locale: fr });
};

export const relativeDate = (timestamp: number | string | Date | undefined | null) => {
  if (!timestamp) return '---';
  const d = new Date(timestamp);
  if (isToday(d)) {
    return 'Aujourd\'hui à ' + format(d, 'HH:mm');
  }
  if (isYesterday(d)) {
    return 'Hier à ' + format(d, 'HH:mm');
  }
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
};

export const simpleDate = (timestamp: number | string | Date | undefined | null) => {
  if (!timestamp) return '---';
  const d = new Date(timestamp);
  return format(d, 'dd MMM yyyy', { locale: fr });
};

export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const getAutoDateData = (customDateVal?: string | Date | null) => {
  const dt = customDateVal ? new Date(customDateVal) : new Date();
  return {
    date: dt.getTime(),
    mois: MOIS[dt.getMonth()],
    annee: dt.getFullYear(),
    trimestre: Math.floor(dt.getMonth() / 3) + 1,
    heure: format(dt, 'HH:mm'),
    timestamp: dt.getTime(),
    rawDate: dt.toISOString()
  };
};
