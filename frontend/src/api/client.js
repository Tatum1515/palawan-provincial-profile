const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })
  } catch {
    throw new Error('We could not reach the inquiry service. Your inquiry has not been submitted. Please try again.')
  }

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body.message || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.details = body.errors || {}
    throw error
  }
  return body
}

export const getOpportunities = () => request('/opportunities')

export function submitInquiry(payload) {
  return request('/inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
