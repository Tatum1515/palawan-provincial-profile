import { toNumber } from './numbers.js'

export function getLatestPair(series = []) {
  const available = series
    .filter((item) => toNumber(item?.value) !== null)
    .slice()
    .sort((a, b) => {
      const aYear = Number(a?.year)
      const bYear = Number(b?.year)
      if (Number.isFinite(aYear) && Number.isFinite(bYear)) return aYear - bYear
      return String(a?.year ?? '').localeCompare(String(b?.year ?? ''))
    })

  return {
    previous: available.length > 1 ? available[available.length - 2] : null,
    current: available.length ? available[available.length - 1] : null,
  }
}

export function buildSparklineData(series = []) {
  return series.map((item) => ({
    year: item?.year ?? '—',
    value: item?.value ?? null,
    numericValue: toNumber(item?.value),
  }))
}
