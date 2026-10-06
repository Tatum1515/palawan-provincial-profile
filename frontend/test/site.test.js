import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('..', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('application routes include the public portal sections', async () => {
  const source = await read('./src/PPDO.jsx')
  for (const route of ['/profile', '/locations', '/data', '/why-palawan', '/doing-business', '/opportunities', '/resources', '/news', '/contact']) {
    assert.match(source, new RegExp(`path=["']${route.replace('/', '\\/')}["']`))
  }
  assert.match(source, /React\.lazy|lazy\(/)
})

test('data explorer route is connected to the supplied profile data', async () => {
  const source = await read('./src/pages/DataExplorer.jsx')
  assert.match(source, /provincialProfile/)
  assert.match(source, /Reference year/)
  assert.match(source, /Source/)
})

test('inquiry client never falls back to localStorage', async () => {
  const source = await read('./src/api/client.js')
  assert.doesNotMatch(source, /localStorage/)
  assert.match(source, /has not been submitted/i)
})

test('contact form includes an anti-bot honeypot and explicit error status', async () => {
  const source = await read('./src/pages/Contact.jsx')
  assert.match(source, /name="website"/)
  assert.match(source, /role=\{status\.type === 'error' \? 'alert' : 'status'\}/)
})

test('intro presentation has dialog accessibility and reduced-motion support', async () => {
  const source = await read('./src/components/IntroPresentation.jsx')
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /prefers-reduced-motion/)
  assert.match(source, /event\.key === 'Escape'/)
})

test('data explorer supports indicator detail views without changing supplied values', async () => {
  const source = await read('./src/pages/DataExplorer.jsx')
  assert.match(source, /useSearchParams/)
  assert.match(source, /selectedIndicator/)
  assert.match(source, /numericValue/)
  assert.match(source, /View detail/)
})


test('data explorer provides export and print actions without changing source values', async () => {
  const source = await read('./src/pages/DataExplorer.jsx')
  assert.match(source, /exportCsv/)
  assert.match(source, /text\/csv/)
  assert.match(source, /window\.print\(\)/)
  assert.match(source, /palawan-provincial-profile-data\.csv/)
})


test('data explorer indicator charts support PNG export with source metadata', async () => {
  const source = await read('./src/components/DataIndicatorChart.jsx')
  assert.match(source, /Download PNG/)
  assert.match(source, /canvas\.toBlob/)
  assert.match(source, /Reference year/)
  assert.match(source, /Source:/)
  assert.match(source, /onExportCsv/)
})
