import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('..', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('heavy chart and opportunity map modules are lazy-loaded', async () => {
  const lazy = await read('./src/components/lazy.js')
  assert.match(lazy, /import\('\.\/charts\/DonutChart\.jsx'\)/)
  assert.match(lazy, /import\('\.\/StackedBar\.jsx'\)/)
  assert.match(lazy, /import\('\.\/TrendChart\.jsx'\)/)
  assert.match(lazy, /import\('\.\/FunnelChart\.jsx'\)/)
  assert.match(lazy, /import\('\.\/Sparkline\.jsx'\)/)
  assert.match(lazy, /import\('\.\/OpportunityMap\.jsx'\)/)

  const locations = await read('./src/pages/Locations.jsx')
  const opportunities = await read('./src/pages/Opportunities.jsx')
  assert.match(locations, /lazy\(\(\) => import\('\.\.\/components\/PalawanMap\.jsx'\)\)/)
  assert.match(opportunities, /LazyOpportunityMap/)
})

test('map controls expose keyboard labels and respect reduced-motion preference', async () => {
  const controls = await read('./src/components/AccessibleLeafletControls.jsx')
  const palawanMap = await read('./src/components/PalawanMap.jsx')
  const opportunityMap = await read('./src/components/OpportunityMap.jsx')
  const motionHook = await read('./src/hooks/usePrefersReducedMotion.js')
  const indexCss = await read('./src/index.css')

  assert.match(controls, /'aria-label', label/)
  assert.match(controls, /\['\.leaflet-control-zoom-in', 'Zoom in'\]/)
  assert.match(controls, /\['\.leaflet-control-zoom-out', 'Zoom out'\]/)
  assert.match(controls, /tabindex.*0/)
  assert.match(palawanMap, /keyboard/)
  assert.match(palawanMap, /Reset map view/)
  assert.match(palawanMap, /How to explore/)
  assert.match(palawanMap, /Not reported/)
  assert.match(palawanMap, /zoomAnimation=\{!prefersReducedMotion\}/)
  assert.match(opportunityMap, /keyboard/)
  assert.match(opportunityMap, /zoomAnimation=\{!prefersReducedMotion\}/)
  assert.match(motionHook, /prefers-reduced-motion: reduce/)
  assert.match(indexCss, /prefers-reduced-motion/) 
})
