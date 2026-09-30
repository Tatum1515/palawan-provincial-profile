import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sector: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  summary: { type: String, required: true, trim: true },
  investment: { type: String, default: 'For validation' },
  area: { type: String, default: 'For validation' },
  stage: { type: String, default: 'Concept' },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('InvestmentOpportunity', schema)
