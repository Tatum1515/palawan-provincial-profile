import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'
const { default: app } = await import('../server.js')

async function request(path, options = {}) {
  const server = app.listen(0)
  const address = server.address()
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    return { status: response.status, body: await response.json() }
  } finally {
    server.close()
  }
}

test('health endpoint works', async () => {
  const result = await request('/api/health')
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
})

test('opportunity list works without MongoDB', async () => {
  const result = await request('/api/opportunities')
  assert.equal(result.status, 200)
  assert.ok(Array.isArray(result.body))
  assert.ok(result.body.length > 0)
})

test('inquiry validates required fields', async () => {
  const result = await request('/api/inquiries', { method: 'POST', body: JSON.stringify({}) })
  assert.equal(result.status, 400)
})
