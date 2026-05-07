export interface FillGauge {
  bar: string
  track: string
  badge: string
  label: string
  fillPct: number
}

export function fillGaugeColors(
  seatsAvailable: number,
  maxEnrollment: number,
  waitCount: number
): FillGauge {
  if (seatsAvailable === 0 && waitCount > 0)
    return { bar: 'bg-amber-400', track: 'bg-amber-100', badge: 'bg-amber-50 text-amber-700', label: 'Waitlisted', fillPct: 100 }
  if (maxEnrollment === 0)
    return { bar: 'bg-gray-300', track: 'bg-gray-100', badge: 'bg-gray-50 text-gray-500', label: 'Unknown', fillPct: 0 }
  const fillPct = ((maxEnrollment - seatsAvailable) / maxEnrollment) * 100
  if (seatsAvailable === 0)
    return { bar: 'bg-red-500', track: 'bg-red-100', badge: 'bg-red-50 text-red-700', label: 'Full', fillPct: 100 }
  if (fillPct < 50)
    return { bar: 'bg-green-500', track: 'bg-green-100', badge: 'bg-green-50 text-green-700', label: 'Open', fillPct }
  if (fillPct < 80)
    return { bar: 'bg-yellow-400', track: 'bg-yellow-100', badge: 'bg-yellow-50 text-yellow-700', label: 'Filling', fillPct }
  if (fillPct < 95)
    return { bar: 'bg-orange-400', track: 'bg-orange-100', badge: 'bg-orange-50 text-orange-700', label: 'Almost Full', fillPct }
  return { bar: 'bg-red-500', track: 'bg-red-100', badge: 'bg-red-50 text-red-700', label: 'Nearly Full', fillPct }
}
