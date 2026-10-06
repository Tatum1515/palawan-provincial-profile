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
  Building2,
  BookMarked,
  CircleDollarSign,
  Landmark,
  MapPinned,
  ShieldCheck,
} from 'lucide-react'
import { Suspense } from 'react'
import { Link } from 'react-router-dom'
import GovernorFeature from '../components/GovernorFeature.jsx'
import DataMeta from '../components/DataMeta.jsx'
import { LazySparkline } from '../components/lazy.js'
import { provincialProfile } from '../data/provincialProfile.js'
import { formatDelta, formatNumber, formatPercent, toNumber } from '../utils/numbers.js'
import { buildSparklineData, getLatestPair } from '../utils/homeData.js'
import '../styles/profile-home.css'

const pick = (items, key, value) => items.find((item) => item[key] === value)


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

function HomeKpiCard({ label, current, currentFormatter, delta, previousYear, series, source, accent = false }) {
  const currentValue = current?.value ?? current
  const displayCurrent = currentValue === null || currentValue === undefined || currentValue === '' ? '—' : (currentFormatter ? currentFormatter(currentValue) : currentValue)
  const sparklineData = buildSparklineData(series)

  return (
    <article className={`home-kpi-card${accent ? ' home-kpi-card-featured' : ''}`}>
      <div className="home-kpi-card-top">
        <span className="home-kpi-label">{label}</span>
        <span className="home-kpi-year">{current?.year ?? '—'}</span>
      </div>
      <div className="home-kpi-value">{displayCurrent}</div>
      <div className="home-kpi-delta">
        <strong>{delta}</strong>
        <span>{previousYear ? `vs ${previousYear}` : 'change'}</span>
      </div>
      <div className="home-kpi-sparkline">
        <Suspense fallback={<div className="home-kpi-sparkline-fallback" aria-label={`${label} trend loading`} />}>
          <LazySparkline
            data={sparklineData}
            dataKey="numericValue"
            label={`${label} trend`}
            title=""
            description=""
            formatter={(value) => formatNumber(value)}
            height={54}
          />
        </Suspense>
      </div>
      <span className="home-kpi-source">Source: {source}</span>
    </article>
  )
}


const getGeoIcon = (label) => {
  const value = label.toLowerCase()
  if (value.includes('municip')) return MapPinned
  if (value.includes('barangay')) return Building2
  if (value.includes('island')) return Map
  if (value.includes('protected')) return ShieldCheck
  if (value.includes('forest')) return Trees
  if (value.includes('land area')) return LandPlot
  if (value.includes('alienable') || value.includes('disposable')) return LandPlot
  if (value.includes('population')) return Users
  if (value.includes('region')) return Landmark
  if (value.includes('distance')) return MapPinned
  return CircleDollarSign
}



