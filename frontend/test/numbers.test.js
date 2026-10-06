import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDelta, formatNumber, formatPercent, toNumber } from '../src/utils/numbers.js'

test('toNumber parses formatted numeric strings and preserves unavailable values as null', () => {
  assert.equal(toNumber('1,234.50'), 1234.5)
  assert.equal(toNumber(''), null)
  assert.equal(toNumber(null), null)
  assert.equal(toNumber('-'), null)
})

test('format helpers return display-safe values', () => {
  assert.equal(formatNumber('1234.5'), '1,234.5')
  assert.equal(formatNumber(null), '—')
  assert.equal(formatPercent('69.56'), '69.56%')
  assert.equal(formatPercent(null), '—')
  assert.equal(formatDelta('120', '100'), '+20')
  assert.equal(formatDelta('100', '120'), '-20')
  assert.equal(formatDelta(null, '120'), '—')
})

test('non-comparable employment series retain array behavior and expose metadata', async () => {
  const { provincialProfile } = await import('../src/data/provincialProfile.js')
  const participation = provincialProfile.employment.laborForceParticipationRate
  const laborForce = provincialProfile.employment.laborForce

  assert.equal(Array.isArray(participation), true)
  assert.equal(participation.comparable, false)
  assert.match(participation.note, /not be interpreted as a directly comparable trend/i)
  assert.equal(participation.find((item) => item.year === '2024')?.value, '69.56')

  assert.equal(Array.isArray(laborForce), true)
  assert.equal(laborForce.comparable, false)
  assert.equal(laborForce.find((item) => item.year === '2024')?.value, '305,057')
})

test('formatDelta handles zero, signed values, suffixes, and unavailable inputs', () => {
  assert.equal(formatDelta('100', '100'), '0')
  assert.equal(formatDelta(0, '1,000'), '-1,000')
  assert.equal(formatDelta('1,000', 0, { suffix: ' persons' }), '+1,000 persons')
  assert.equal(formatDelta('-', '100'), '—')
  assert.equal(formatDelta('', '100'), '—')
  assert.equal(formatDelta('100', undefined), '—')
})
