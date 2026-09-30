import { ArrowRight, CheckCircle2, Grid2X2, ListFilter, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import OpportunityCard from '../components/OpportunityCard.jsx'
import OpportunityFinder from '../components/OpportunityFinder.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { opportunities, sectors, locations } from '../data/siteData.js'
import '../styles/opportunity-portfolio.css'

const stages = [...new Set(opportunities.map((item) => item.stage).filter(Boolean))]

export default function Opportunities() {
  const [searchParams] = useSearchParams()
  const initialSector = searchParams.get('sector') || 'All'
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState(sectors.some((item) => item.name === initialSector) ? initialSector : 'All')
  const [location, setLocation] = useState('All')
  const [stage, setStage] = useState('All')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [compact, setCompact] = useState(false)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return opportunities.filter((item) => {
      const searchable = `${item.title} ${item.summary} ${item.sector} ${item.location} ${item.stage}`.toLowerCase()
      return (
        (!normalized || searchable.includes(normalized)) &&
        (sector === 'All' || item.sector === sector) &&
        (location === 'All' || item.location === location) &&
        (stage === 'All' || item.stage === stage) &&
        (!featuredOnly || item.featured)
      )
    })
  }, [query, sector, location, stage, featuredOnly])

  const clearFilters = () => {
    setQuery('')
    setSector('All')
    setLocation('All')
    setStage('All')
    setFeaturedOnly(false)
  }

  return (
    <>
      <section className="page-hero opportunities-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">INVESTMENT PORTFOLIO</span>
            <h1>Explore opportunities across Palawan.</h1>
            <p>Browse project concepts, investment themes and location-specific opportunities. Approved project information can be added to the portal without changing this interface.</p>
          </div>
          <div className="hero-summary-card">
            <span>PORTFOLIO SNAPSHOT</span>
            <strong>{opportunities.length}</strong>
            <p>starter opportunities in the current working dataset</p>
            <Link to="/contact" className="text-link">Talk to an investment officer <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="section opportunities-section">
        <div className="container">
          <OpportunityFinder
            query={query}
            sector={sector}
            location={location}
            stage={stage}
            sectors={sectors}
            locations={locations}
            stages={stages}
            resultCount={filtered.length}
            onQueryChange={setQuery}
            onSectorChange={setSector}
            onLocationChange={setLocation}
            onStageChange={setStage}
            onClear={clearFilters}
          />

          <div className="portfolio-toolbar">
            <div className="portfolio-context">
              <ListFilter size={15} />
              <span>{filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'} shown</span>
              {(sector !== 'All' || location !== 'All' || stage !== 'All' || query) && <span className="toolbar-muted">Filtered view</span>}
            </div>
            <div className="portfolio-actions">
              <button className={`toolbar-toggle ${featuredOnly ? 'active' : ''}`} type="button" onClick={() => setFeaturedOnly((value) => !value)}>
                <Sparkles size={14} /> Featured only
              </button>
              <div className="view-toggle" aria-label="View style">
                <button className={!compact ? 'active' : ''} type="button" onClick={() => setCompact(false)} aria-label="Card grid view"><Grid2X2 size={15} /></button>
                <button className={compact ? 'active' : ''} type="button" onClick={() => setCompact(true)} aria-label="Compact list view"><ListFilter size={15} /></button>
              </div>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className={`opportunity-results ${compact ? 'compact' : ''}`}>
              {filtered.map((item) => <OpportunityCard key={item.id} item={item} compact={compact} />)}
            </div>
          ) : (
            <div className="opportunity-empty">
              <CheckCircle2 size={24} />
              <h3>No opportunity matches those filters.</h3>
              <p>Try a broader search or clear the current filters to see the complete portfolio.</p>
              <button className="btn btn-dark" type="button" onClick={clearFilters}>Reset search</button>
            </div>
          )}
        </div>
      </section>

      <section className="section section-soft portfolio-help">
        <div className="container two-col">
          <div>
            <span className="eyebrow">NEED A DIFFERENT KIND OF OPPORTUNITY?</span>
            <h2>Tell us what you are looking for.</h2>
          </div>
          <div>
            <SectionTitle eyebrow="INVESTOR ASSISTANCE" title="We can route a specific inquiry to the appropriate support channel.">
              Use the investor inquiry form to tell PPDO what sector, location or project type you are exploring.
            </SectionTitle>
            <Link to="/contact" className="btn btn-dark">Submit an investor inquiry <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
