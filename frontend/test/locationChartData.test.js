import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReligionDonutData, buildReligionStackedData } from '../src/utils/locationChartData.js'

test('religion donut builder preserves unavailable values as null and does not infer a remainder', () => {
  const result = buildReligionDonutData({
    municipality: 'Example, Palawan',
    totalPopulation: '100',
    romanCatholic: '80',
    islam: null,
    iglesiaNiCristo: '5',
    protestant: '5',
    seventhDayAdventist: '2',
    otherReligion: '3',
    noReligion: '5',
  })

  assert.equal(result.find((item) => item.name === 'Islam')?.value, null)
  assert.equal(result.some((item) => item.name === 'Other / not reported'), false)
})

test('religion stacked builder returns null for an unavailable category instead of treating it as zero', () => {
  const result = buildReligionStackedData([{
    municipality: 'Example, Palawan',
    totalPopulation: '100',
    romanCatholic: '80',
    islam: null,
    iglesiaNiCristo: '5',
    protestant: '5',
    seventhDayAdventist: '2',
    otherReligion: '3',
    noReligion: '5',
  }])

  assert.equal(result[0].name, 'Example')
  assert.equal(result[0].romanCatholic, 80)
  assert.equal(result[0].islam, null)
  assert.equal(result[0].remainder, null)
})

test('religion stacked builder keeps a complete reported municipality at 100 percent', () => {
  const result = buildReligionStackedData([{
    municipality: 'Example, Palawan',
    totalPopulation: '100',
    romanCatholic: '50',
    islam: '10',
    iglesiaNiCristo: '10',
    protestant: '10',
    seventhDayAdventist: '5',
    otherReligion: '5',
    noReligion: '10',
  }])

  const total = [
    result[0].romanCatholic,
    result[0].islam,
    result[0].iglesiaNiCristo,
    result[0].protestant,
    result[0].seventhDayAdventist,
    result[0].otherReligion,
    result[0].noReligion,
    result[0].remainder,
  ].reduce((sum, value) => sum + value, 0)

  assert.equal(total, 100)
})
