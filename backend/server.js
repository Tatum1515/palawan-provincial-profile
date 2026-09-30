import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { connectDb } from './config/db.js'
import inquiryRoutes from './routes/inquiryRoutes.js'
import opportunityRoutes from './routes/opportunityRoutes.js'

const app = express()
const port = Number(process.env.PORT || 5000)
const origin = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin, credentials: false }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ppdo-palawan-invest-api' })
})

app.use('/api/opportunities', opportunityRoutes)
app.use('/api/inquiries', inquiryRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Internal server error' })
})

if (process.env.NODE_ENV !== 'test') {
  await connectDb().catch((error) => console.error('MongoDB connection skipped:', error.message))
  app.listen(port, () => console.log(`PPDO API running at http://localhost:${port}`))
}

export default app
