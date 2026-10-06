import assert from 'node:assert/strict'
import test from 'node:test'
import { findMunicipalityInLocation, municipalityNamesMatch, normalizeMunicipalityName } from '../src/utils/municipalityMatcher.js'

test('municipality matcher handles aliases and province suffixes', () => {
  assert.equal(normalizeMunicipalityName('Aborlan, Palawan'), 'aborlan')
  assert.equal(municipalityNamesMatch('El Nido (Bacuit)', 'El Nido'), true)
  assert.equal(municipalityNamesMatch('Rizal (Marcos)', 'Rizal, Palawan'), true)
  assert.equal(municipalityNamesMatch('Española', 'Sofronio Española'), true)
})

test('location matcher prefers the longest municipality name', () => {
  const names = ['Point', "Brooke's Point", 'Puerto Princesa City']
  assert.equal(findMunicipalityInLocation("Brooke's Point, Palawan", names), "Brooke's Point")
  assert.equal(findMunicipalityInLocation('Puerto Princesa City, Palawan', names), 'Puerto Princesa City')
  assert.equal(findMunicipalityInLocation('Unknown location', names), null)
})
