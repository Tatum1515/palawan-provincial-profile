/**
 * Shared numeric helpers for the provincial profile data layer.
 *
 * Source values are intentionally kept as strings in provincialProfile.js so
 * the displayed values remain faithful to the supplied data. These helpers
 * only convert values for calculations and presentation.
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '' || value === '-') return null

  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatNumber(value, options = {}) {
  const numeric = typeof value === 'number' ? value : toNumber(value)
  if (numeric === null) return '—'

  const { maximumFractionDigits = 2, minimumFractionDigits = 0 } = options
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numeric)
}

export function formatPercent(value, options = {}) {
  const numeric = typeof value === 'number' ? value : toNumber(value)
  if (numeric === null) return '—'

  const { maximumFractionDigits = 2, minimumFractionDigits = 0, includeSymbol = true } = options
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numeric)

  return includeSymbol ? `${formatted}%` : formatted
}

export function formatDelta(current, previous, options = {}) {
  const currentNumber = typeof current === 'number' ? current : toNumber(current)
  const previousNumber = typeof previous === 'number' ? previous : toNumber(previous)

  if (currentNumber === null || previousNumber === null) return '—'

  const delta = currentNumber - previousNumber
  const sign = delta > 0 ? '+' : ''
  const { suffix = '' } = options
  return `${sign}${formatNumber(delta, options)}${suffix}`
}
