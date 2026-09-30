import InvestmentOpportunity from '../models/InvestmentOpportunity.js'

const starter = [
  { id: 'palawan-tourism-001', title: 'Sustainable Tourism Development', sector: 'Tourism & Hospitality', location: 'San Vicente', summary: 'Illustrative starter record for a tourism destination development opportunity. Replace with an approved project brief.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: true },
  { id: 'palawan-agri-001', title: 'Agri-processing & Cold Chain', sector: 'Agriculture & Agri-business', location: 'Narra', summary: 'Illustrative starter record for an agriculture value-chain and cold-storage investment opportunity.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: true },
  { id: 'palawan-fisheries-001', title: 'Sustainable Fisheries Enterprise', sector: 'Fisheries & Aquaculture', location: "Brooke's Point", summary: 'Illustrative starter record for fisheries processing and aquaculture-related enterprise development.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: false },
  { id: 'palawan-digital-001', title: 'Digital Services Hub', sector: 'ICT & Digital Services', location: 'Puerto Princesa City', summary: 'Illustrative starter record for technology-enabled services and shared digital infrastructure.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: false },
]

export async function listOpportunities(req, res) {
  try {
    if (InvestmentOpportunity.db.readyState !== 1) {
      let result = starter
      if (req.query.sector) result = result.filter((item) => item.sector === req.query.sector)
      if (req.query.location) result = result.filter((item) => item.location === req.query.location)
      return res.json(result)
    }
    const filter = { published: true }
    if (req.query.sector) filter.sector = req.query.sector
    if (req.query.location) filter.location = req.query.location
    return res.json(await InvestmentOpportunity.find(filter).sort({ featured: -1, createdAt: -1 }).lean())
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load opportunities', error: error.message })
  }
}

export async function getOpportunity(req, res) {
  try {
    if (InvestmentOpportunity.db.readyState !== 1) {
      const item = starter.find((entry) => entry.id === req.params.id)
      return item ? res.json(item) : res.status(404).json({ message: 'Opportunity not found' })
    }
    const item = await InvestmentOpportunity.findOne({ _id: req.params.id, published: true }).lean()
    return item ? res.json(item) : res.status(404).json({ message: 'Opportunity not found' })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load opportunity', error: error.message })
  }
}