export default function Home() {
  const { geographicAdministrative, population, employment, higherEducation, tvet, religiousAffiliation } = provincialProfile
  const populationPair = getLatestPair(population.totalPopulation)
  const employmentPair = getLatestPair(employment.employmentRate)
  const householdsPair = getLatestPair(population.households)
  const higherEducationEnrollmentPair = getLatestPair(higherEducation.enrollment)
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

  const populationDelta = formatDelta(populationPair.current?.value, populationPair.previous?.value)
  const employmentDelta = formatDelta(employmentPair.current?.value, employmentPair.previous?.value, { suffix: ' pp' })
  const householdsDelta = formatDelta(householdsPair.current?.value, householdsPair.previous?.value)
  const higherEducationEnrollmentDelta = formatDelta(higherEducationEnrollmentPair.current?.value, higherEducationEnrollmentPair.previous?.value)

  const populationInsight = populationPair.current && populationPair.previous
    ? `Population reached ${populationPair.current.value} in ${populationPair.current.year}, ${populationDelta} from ${populationPair.previous.year}.`
    : 'Population trend is unavailable for the reported years.'
  const employmentInsight = employmentPair.current && employmentPair.previous
    ? `Employment rate was ${formatPercent(employmentPair.current.value)} in ${employmentPair.current.year}, ${employmentDelta} from ${employmentPair.previous.year}.`
    : 'Employment-rate change is unavailable for the reported years.'
  const householdsInsight = householdsPair.current && householdsPair.previous
    ? `Households reached ${householdsPair.current.value} in ${householdsPair.current.year}, ${householdsDelta} from ${householdsPair.previous.year}.`
    : 'Household change is unavailable for the reported years.'
  const educationInsight = higherEducationEnrollmentPair.current && higherEducationEnrollmentPair.previous
    ? `Higher-education enrollment reached ${higherEducationEnrollmentPair.current.value} in ${higherEducationEnrollmentPair.current.year}, ${higherEducationEnrollmentDelta} from ${higherEducationEnrollmentPair.previous.year}.`
    : 'Higher-education enrollment change is unavailable for the reported years.'
  const municipalityCount = pick(geographicAdministrative, 'label', 'Municipalities')?.value
  const barangayCount = pick(geographicAdministrative, 'label', 'Barangays')?.value
  const islandCount = pick(geographicAdministrative, 'label', 'Islands')?.value

  const geographic = geographicAdministrative.slice(0, 9)
  const dataSections = [
    { label: 'Geographic & administrative', count: geographicAdministrative.length, source: 'Provincial profile', Icon: LandPlot },
    { label: 'Population & households', count: Object.values(population).filter(Array.isArray).length, source: population.source, Icon: Users },
    { label: 'Employment', count: Object.values(employment).filter(Array.isArray).length, source: employment.source, Icon: BriefcaseBusiness },
    { label: 'Religious affiliation', count: religiousAffiliation.municipalities.length, source: religiousAffiliation.source, Icon: Database },
    { label: 'Higher education', count: higherEducation.institutions.length + higherEducation.enrollment.length, source: 'Provincial profile', Icon: GraduationCap },
    { label: 'TVET', count: Object.values(tvet.performance).filter(Array.isArray).length, source: 'Provincial profile', Icon: BookOpen },
  ]

  return (
    <>
      <section className="home-video-hero" aria-labelledby="home-video-title">
        <div className="home-video-media" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/profile-palawan-hero.webp"
          >
            <source src="/images/video/palawan-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="home-video-overlay" aria-hidden="true" />
        <div className="home-video-grid" aria-hidden="true" />
        <div className="container home-video-inner">
          <div className="home-video-copy">
            <span className="eyebrow-light">PROVINCIAL GOVERNMENT OF PALAWAN</span>
            <h1 id="home-video-title">Palawan, <em>in data.</em></h1>
            <p>
              A source-driven view of Palawan’s people, places, institutions, and opportunities—presented from the supplied provincial profile.
            </p>
            <div className="profile-hero-actions">
              <Link className="btn btn-light" to="/profile">View complete profile <ArrowRight size={16} /></Link>
              <Link className="btn btn-outline" to="/data">Explore all data <Database size={16} /></Link>
              <Link className="btn btn-outline" to="/locations">View municipalities <Map size={16} /></Link>
            </div>
          </div>

          <div className="home-video-meta" aria-label="Homepage video information">
            <div className="home-video-meta-top">
              <span>PALAWAN</span>
              <span className="home-video-live-dot" aria-hidden="true" />
              <span>PROVINCIAL PROFILE</span>
            </div>
            <div className="home-video-meta-divider" aria-hidden="true" />
            <p>Visual introduction for the provincial data portal.</p>
          </div>

          <a className="home-video-scroll" href="#data-dashboard">
            <span>Scroll to explore</span>
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div className="home-section-index" aria-label="Homepage sections">
        <a href="#data-dashboard">Data</a>
        <a href="#overview">Profile</a>
        <a href="#snapshot">Figures</a>
        <a href="#geographic">Geography</a>
      </div>

      <section className="home-data-status" aria-label="Current data status">
        <div className="container">
          <div className="home-data-status-inner">
            <div className="home-data-status-badge">
              <span className="home-data-status-dot" aria-hidden="true" />
              WORKING PROFILE
            </div>
            <div className="home-data-status-copy">
              <strong>Figures are subject to final validation.</strong>
              <span>Reference years and source labels are retained from the supplied provincial profile. Missing values are not estimated.</span>
            </div>
            <Link className="home-data-status-link" to="/data">Review data sources <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="profile-stat-section" aria-label="Provincial trend indicators">
        <div className="container">
          <div className="home-kpi-grid">
            <HomeKpiCard
              label="Population"
              current={populationPair.current}
              delta={populationDelta}
              previousYear={populationPair.previous?.year}
              series={population.totalPopulation}
              source={population.source}
              accent
            />
            <HomeKpiCard
              label="Employment rate"
              current={employmentPair.current}
              currentFormatter={formatPercent}
              delta={employmentDelta}
              previousYear={employmentPair.previous?.year}
              series={employment.employmentRate}
              source={employment.source}
            />
            <HomeKpiCard
              label="Households"
              current={householdsPair.current}
              delta={householdsDelta}
              previousYear={householdsPair.previous?.year}
              series={population.households}
              source={population.source}
            />
            <HomeKpiCard
              label="Higher-education enrollment"
              current={higherEducationEnrollmentPair.current}
              delta={higherEducationEnrollmentDelta}
              previousYear={higherEducationEnrollmentPair.previous?.year}
              series={higherEducation.enrollment}
              source={higherEducation.source || 'Source not specified in supplied profile'}
            />
          </div>
        </div>
      </section>

      <section className="section section-data-coverage" id="data-coverage">
        <div className="container">
          <div className="profile-section-heading">
            <div>
              <span className="eyebrow">DATA COVERAGE</span>
              <h2>Know what the profile contains before you explore it.</h2>
            </div>
            <p>
              The portal presents the supplied figures by topic, reference period, and source. Missing values remain marked as unavailable instead of being estimated.
            </p>
          </div>
          <div className="data-coverage-grid">
            {dataSections.map((section) => (
              <article className="data-coverage-card" key={section.label}>
                <span className="data-coverage-icon"><section.Icon size={18} aria-hidden="true" /></span>
                <div className="data-coverage-number">{section.count}</div>
                <div>
                  <h3>{section.label}</h3>
                  <p>{section.source}</p>
                </div>
              </article>
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
                  <h3>{populationInsight}</h3>
                  <p>2015, 2020 and 2024 total population.</p>
                  <DataMeta year="2015–2024" source={population.source} />
                </div>
                <span className="dashboard-card-icon"><Users size={19} aria-hidden="true" /></span>
              </div>
              <MiniBarSeries values={populationSeries} />
              <Link className="dashboard-card-link" to="/profile#population">Open population data <ArrowRight size={14} /></Link>
            </article>

            <article className="data-dashboard-card data-dashboard-workforce">
              <div className="data-dashboard-card-head">
                <div>
                  <span className="dashboard-card-kicker">EMPLOYMENT</span>
                  <h3>{employmentInsight}</h3>
                  <p>Employment and unemployment are shown separately.</p>
                  <DataMeta year="2024" source={employment.source} />
                </div>
                <span className="dashboard-card-icon"><BriefcaseBusiness size={19} aria-hidden="true" /></span>
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
                  <h3>{educationInsight}</h3>
                  <p>Selected higher-education and TVET reference values.</p>
                  <DataMeta year="2020–2025" source="Provincial profile" />
                </div>
                <span className="dashboard-card-icon"><GraduationCap size={19} aria-hidden="true" /></span>
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
              <div className="data-story-icon"><Users size={18} aria-hidden="true" /></div><div className="data-story-number">01</div>
              <div className="data-story-content">
                <span>PEOPLE</span>
                <h3>{populationInsight}</h3>
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
              <div className="data-story-icon"><GraduationCap size={18} aria-hidden="true" /></div><div className="data-story-number">02</div>
              <div className="data-story-content">
                <span>LEARNING & TRAINING</span>
                <h3>{educationInsight}</h3>
                <div className="story-stat-pair">
                  <div><strong>{higherEdEnrollment2025}</strong><span>Higher education enrollment · 2025</span></div>
                  <div><strong>{tvetEnrollment2024}</strong><span>TVET enrollment · 2024</span></div>
                </div>
                <span className="story-link">Explore education data <ArrowRight size={14} /></span>
              </div>
            </Link>

            <Link to="/profile#geographic" className="data-story-card data-story-place">
              <div className="data-story-icon"><LandPlot size={18} aria-hidden="true" /></div><div className="data-story-number">03</div>
              <div className="data-story-content">
                <span>PLACE & ADMINISTRATION</span>
                <h3>{householdsInsight}</h3>
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
              <span className="snapshot-card-icon"><Users size={17} aria-hidden="true" /></span>
              <span>2024 TOTAL POPULATION</span>
              <strong>{population2024}</strong>
              <small>Source: {population.source}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><BriefcaseBusiness size={17} aria-hidden="true" /></span>
              <span>2024 EMPLOYMENT RATE</span>
              <strong>{employment2024}</strong>
              <small>Source: {employment.source}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><Users size={17} aria-hidden="true" /></span>
              <span>2024 LABOR FORCE</span>
              <strong>{laborForce2024}</strong>
              <small>Source: {employment.source}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><BookOpen size={17} aria-hidden="true" /></span>
              <span>2024 LITERACY RATE</span>
              <strong>{literacy2024}</strong>
              <small>Source: {population.source}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><GraduationCap size={17} aria-hidden="true" /></span>
              <span>2025 HIGHER EDUCATION ENROLLMENT</span>
              <strong>{higherEdEnrollment2025}</strong>
              <small>{higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><GraduationCap size={17} aria-hidden="true" /></span>
              <span>2025 HIGHER EDUCATION GRADUATES</span>
              <strong>{higherEdGraduates2025}</strong>
              <small>{higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><Building2 size={17} aria-hidden="true" /></span>
              <span>TESDA-REGISTERED TVET PROVIDERS</span>
              <strong>{tvet.institutions.tesdaRegisteredProviders}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
            <article className="snapshot-card">
              <span className="snapshot-card-icon"><BookMarked size={17} aria-hidden="true" /></span>
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
            {geographic.map((item) => {
              const GeoIcon = getGeoIcon(item.label)
              return <article className="geo-card" key={item.label}>
                <span className="geo-card-icon"><GeoIcon size={17} aria-hidden="true" /></span>
                <span>{item.label}</span>
                <strong>{item.value ?? '—'}</strong>
                {item.source && <small>Source: {item.source}</small>}
              </article>
            })}
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
