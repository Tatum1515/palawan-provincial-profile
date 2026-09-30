import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function OpportunityCard({ item }) {
  return (
    <article className="opp-card">
      <div className="opp-image"><span className="opp-tag">{item.sector}</span><span className="opp-word">PALAWAN</span></div>
      <div className="opp-content">
        <div className="opp-meta"><span><MapPin size={13} /> {item.location}</span><span>{item.stage}</span></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <Link className="text-link" to={`/opportunities/${item.id}`}>View opportunity <ArrowUpRight size={15} /></Link>
      </div>
    </article>
  )
}
