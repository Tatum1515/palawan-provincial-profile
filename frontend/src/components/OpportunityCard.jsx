import { ArrowUpRight, BriefcaseBusiness, Building2, Cpu, Fish, Leaf, MapPin, Mountain, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'

const sectorIcons = {
  'TOURISM': Mountain,
  'AGRI-BUSINESS': Leaf,
  'FISHERIES': Fish,
  'ENERGY': Sun,
  'DIGITAL': Cpu,
  'INFRASTRUCTURE': Building2,
}

export default function OpportunityCard({ item, compact = false }) {
  const Icon = sectorIcons[item.sector] || BriefcaseBusiness

  return (
    <article className={`opp-card ${compact ? 'opp-card-compact' : ''}`}>
      <div className="opp-image" data-sector={item.sector}>
        <span className="opp-sector-icon" aria-hidden="true"><Icon size={20} /></span>
        <span className="opp-tag">{item.sector}</span>
        <span className="opp-word">PALAWAN</span>
      </div>
      <div className="opp-content">
        <div className="opp-meta"><span><MapPin size={13} aria-hidden="true" /> {item.location}</span><span>{item.stage}</span></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <Link className="text-link" to={`/opportunities/${item.id}`}>View opportunity <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <div className="opp-footer"><div><small>Sector</small><strong>{item.sector}</strong></div><div><small>Location</small><strong>{item.location}</strong></div></div>
      </div>
    </article>
  )
}
