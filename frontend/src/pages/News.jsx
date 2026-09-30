import { CalendarDays } from 'lucide-react'
import SectionTitle from '../components/SectionTitle.jsx'
import { news } from '../data/siteData.js'

export default function News() {
  return <><section className="page-hero"><div className="container"><span className="eyebrow">NEWS & EVENTS</span><h1>Updates for investors and partners.</h1><p>Publish official announcements, events, consultations, project milestones and investment activities.</p></div></section><section className="section"><div className="container"><div className="news-feature"><div><span className="eyebrow">FEATURED UPDATE</span><h2>Build trust by publishing timely, official investment information.</h2><p>Use this section for confirmed announcements rather than generic marketing copy.</p></div><CalendarDays size={50}/></div><SectionTitle eyebrow="LATEST" title="Recent updates"><span></span></SectionTitle><div className="news-grid">{news.map((item) => <article className="news-card" key={item.id}><small>{item.category}</small><h3>{item.title}</h3><span>{item.date}</span><p>{item.summary}</p></article>)}</div></div></section></>
}
