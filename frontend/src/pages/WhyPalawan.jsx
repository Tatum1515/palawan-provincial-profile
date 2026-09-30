import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Compass,
  Factory,
  Leaf,
  MapPinned,
  Ship,
  SunMedium,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import '../styles/why-palawan.css'

const advantages = [
  {
    icon: Compass,
    number: '01',
    title: 'Strategic positioning',
    text: 'Understand how location, access and market connections shape an investment decision in Palawan.',
  },
  {
    icon: Leaf,
    number: '02',
    title: 'Natural resource base',
    text: 'Explore opportunities connected to land, marine resources and resource-based economic activity.',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Diversified opportunities',
    text: 'Look beyond a single industry through a portfolio that spans tourism, agriculture, fisheries, energy and services.',
  },
  {
    icon: MapPinned,
    number: '04',
    title: 'Distinct locations',
    text: 'Compare municipalities and investment areas by location context, infrastructure and available opportunities.',
  },
  {
    icon: Users,
    number: '05',
    title: 'Local partnerships',
    text: 'Use the portal as a starting point for connecting with the provincial government and relevant stakeholders.',
  },
  {
    icon: BadgeCheck,
    number: '06',
    title: 'Information you can verify',
    text: 'Keep important figures, policies and project information tied to a source, date and responsible office.',
  },
]

const sectors = [
  ['Tourism & Hospitality', 'Visitor economy, accommodation, destination services and related enterprises.', Building2],
  ['Agriculture & Agri-business', 'Production, processing, storage and value-adding activities.', Factory],
  ['Fisheries & Blue Economy', 'Marine-based enterprise, aquaculture, processing and support services.', Ship],
  ['Renewable Energy', 'Clean energy and resource-efficient infrastructure opportunities.', SunMedium],
]

const evidence = [
  ['LOCATION', 'Where opportunity meets access', 'Site, connectivity and surrounding economic activity help define an investment case.'],
  ['ECONOMY', 'Know the market context', 'Use verified population, employment, tourism and industry indicators before evaluating a project.'],
  ['INFRASTRUCTURE', 'Understand enabling capacity', 'Air, sea, road, utilities and digital connectivity are part of the investment picture.'],
]

export default function WhyPalawan() {
  return (
    <>
      <section className="why-hero">
        <div className="why-hero-pattern" aria-hidden="true" />
        <div className="container why-hero-grid">
          <div className="why-hero-copy">
            <span className="eyebrow">WHY PALAWAN</span>
            <h1>A provincial investment story grounded in place.</h1>
            <p>
              Explore the factors behind Palawan’s investment potential through location context,
              economic information, sector opportunities and a direct path to government assistance.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-dark" to="/opportunities">
                Explore Opportunities <ArrowRight size={16} />
              </Link>
              <Link className="text-link" to="/economy">
                View the economy <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="why-hero-card">
            <div className="why-card-kicker">PALAWAN INVESTMENT PORTAL</div>
            <div className="why-card-title">See the province from an investor’s point of view.</div>
            <div className="why-card-rule" />
            <div className="why-card-meta">
              <span>Place</span>
              <span>Sector</span>
              <span>Evidence</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section why-overview">
        <div className="container why-overview-grid">
          <div>
            <span className="eyebrow">INVESTMENT PROPOSITION</span>
            <h2>Start with the whole province. Then go deeper.</h2>
          </div>
          <div className="prose">
            <p>
              A useful investment portal should answer the broad question first, then help an investor
              move quickly into a specific sector, location, project and government contact.
            </p>
            <p>
              This page provides the context. The opportunity portfolio, economic data and location
              profiles provide the detail.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-row why-section-heading">
            <div>
              <span className="eyebrow">INVESTMENT ADVANTAGES</span>
              <h2>What makes the Palawan story worth exploring?</h2>
            </div>
            <span className="section-note">Six lenses for investors</span>
          </div>

          <div className="why-advantage-grid">
            {advantages.map(({ icon: Icon, number, title, text }) => (
              <article className="why-advantage-card" key={title}>
                <div className="why-advantage-top">
                  <span>{number}</span>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section why-more">
        <div className="container why-more-grid">
          <div className="why-more-copy">
            <span className="eyebrow">MORE THAN TOURISM</span>
            <h2>A broader investment story across sectors.</h2>
            <p>
              Tourism is one part of the story. The portal should also help investors discover
              opportunities across resource-based industries, services and enabling infrastructure.
            </p>
            <Link className="text-link" to="/opportunities">
              Explore the sector portfolio <ArrowRight size={15} />
            </Link>
          </div>

          <div className="why-sector-list">
            {sectors.map(([title, text, Icon]) => (
              <Link className="why-sector-item" key={title} to={`/opportunities?sector=${encodeURIComponent(title)}`}>
                <span className="why-sector-icon"><Icon size={19} /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-row why-section-heading why-section-heading-dark">
            <div>
              <span className="eyebrow eyebrow-light">INVESTMENT EVIDENCE</span>
              <h2>Move from a claim to the information behind it.</h2>
            </div>
            <Link className="text-link text-link-light" to="/economy">
              Explore economic data <ArrowRight size={15} />
            </Link>
          </div>

          <div className="why-evidence-grid">
            {evidence.map(([label, title, text]) => (
              <article className="why-evidence-card" key={label}>
                <span>{label}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="why-evidence-footer">
                  <BadgeCheck size={16} />
                  Source and update details should accompany production data.
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section why-sustainability">
        <div className="container why-sustainability-grid">
          <div className="why-sustainability-mark">
            <Leaf size={34} strokeWidth={1.5} />
            <span>LONG-TERM VALUE</span>
          </div>
          <div>
            <span className="eyebrow">RESPONSIBLE INVESTMENT</span>
            <h2>Build investment information around long-term value.</h2>
            <p>
              Project information should make applicable environmental, regulatory and development
              considerations visible alongside the opportunity itself.
            </p>
          </div>
          <Link className="btn btn-light-outline" to="/resources">
            View investor resources <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container why-location-cta">
          <div>
            <span className="eyebrow">WHERE YOU INVEST MATTERS</span>
            <h2>Compare locations, not just project names.</h2>
            <p>Move from a province-wide view to municipality profiles, infrastructure context and local opportunity.</p>
          </div>
          <Link className="btn btn-dark" to="/locations">
            Explore investment locations <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section why-support">
        <div className="container">
          <div className="why-support-intro">
            <span className="eyebrow">GOVERNMENT PARTNER</span>
            <h2>A clear path from information to conversation.</h2>
            <p>
              Investors should not have to navigate a government website alone. The portal should make
              assistance visible and provide a clear next step.
            </p>
          </div>

          <div className="why-support-grid">
            <article>
              <span>01</span>
              <h3>Information &amp; Data</h3>
              <p>Find economic, sector, location and investment references in one place.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Government Coordination</h3>
              <p>Connect with the appropriate provincial office or partner agency for the next step.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Investment Assistance</h3>
              <p>Move from an initial question to a focused investor inquiry.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="why-final-cta">
        <div className="container why-final-cta-inner">
          <div>
            <span className="eyebrow-light">READY TO EXPLORE?</span>
            <h2>Find an opportunity, then start the conversation.</h2>
          </div>
          <div className="why-final-actions">
            <Link className="btn btn-light" to="/opportunities">Explore opportunities <ArrowRight size={16} /></Link>
            <Link className="btn btn-outline" to="/contact">Talk to an investment officer</Link>
          </div>
        </div>
      </section>
    </>
  )
}
