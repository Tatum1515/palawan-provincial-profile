import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { opportunities } from '../data/siteData.js'
import '../styles/opportunity-detail.css'

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="detail-fact">
      <span className="detail-fact-label">
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  )
}

export default function OpportunityDetail() {
  const { id } = useParams()
  const item = opportunities.find((entry) => entry.id === id)

  if (!item) {
    return (
      <section className="section opportunity-not-found">
        <div className="container not-found-card">
          <span className="eyebrow">INVESTMENT PORTFOLIO</span>
          <h1>Opportunity not found.</h1>
          <p>The project record may have been moved, removed, or is not yet available in the current portfolio.</p>
          <Link className="btn btn-dark" to="/opportunities">
            <ArrowLeft size={16} /> Back to opportunities
          </Link>
        </div>
      </section>
    )
  }

  const related = opportunities
    .filter((entry) => entry.id !== item.id && (entry.sector === item.sector || entry.location === item.location))
    .slice(0, 3)

  return (
    <div className="opportunity-detail-page">
      <section className="detail-hero-new">
        <div className="container">
          <Link className="back-link" to="/opportunities">
            <ArrowLeft size={15} /> All opportunities
          </Link>

          <div className="detail-hero-layout">
            <div className="detail-hero-copy">
              <span className="eyebrow">{item.sector.toUpperCase()}</span>
              <h1>{item.title}</h1>
              <p>{item.summary}</p>
              <div className="detail-hero-actions">
                <Link className="btn btn-dark" to="/contact">
                  Ask about this opportunity <MessageCircle size={16} />
                </Link>
                <Link className="btn btn-light" to="/opportunities">
                  Browse portfolio <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="detail-hero-visual" data-sector={item.sector}>
              <div className="detail-visual-grid" aria-hidden="true" />
              <div className="detail-visual-stamp">
                <span>PALAWAN</span>
                <strong>INVEST</strong>
              </div>
              <div className="detail-visual-caption">
                <MapPin size={14} />
                <span>{item.location}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="detail-facts-wrap">
        <div className="container detail-facts-grid">
          <DetailRow icon={MapPin} label="Location" value={item.location} />
          <DetailRow icon={Building2} label="Sector" value={item.sector} />
          <DetailRow icon={Landmark} label="Indicative investment" value={item.investment} />
          <DetailRow icon={Ruler} label="Project area" value={item.area} />
          <DetailRow icon={Clock3} label="Development stage" value={item.stage} />
        </div>
      </section>

      <section className="section detail-main-section">
        <div className="container detail-content-grid">
          <main className="detail-main-copy">
            <span className="eyebrow">PROJECT PROFILE</span>
            <h2>Understand the opportunity before you take the next step.</h2>
            <p className="detail-lead">
              This portfolio page is designed to bring the essential project information together in one place.
              Approved project briefs, site information and official supporting documents can be published here as they become available.
            </p>

            <div className="detail-section-block">
              <div className="detail-section-heading">
                <span>01</span>
                <div>
                  <span className="eyebrow">PROJECT OVERVIEW</span>
                  <h3>What the project is about</h3>
                </div>
              </div>
              <p>
                Use this section for the approved project rationale, intended outcomes, development concept and the specific opportunity being offered to investors.
                Keeping the summary structured makes it easier for prospective investors to understand the project quickly.
              </p>
            </div>

            <div className="detail-section-block">
              <div className="detail-section-heading">
                <span>02</span>
                <div>
                  <span className="eyebrow">INVESTOR CHECKLIST</span>
                  <h3>Information to review</h3>
                </div>
              </div>
              <div className="detail-check-grid">
                <div><CheckCircle2 size={16} /> Site and location information</div>
                <div><CheckCircle2 size={16} /> Indicative investment requirement</div>
                <div><CheckCircle2 size={16} /> Development stage and timeline</div>
                <div><CheckCircle2 size={16} /> Applicable permits and approvals</div>
                <div><CheckCircle2 size={16} /> Participation or ownership model</div>
                <div><CheckCircle2 size={16} /> Official project contact</div>
              </div>
            </div>

            <div className="detail-section-block">
              <div className="detail-section-heading">
                <span>03</span>
                <div>
                  <span className="eyebrow">DOCUMENTS & REFERENCES</span>
                  <h3>Supporting information</h3>
                </div>
              </div>
              <div className="detail-doc-placeholder">
                <FileText size={20} />
                <div>
                  <strong>Approved project brief</strong>
                  <span>Attach the official project profile, map, feasibility material or other approved references here.</span>
                </div>
                <span className="doc-state">Coming soon</span>
              </div>
            </div>
          </main>

          <aside className="detail-sidebar">
            <div className="detail-side-card dark">
              <ShieldCheck size={22} />
              <span className="eyebrow">INVESTOR ASSISTANCE</span>
              <h3>Need more information?</h3>
              <p>Send an inquiry and tell us what you would like to know about this project.</p>
              <Link className="btn btn-light full" to="/contact">
                Contact PPDO <ArrowUpRight size={15} />
              </Link>
            </div>

            <div className="detail-side-card">
              <span className="eyebrow">PROJECT SNAPSHOT</span>
              <dl className="snapshot-list">
                <div><dt>Location</dt><dd>{item.location}</dd></div>
                <div><dt>Sector</dt><dd>{item.sector}</dd></div>
                <div><dt>Stage</dt><dd>{item.stage}</dd></div>
                <div><dt>Investment</dt><dd>{item.investment}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section-soft related-opportunities">
          <div className="container">
            <div className="section-row">
              <div>
                <span className="eyebrow">KEEP EXPLORING</span>
                <h2>Related opportunities</h2>
              </div>
              <Link className="text-link" to="/opportunities">
                View full portfolio <ArrowRight size={15} />
              </Link>
            </div>

            <div className="related-grid">
              {related.map((entry) => (
                <article className="related-card" key={entry.id}>
                  <span className="eyebrow">{entry.sector}</span>
                  <h3>{entry.title}</h3>
                  <p><MapPin size={14} /> {entry.location}</p>
                  <Link className="text-link" to={`/opportunities/${entry.id}`}>
                    View opportunity <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
