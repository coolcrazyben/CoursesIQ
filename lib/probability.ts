export type ProbLabel = 'LIKELY' | 'STABLE' | 'UNLIKELY' | 'UNKNOWN'

export function calcProbability(
  pos: number | null,
  total: number | null,
  maxEnroll?: number | null,
  dfwRate?: number | null,
): { label: ProbLabel; pct: number } {
  if (!pos) return { label: 'UNKNOWN', pct: 0 }

  // Enhanced formula: use expected drops from historical DFW rate
  if (dfwRate != null && maxEnroll && maxEnroll > 0) {
    const expectedDrops = dfwRate * maxEnroll
    const rawPct = Math.min(95, Math.round((expectedDrops / pos) * 100))
    if (rawPct >= 70) return { label: 'LIKELY',   pct: rawPct }
    if (rawPct >= 35) return { label: 'STABLE',   pct: rawPct }
    return              { label: 'UNLIKELY', pct: Math.max(5, rawPct) }
  }

  // Fallback: position/total ratio
  const ratio = total ? pos / total : null
  if (ratio !== null) {
    if (ratio <= 0.2)  return { label: 'LIKELY',   pct: Math.max(75, Math.round(95 - ratio * 50)) }
    if (ratio <= 0.55) return { label: 'STABLE',   pct: Math.round(65 - ratio * 40) }
    return               { label: 'UNLIKELY', pct: Math.max(5, Math.round(30 - (ratio - 0.55) * 60)) }
  }
  if (pos <= 3) return { label: 'LIKELY',   pct: 90 }
  if (pos <= 8) return { label: 'STABLE',   pct: 55 }
  return              { label: 'UNLIKELY', pct: 18 }
}
