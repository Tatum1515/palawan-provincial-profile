import { toNumber } from './numbers.js'

export const RELIGION_COLUMNS = [
  ['romanCatholic', 'Roman Catholic'],
  ['islam', 'Islam'],
  ['iglesiaNiCristo', 'Iglesia ni Cristo'],
  ['protestant', 'Protestant'],
  ['seventhDayAdventist', 'Seventh-day Adventist'],
  ['otherReligion', 'Other Religion'],
  ['noReligion', 'No Religion'],
]

function numeric(value) {
  return toNumber(value)
}

export function cleanMunicipalityName(name = '') {
  return String(name).replace(/,\s*Palawan$/i, '')
}

export function buildReligionDonutData(item = {}) {
  const total = numeric(item.totalPopulation)
  const categories = RELIGION_COLUMNS.map(([key, label]) => ({
    name: label,
    value: numeric(item[key]),
  }))

  const hasUnavailableCategory = categories.some((entry) => entry.value === null)

  if (total === null || hasUnavailableCategory) return categories

  const reported = categories.reduce((sum, entry) => sum + entry.value, 0)
  const remainder = Math.max(0, total - reported)

  if (remainder > 0) {
    categories.push({ name: 'Other / not reported', value: remainder })
  }

  return categories
}

export function buildReligionStackedData(items = []) {
  return items.map((item) => {
    const total = numeric(item?.totalPopulation)

    if (total === null || total === 0) {
      return {
        name: cleanMunicipalityName(item?.municipality),
        ...Object.fromEntries(RELIGION_COLUMNS.map(([key]) => [key, null])),
        remainder: null,
      }
    }

    const values = Object.fromEntries(
      RELIGION_COLUMNS.map(([key]) => {
        const value = numeric(item?.[key])
        return [key, value === null ? null : (value / total) * 100]
      }),
    )

    const allCategoriesReported = RELIGION_COLUMNS.every(([key]) => values[key] !== null)
    const reported = allCategoriesReported
      ? RELIGION_COLUMNS.reduce((sum, [key]) => sum + values[key], 0)
      : null

    return {
      name: cleanMunicipalityName(item?.municipality),
      ...values,
      remainder: reported === null ? null : Math.max(0, 100 - reported),
    }
  })
}
