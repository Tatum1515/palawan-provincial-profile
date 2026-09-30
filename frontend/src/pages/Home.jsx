import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Database,
  GraduationCap,
  LandPlot,
  Map,
  Trees,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import GovernorFeature from '../components/GovernorFeature.jsx'
import { provincialProfile } from '../data/provincialProfile.js'
import '../styles/profile-home.css'

const pick = (items, key, value) => items.find((item) => item[key] === value)

const toNumber = (value) => {
  if (value === null || value === undefined || value === '' || value === '-') return null
  const parsed = Number(String(value).replaceAll(',', ''))
  return Number.isFinite(parsed) ? parsed : null
}

function MiniBarSeries({ values, formatter = (value) => value.toLocaleString() }) {
  const numericValues = values.map((item) => toNumber(item.value)).filter((value) => value !== null)
  const max = Math.max(...numericValues, 1)

  return (
    <div className="mini-bar-series" aria-label="Data series comparison">
      {values.map((item) => {
        const numeric = toNumber(item.value)
        const width = numeric === null ? 0 : (numeric / max) * 100
        return (
          <div className="mini-bar-row" key={`${item.year}-${item.value}`}>
            <span className="mini-bar-label">{item.year}</span>
            <div className="mini-bar-track" aria-hidden="true">
              <span className="mini-bar-fill" style={{ width: `${Math.max(width, numeric && width > 0 ? 2 : 0)}%` }} />
            </div>
            <strong>{numeric === null ? '—' : formatter(numeric)}</strong>
          </div>
        )
      })}
    </div>
  )
}

