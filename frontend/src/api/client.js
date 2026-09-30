const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`)
  return body
}

export const getOpportunities = () => request('/opportunities')

export async function submitInquiry(payload) {
  try {
    return await request('/inquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    const demoKey = 'ppdo-demo-inquiries'
    const current = JSON.parse(localStorage.getItem(demoKey) || '[]')
    current.push({
      ...payload,
      id: `demo-${Date.now()}`,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(demoKey, JSON.stringify(current))
    return {
      demo: true,
      message: 'Inquiry saved in this browser (demo mode). Start the backend to send it to the server.',
    }
  }
}
