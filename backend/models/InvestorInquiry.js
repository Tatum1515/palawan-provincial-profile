import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  sector: { type: String, trim: true },
  location: { type: String, trim: true },
  estimatedInvestment: { type: String, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['NEW', 'CONTACTED', 'IN_REVIEW', 'CLOSED'], default: 'NEW' },
}, { timestamps: true })

export default mongoose.model('InvestorInquiry', schema)