function MetricRing({ value, label }) {
  const numeric = Math.max(0, Math.min(100, toNumber(value) ?? 0))
  return (
    <div className="metric-ring-wrap">
      <div className="metric-ring" style={{ '--ring-progress': `${numeric}%` }}>
        <div className="metric-ring-center">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { geographicAdministrative, headlineFacts, population, employment, higherEducation, tvet, religiousAffiliation } = provincialProfile
  const population2024 = pick(population.totalPopulation, 'year', '2024')?.value
  const employment2024 = pick(employment.employmentRate, 'year', '2024')?.value
  const laborForce2024 = pick(employment.laborForce, 'year', '2024')?.value
  const higherEdEnrollment2025 = pick(higherEducation.enrollment, 'year', '2025')?.value
  const higherEdGraduates2025 = pick(higherEducation.graduates, 'year', '2025')?.value
  const literacy2024 = population.literacyRate.value
  const unemployment2024 = pick(employment.unemploymentRate, 'year', '2024')?.value
  const underemployment2024 = pick(employment.underemploymentRate, 'year', '2024')?.value
  const populationSeries = population.totalPopulation
  const higherEdSeries = higherEducation.enrollment
  const tvetPerformanceSeries = tvet.performance.enrollment
  const tvetEnrollment2024 = pick(tvetPerformanceSeries, 'year', '2024')?.value
  const tvetGraduates2024 = pick(tvet.performance.graduates, 'year', '2024')?.value
  const tvetPassers2024 = pick(tvet.performance.certificationPassers, 'year', '2024')?.value
  const municipalityCount = pick(geographicAdministrative, 'label', 'Municipalities')?.value
  const barangayCount = pick(geographicAdministrative, 'label', 'Barangays')?.value
  const islandCount = pick(geographicAdministrative, 'label', 'Islands')?.value

  const geographic = geographicAdministrative.slice(0, 9)

  return (
    <>
      <section className="profile-hero">
        <div className="profile-hero-grid" aria-hidden="true" />
        <div className="container profile-hero-inner">
          <div className="profile-hero-copy">
            <span className="eyebrow-light">BRIEF PROVINCIAL PROFILE</span>
            <h1>Palawan, <em>in data.</em></h1>
            <p>
              Geographic, population, employment, religious affiliation, higher education, and TVET information presented from the supplied provincial profile.
            </p>
            <div className="profile-hero-actions">
              <Link className="btn btn-light" to="/profile">View complete profile <ArrowRight size={16} /></Link>
              <Link className="btn btn-outline" to="/locations">View municipalities <Map size={16} /></Link>
            </div>
          </div>

          <div className="profile-hero-data" aria-label="Selected provincial profile values">
            <div className="hero-data-accent" aria-hidden="true"><span /><span /><span /><span /></div>
            <div className="hero-data-row">
              <span>Region</span>
              <strong>{pick(geographicAdministrative, 'label', 'Region')?.value}</strong>
            </div>
            <div className="hero-data-row">
              <span>Distance from Manila</span>
              <strong>{pick(geographicAdministrative, 'label', 'Distance from Manila')?.value}</strong>
            </div>
            <div className="hero-data-row">
              <span>Total Land Area</span>
              <strong>{pick(geographicAdministrative, 'label', 'Total Land Area')?.value}</strong>
            </div>
            <div className="hero-data-foot"><span>01</span> Source-driven provincial data</div>
          </div>
        </div>
      </section>

      <div className="home-section-index" aria-label="Homepage sections">
        <a href="#data-dashboard">Data</a>
        <a href="#overview">Profile</a>
        <a href="#snapshot">Figures</a>
        <a href="#geographic">Geography</a>
      </div>

      <section className="profile-stat-section">
        <div className="container">
          <div className="profile-stat-strip">
            {headlineFacts.map((item) => (
              <div className="profile-stat" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-government">
        <div className="container">
          <GovernorFeature />
        </div>
      </section>

      <section className="section section-data-dashboard" id="data-dashboard">
        <div className="container">
          <div className="profile-section-heading data-dashboard-heading">
            <div>
              <span className="eyebrow">DATA DASHBOARD</span>
              <h2>A visual reading of selected provincial figures.</h2>
            </div>
            <p>Charts summarize values already reported in the supplied profile. Detailed tables remain available in the complete profile.</p>
          </div>

          <div className="data-dashboard-grid">
            <article className="data-dashboard-card data-dashboard-population">
              <div className="data-dashboard-card-head">
                <div>
                  <span className="dashboard-card-kicker">POPULATION</span>
                  <h3>Population series</h3>
                  <p>2015, 2020 and 2024 total population.</p>
                </div>
                <span className="dashboard-card-year">2024</span>
              </div>
              <MiniBarSeries values={populationSeries} />
              <Link className="dashboard-card-link" to="/profile#population">Open population data <ArrowRight size={14} /></Link>
            </article>

            <article className="data-dashboard-card data-dashboard-workforce">
              <div className="data-dashboard-card-head">
                <div>
                  <span className="dashboard-card-kicker">EMPLOYMENT</span>
                  <h3>2024 workforce snapshot</h3>
                  <p>Employment and unemployment are shown separately.</p>
                </div>
                <BriefcaseBusiness size={19} />
              </div>
              <div className="workforce-visual">
                <MetricRing value={employment2024} label="employment" />
                <div className="workforce-side-metrics">
                  <div><strong>{unemployment2024}</strong><span>Unemployment rate</span></div>
                  <div><strong>{underemployment2024}</strong><span>Underemployment rate</span></div>
                </div>
              </div>
              <Link className="dashboard-card-link" to="/profile#employment">Open employment data <ArrowRight size={14} /></Link>
            </article>

            <article className="data-dashboard-card data-dashboard-talent">
              <div className="data-dashboard-card-head">
                <div>
                  <span className="dashboard-card-kicker">TALENT POOL</span>
                  <h3>Education & training</h3>
                  <p>Selected higher-education and TVET reference values.</p>
                </div>
                <GraduationCap size={19} />
              </div>
              <div className="talent-metric-stack">
                <div className="talent-metric-line">
                  <span>Higher education enrollment · 2025</span>
                  <strong>{higherEdEnrollment2025}</strong>
                </div>
                <MiniBarSeries values={higherEdSeries} formatter={(value) => value.toLocaleString()} />
                <div className="talent-divider" />
                <div className="tvet-quick-grid">
                  <div><strong>{tvetEnrollment2024}</strong><span>TVET enrollment · 2024</span></div>
                  <div><strong>{tvetGraduates2024}</strong><span>TVET graduates · 2024</span></div>
                  <div><strong>{tvetPassers2024}</strong><span>Certification passers · 2024</span></div>
                </div>
              </div>
              <Link className="dashboard-card-link" to="/profile#higher-education">Open talent pool data <ArrowRight size={14} /></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-story" id="data-story">
        <div className="container">
          <div className="profile-section-heading data-story-heading">
            <div>
              <span className="eyebrow">DATA STORY</span>
              <h2>Read Palawan through three connected lenses.</h2>
            </div>
            <p>These visual summaries connect the same reference values without adding or estimating information beyond the supplied profile.</p>
          </div>

          <div className="data-story-grid">
            <Link to="/profile#population" className="data-story-card data-story-population">
              <div className="data-story-number">01</div>
              <div className="data-story-content">
                <span>PEOPLE</span>
                <h3>A population picture across reported years.</h3>
                <div className="story-value-row"><strong>{population2024}</strong><span>2024 total population</span></div>
                <div className="story-bars" aria-hidden="true">
                  {populationSeries.map((item) => {
                    const n = toNumber(item.value) ?? 0
                    const max = Math.max(...populationSeries.map((x) => toNumber(x.value) ?? 0), 1)
                    return <span key={item.year} style={{ height: `${Math.max((n / max) * 100, 8)}%` }} title={item.year} />
                  })}
                </div>
                <span className="story-link">Explore population <ArrowRight size={14} /></span>
              </div>
            </Link>

            <Link to="/profile#higher-education" className="data-story-card data-story-learning">
              <div className="data-story-number">02</div>
              <div className="data-story-content">
                <span>LEARNING & TRAINING</span>
                <h3>Education and training reference values.</h3>
                <div className="story-stat-pair">
                  <div><strong>{higherEdEnrollment2025}</strong><span>Higher education enrollment · 2025</span></div>
                  <div><strong>{tvetEnrollment2024}</strong><span>TVET enrollment · 2024</span></div>
                </div>
                <span className="story-link">Explore education data <ArrowRight size={14} /></span>
              </div>
            </Link>

            <Link to="/profile#geographic" className="data-story-card data-story-place">
              <div className="data-story-number">03</div>
              <div className="data-story-content">
                <span>PLACE & ADMINISTRATION</span>
                <h3>A province defined by its geographic structure.</h3>
                <div className="story-stat-pair story-stat-triple">
                  <div><strong>{municipalityCount ?? '—'}</strong><span>Municipalities</span></div>
                  <div><strong>{barangayCount ?? '—'}</strong><span>Barangays</span></div>
                  <div><strong>{islandCount ?? '—'}</strong><span>Islands</span></div>
                </div>
                <span className="story-link">Explore geography <ArrowRight size={14} /></span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="section profile-overview-section" id="overview">
        <div className="container">
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">PROFILE OVERVIEW</span>
              <h2>Six core sections from the supplied profile.</h2>
            </div>
            <p>{provincialProfile.statusNote}</p>
          </div>

          <div className="profile-section-grid">
            <Link to="/profile#geographic" className="profile-section-card">
              <span><LandPlot size={18} /></span>
              <strong>Geographic & Administrative</strong>
              <small>Region, land area, forests, protected areas, islands, municipalities, barangays and districts.</small>
            </Link>
            <Link to="/profile#population" className="profile-section-card">
              <span><Users size={18} /></span>
              <strong>Population</strong>
              <small>Population, growth, density, households, poverty, subsistence and literacy indicators.</small>
            </Link>
            <Link to="/profile#employment" className="profile-section-card">
              <span><BriefcaseBusiness size={18} /></span>
              <strong>Employment</strong>
              <small>Labor force participation, employment, unemployment, underemployment and labor force.</small>
            </Link>
            <Link to="/profile#religious-affiliation" className="profile-section-card">
              <span><Database size={18} /></span>
              <strong>Religious Affiliation</strong>
              <small>Province-level and municipality-level counts from the supplied 2024 CBMS table.</small>
            </Link>
            <Link to="/profile#higher-education" className="profile-section-card">
              <span><GraduationCap size={18} /></span>
              <strong>Higher Education / Talent Pool</strong>
              <small>Listed institutions, PSU and WPU campuses, enrollment and graduates.</small>
            </Link>
            <Link to="/profile#tvet" className="profile-section-card">
              <span><BookOpen size={18} /></span>
              <strong>Technical-Vocational Education and Training</strong>
              <small>Providers, programs, assessment centers, performance and major TVET sectors.</small>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-soft profile-snapshot-section" id="snapshot">
        <div className="container">
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">LATEST REFERENCE VALUES</span>
              <h2>Selected figures, exactly as reported.</h2>
            </div>
            <Link className="text-link" to="/profile">See all profile data <ArrowRight size={15} /></Link>
          </div>

          <div className="snapshot-grid">
            <article className="snapshot-card snapshot-card-featured">
              <span>2024 TOTAL POPULATION</span>
              <strong>{population2024}</strong>
              <small>Source: {population.source}</small>
            </article>
            <article className="snapshot-card">
              <span>2024 EMPLOYMENT RATE</span>
              <strong>{employment2024}</strong>
              <small>Source: {employment.source}</small>
            </article>
            <article className="snapshot-card">
              <span>2024 LABOR FORCE</span>
              <strong>{laborForce2024}</strong>
              <small>Source: {employment.source}</small>
            </article>
            <article className="snapshot-card">
              <span>2024 LITERACY RATE</span>
              <strong>{literacy2024}</strong>
              <small>Source: {population.source}</small>
            </article>
            <article className="snapshot-card">
              <span>2025 HIGHER EDUCATION ENROLLMENT</span>
              <strong>{higherEdEnrollment2025}</strong>
              <small>{higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}</small>
            </article>
            <article className="snapshot-card">
              <span>2025 HIGHER EDUCATION GRADUATES</span>
              <strong>{higherEdGraduates2025}</strong>
              <small>{higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}</small>
            </article>
            <article className="snapshot-card">
              <span>TESDA-REGISTERED TVET PROVIDERS</span>
              <strong>{tvet.institutions.tesdaRegisteredProviders}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
            <article className="snapshot-card">
              <span>REGISTERED TVET PROGRAMS</span>
              <strong>{tvet.institutions.registeredPrograms}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
          </div>
        </div>
      </section>

      <section className="section profile-geographic-section" id="geographic">
        <div className="container">
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">GEOGRAPHIC & ADMINISTRATIVE DATA</span>
              <h2>Provincial structure and natural asset figures.</h2>
            </div>
            <Link className="text-link" to="/profile#geographic">Open full section <ArrowRight size={15} /></Link>
          </div>

          <div className="geographic-grid">
            {geographic.map((item) => (
              <article className="geo-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value ?? '—'}</strong>
                {item.source && <small>Source: {item.source}</small>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark profile-data-note-section">
        <div className="container profile-data-note">
          <div>
            <span className="eyebrow-light">SOURCE NOTE</span>
            <h2>Use the supplied profile as the reference record.</h2>
            <p>
              Missing fields remain unfilled. Separate reference values are kept as reported rather than being reconciled or replaced with outside data.
            </p>
          </div>
          <div className="profile-source-list">
            {provincialProfile.sources.map((source) => <span key={source}>{source}</span>)}
          </div>
          <div className="profile-note-value">
            <BarChart3 size={17} />
            <span>Unlabeled source value: <strong>0.1127424126</strong></span>
          </div>
        </div>
      </section>

      <section className="section profile-final-cta">
        <div className="container profile-final-card">
          <div>
            <span className="eyebrow">COMPLETE DATA VIEW</span>
            <h2>Explore the full provincial profile.</h2>
            <p>{religiousAffiliation.source} is used for the detailed religious affiliation table; other sections retain their own source labels.</p>
          </div>
          <Link className="btn btn-dark" to="/profile">Open Provincial Profile <ArrowRight size={16} /></Link>
        </div>
      </section>
    </>
  )
}
