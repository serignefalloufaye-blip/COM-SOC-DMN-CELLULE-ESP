import React from 'react';
import { ModePaiement } from '../../types';
import { simpleDate } from '../../utils/date';

export const Badge = ({ mode, date }: { mode: ModePaiement, date?: number | string }) => {
  const formattedDate = date ? simpleDate(date) : null;
  const baseClass = "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap";
  let colorClass = "bg-emerald-100 text-emerald-700";
  let label = "ESP";
  
  if (mode === 'WAVE') {
    colorClass = "bg-blue-100 text-blue-600";
    label = "WAVE";
  } else if (mode === 'OM') {
    colorClass = "bg-orange-100 text-orange-600";
    label = "OM";
  }

  return (
    <span className={`${baseClass} ${colorClass}`}>
      {label} {formattedDate && `- ${formattedDate}`}
    </span>
  );
};

export const DateBadge = ({ date }: { date?: number | string }) => {
  if (!date) return null;
  const formattedDate = simpleDate(date);
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-gray-100 text-gray-500">
      {formattedDate}
    </span>
  );
};
