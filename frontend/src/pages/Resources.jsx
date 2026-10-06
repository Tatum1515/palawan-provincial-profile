import { FileText, Search } from 'lucide-react'
import { useState } from 'react'
import { resources } from '../data/siteData.js'
import SectionTitle from '../components/SectionTitle.jsx'

export default function Resources() {
  const [q, setQ] = useState('')
  const filtered = resources.filter((item) => `${item.title} ${item.type} ${item.description}`.toLowerCase().includes(q.toLowerCase()))
  return <><section className="page-hero"><div className="container"><span className="eyebrow">INVESTOR RESOURCES</span><h1>Documents, guides and reference material.</h1><p>A searchable resource center for approved plans, policies, reports, guides and project briefs.</p></div></section><section className="section"><div className="container"><SectionTitle eyebrow="RESOURCE CENTER" title="Find the document you need."><div className="search-box resource-search"><Search size={18}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search resources" aria-label="Search investor resources"/></div></SectionTitle><div className="resource-grid">{filtered.length ? filtered.map((item) => <article className="resource-card" key={item.id}><FileText size={24}/><span>{item.type}</span><h3>{item.title}</h3><p>{item.description}</p></article>) : <div className="resource-empty"><strong>No matching resources</strong><p>Try a broader search term to view the current resource list.</p></div>}</div></div></section></>
}
