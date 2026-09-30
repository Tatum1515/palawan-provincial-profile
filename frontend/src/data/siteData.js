export const sectors = [
  { name: 'Tourism & Hospitality', text: 'Hotels, resorts, destinations, eco-tourism and visitor services.' },
  { name: 'Agriculture & Agri-business', text: 'Value-adding, food processing, modern agriculture and supply chains.' },
  { name: 'Fisheries & Aquaculture', text: 'Sustainable fisheries, aquaculture, seafood processing and cold chain.' },
  { name: 'Renewable Energy', text: 'Clean energy, distributed power and resource-efficient projects.' },
  { name: 'ICT & Digital Services', text: 'Digital services, technology-enabled businesses and innovation.' },
  { name: 'Infrastructure & Logistics', text: 'Transport, warehousing, utilities and enabling infrastructure.' },
]

export const locations = [
  { name: 'Puerto Princesa City', description: 'Provincial capital and gateway for business, services, logistics and investment support.', sectors: ['ICT', 'Logistics', 'Tourism', 'Services'] },
  { name: 'El Nido', description: 'International tourism destination with opportunities in accommodation, destination services and sustainable tourism.', sectors: ['Tourism', 'Hospitality', 'Services'] },
  { name: 'Coron', description: 'Major tourism and maritime destination with opportunities linked to hospitality and marine services.', sectors: ['Tourism', 'Hospitality', 'Marine'] },
  { name: 'San Vicente', description: 'Emerging tourism and destination-development area with large-scale growth potential.', sectors: ['Tourism', 'Hospitality', 'Infrastructure'] },
  { name: 'Narra', description: 'Strategic southern location with agriculture, enterprise and logistics potential.', sectors: ['Agriculture', 'Logistics', 'Enterprise'] },
  { name: "Brooke's Point", description: 'Agriculture and coastal economy center with opportunities for value-adding industries.', sectors: ['Agriculture', 'Fisheries', 'Logistics'] },
]

export const opportunities = [
  { id: 'palawan-tourism-001', title: 'Sustainable Tourism Development', sector: 'Tourism & Hospitality', location: 'San Vicente', summary: 'Illustrative starter record for a tourism destination development opportunity. Replace with an approved project brief.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: true },
  { id: 'palawan-agri-001', title: 'Agri-processing & Cold Chain', sector: 'Agriculture & Agri-business', location: 'Narra', summary: 'Illustrative starter record for an agriculture value-chain and cold-storage investment opportunity.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: true },
  { id: 'palawan-fisheries-001', title: 'Sustainable Fisheries Enterprise', sector: 'Fisheries & Aquaculture', location: "Brooke's Point", summary: 'Illustrative starter record for fisheries processing and aquaculture-related enterprise development.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: false },
  { id: 'palawan-digital-001', title: 'Digital Services Hub', sector: 'ICT & Digital Services', location: 'Puerto Princesa City', summary: 'Illustrative starter record for technology-enabled services and shared digital infrastructure.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: false },
  { id: 'palawan-hospitality-001', title: 'Destination Accommodation Development', sector: 'Tourism & Hospitality', location: 'El Nido', summary: 'Illustrative starter record for a sustainable accommodation and visitor-services project.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: true },
  { id: 'palawan-logistics-001', title: 'Regional Logistics Support Facility', sector: 'Infrastructure & Logistics', location: 'Puerto Princesa City', summary: 'Illustrative starter record for logistics, warehousing and distribution services.', investment: 'For validation', area: 'For validation', stage: 'Concept', featured: false },
]

export const news = [
  { id: 1, category: 'Investment', date: 'September 2026', title: 'Palawan investment portal begins investor-facing rollout', summary: 'Starter news item for the redesigned portal. Replace with official PGP announcement before publication.' },
  { id: 2, category: 'Planning', date: 'September 2026', title: 'Provincial economic information center', summary: 'A single place for verified economic, investment and planning references.' },
  { id: 3, category: 'Business', date: 'Coming soon', title: 'Investor forum and business matching activities', summary: 'Publish confirmed dates, partners and registration details here.' },
]

export const resources = [
  { id: 1, title: 'Palawan Economic Profile', type: 'Report', description: 'Official economic profile and key indicators to be published after source validation.' },
  { id: 2, title: 'Investment Opportunities Portfolio', type: 'Portfolio', description: 'Approved project briefs and investment concepts.' },
  { id: 3, title: 'Provincial Development Documents', type: 'Planning', description: 'Development plans, investment programs and planning references.' },
  { id: 4, title: 'Investment Policies & Ordinances', type: 'Policy', description: 'Applicable provincial and local investment-related policies.' },
  { id: 5, title: 'Business Registration Guide', type: 'Guide', description: 'Links and references to official business registration channels.' },
  { id: 6, title: 'Maps & Location Profiles', type: 'Map', description: 'Investment location maps and site profile references.' },
]
