import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = new URL('../src/', import.meta.url)

test('PPDO is the main entry component', () => {
  const code = readFileSync(new URL('PPDO.jsx', src), 'utf8')
  assert.match(code, /export default function PPDO/)
  assert.match(code, /<Routes>/)
})

test('main.jsx imports PPDO.jsx', () => {
  const code = readFileSync(new URL('main.jsx', src), 'utf8')
  assert.match(code, /import PPDO from ['"]\.\/PPDO\.jsx['"]/)
})


test('supplied provincial profile is the active data source', () => {
  const code = readFileSync(new URL('data/provincialProfile.js', src), 'utf8')
  assert.match(code, /Brief Provincial Profile|provincialProfile/)
  assert.match(code, /968,795/)
  assert.match(code, /41/)
})
