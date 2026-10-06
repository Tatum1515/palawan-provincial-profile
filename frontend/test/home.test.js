import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSparklineData, getLatestPair } from '../src/utils/homeData.js'

test('getLatestPair selects the latest two available reported values', () => {
  const pair = getLatestPair([
    { year: '2015', value: '849,469' },
    { year: '2020', value: '939,594' },
    { year: '2024', value: '968,795' },
  ])

  assert.deepEqual(pair.previous, { year: '2020', value: '939,594' })
  assert.deepEqual(pair.current, { year: '2024', value: '968,795' })
})

test('getLatestPair ignores unavailable values without inventing replacements', () => {
  const pair = getLatestPair([
    { year: '2020', value: null },
    { year: '2024', value: '56,371' },
  ])

  assert.equal(pair.previous, null)
  assert.deepEqual(pair.current, { year: '2024', value: '56,371' })
})

test('buildSparklineData keeps source values while adding numeric chart values', () => {
  const result = buildSparklineData([
    { year: '2020', value: '939,594' },
    { year: '2024', value: null },
  ])

  assert.deepEqual(result, [
    { year: '2020', value: '939,594', numericValue: 939594 },
    { year: '2024', value: null, numericValue: null },
  ])
})
