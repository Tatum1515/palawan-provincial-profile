import InvestorInquiry from '../models/InvestorInquiry.js'

const memory = []

export async function createInquiry(req, res) {
  const required = ['name', 'email', 'message']
  const missing = required.find((field) => !String(req.body?.[field] || '').trim())
  if (missing) return res.status(400).json({ message: `${missing} is required` })

  try {
    if (InvestorInquiry.db.readyState === 1) {
      const record = await InvestorInquiry.create(req.body)
      return res.status(201).json({ message: 'Inquiry submitted', inquiry: record })
    }
    const inquiry = { id: `local-${Date.now()}`, ...req.body, status: 'NEW', createdAt: new Date().toISOString() }
    memory.push(inquiry)
    return res.status(201).json({ message: 'Inquiry submitted', inquiry })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to submit inquiry', error: error.message })
  }
}
