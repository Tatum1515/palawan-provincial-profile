import React, { Suspense } from 'react'
import {
  ArrowRight,
  Compass,
  Database,
  GraduationCap,
  School,
  BriefcaseBusiness,
  Wrench,
  BadgeCheck,
  MapPinned,
  Ruler,
  ShieldCheck,
  Users,
  Waves,
  LandPlot,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusState from '../components/StatusState.jsx'
import '../styles/economy.css'
import { provincialProfile } from '../data/provincialProfile.js'
import { toNumber, formatNumber } from '../utils/numbers.js'
import { LazyDonutChart, LazyFunnelChart, LazyGroupedBar, LazySparkline, LazyTrendChart } from '../components/lazy.js'
import ChartTable from '../components/ChartTable.jsx'


function getProfileIcon(label = '') {
  const value = label.toLowerCase()
  if (value.includes('population') || value.includes('household') || value.includes('labor')) return Users
  if (value.includes('employment') || value.includes('unemployment') || value.includes('underemployment')) return BriefcaseBusiness
  if (value.includes('education') || value.includes('enrollment') || value.includes('graduate')) return GraduationCap
  if (value.includes('tvet') || value.includes('program') || value.includes('training')) return Wrench
  if (value.includes('relig')) return Database
  if (value.includes('coastal') || value.includes('water') || value.includes('marine')) return Waves
  if (value.includes('forest') || value.includes('land') || value.includes('area')) return LandPlot
  if (value.includes('distance') || value.includes('location') || value.includes('region')) return MapPinned
  return Compass
}

function FactCard({ value, label }) {
  const Icon = getProfileIcon(label)
  return (
    <article className="economy-fact-card">
      <span className="economy-card-icon economy-fact-icon"><Icon size={17} aria-hidden="true" /></span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  )
}

function DataRow({ label, value, unit, source }) {
  return (
    <div className="economy-data-row">
      <div>
        <span className="economy-data-label">{label}</span>
        {source && <small>Source: {source}</small>}
      </div>
      <strong>{value ?? '—'}{value != null && unit ? ` ${unit}` : ''}</strong>
    </div>
  )
}

function SeriesCard({ label, values, unit }) {
  const Icon = getProfileIcon(label)
  return (
    <article className="population-series-card">
      <div className="population-series-heading">
        <span className="economy-heading-with-icon"><Icon size={15} aria-hidden="true" />{label}</span>
        {unit && <small>{unit}</small>}
      </div>
      <div className="population-series-values">
        {values.map((item) => (
          <div key={`${item.year}-${item.value ?? 'missing'}`} className="population-series-item">
            <small>{item.year}</small>
            <strong>{item.value ?? '—'}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

function PeriodSeriesCard({ label, values }) {
  const Icon = getProfileIcon(label)
  return (
    <article className="population-series-card">
      <div className="population-series-heading">
        <span className="economy-heading-with-icon"><Icon size={15} aria-hidden="true" />{label}</span>
      </div>
      <div className="population-series-values">
        {values.map((item) => (
          <div key={item.period} className="population-series-item">
            <small>{item.period}</small>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}


function EmploymentSeriesCard({ label, values, unit }) {
  const Icon = getProfileIcon(label)
  return (
    <article className="employment-series-card">
      <div className="employment-series-heading">
        <span className="economy-heading-with-icon"><Icon size={15} aria-hidden="true" />{label}</span>
        {unit && <small>{unit}</small>}
      </div>
      <div className="employment-series-values">
        {values.map((item) => (
          <div key={`${item.year}-${item.value ?? 'missing'}`} className="employment-series-item">
            <small>{item.year}</small>
            <strong>{item.value ?? '—'}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}



function MetricKpiCard({ label, value, unit, note, sparkline, formatter }) {
  const Icon = getProfileIcon(label)
  return (
    <article className="employment-kpi-card">
      <div className="employment-kpi-head">
        <span className="economy-heading-with-icon"><Icon size={15} aria-hidden="true" />{label}</span>
        {unit && <small>{unit}</small>}
      </div>
      <strong>{value ?? '—'}</strong>
      {sparkline && (
        <div className="employment-kpi-sparkline">
          <LazySparkline
            data={sparkline}
            title={`${label} reference-year sparkline`}
            description={`Reference-year values for ${label}.`}
            formatter={formatter}
            label={label}
            height={44}
          />
        </div>
      )}
      {note && <p className="employment-kpi-note">{note}</p>}
    </article>
  )
}

function InstitutionList({ title, items, label }) {
  return (
    <article className="higher-ed-institution-card">
      <div className="economy-card-heading">
        <div>
          <span className="economy-card-kicker">{label}</span>
          <h3>{title}</h3>
        </div>
        <School size={20} />
      </div>
      <div className="higher-ed-institution-list">
        {items.map((item) => (
          <div className="higher-ed-institution-row" key={`${title}-${item.name}-${item.location}`}>
            <div>
              <strong>{item.name}</strong>
              <small>{item.type || 'State University'} · {item.location}</small>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function HigherEdSeries({ label, values }) {
  return (
    <article className="higher-ed-series-card">
      <div className="higher-ed-series-heading">
        <span>{label}</span>
      </div>
      <div className="higher-ed-series-values">
        {values.map((item) => (
          <div key={`${label}-${item.year}`}>
            <small>{item.year}</small>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}


function TVETPerformanceCard({ label, values }) {
  const current = values.find((item) => item.year === '2024')?.value
  return (
    <article className="tvet-performance-card">
      <div className="tvet-performance-heading">
        <span className="economy-heading-with-icon"><BadgeCheck size={16} aria-hidden="true" />{label}</span>
        <BadgeCheck size={18} aria-hidden="true" />
      </div>
      <strong>{current}</strong>
      <small>2024</small>
      <div className="tvet-performance-history">
        {values.map((item) => (
          <span key={`${label}-${item.year}`}>
            <em>{item.year}</em>
            <b>{item.value}</b>
          </span>
        ))}
      </div>
    </article>
  )
}


function DataVisualCard({ kicker, title, note, children, className = '' }) {
  return (
    <article className={`data-visual-card ${className}`.trim()}>
      <div className="data-visual-head">
        <div>
          {kicker && <span className="economy-card-kicker">{kicker}</span>}
          <h3>{title}</h3>
        </div>
      </div>
      <div className="data-visual-body">{children}</div>
      {note && <p className="data-visual-note">{note}</p>}
    </article>
  )
}

function PopulationLineChart({ values }) {
  const points = values
    .map((item) => ({ year: item.year, value: toNumber(item.value) }))
    .filter((item) => item.value !== null)

  const max = Math.max(...points.map((item) => item.value), 1)
  const min = Math.min(...points.map((item) => item.value), 0)
  const range = max - min || 1
  const chartWidth = 640
  const chartHeight = 220
  const left = 48
  const right = 18
  const top = 18
  const bottom = 36
  const plotWidth = chartWidth - left - right
  const plotHeight = chartHeight - top - bottom
  const pointAt = (index) => ({
    x: left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth),
    y: top + ((max - points[index].value) / range) * plotHeight,
  })
  const polyline = points.map((_, index) => {
    const point = pointAt(index)
    return `${point.x},${point.y}`
  }).join(' ')

  return (
    <div className="visual-chart visual-line-chart">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Total population trend from 2015 to 2024">
        {[0, 0.5, 1].map((ratio) => {
          const y = top + ratio * plotHeight
          const label = Math.round(max - ratio * range).toLocaleString()
          return (
            <g key={ratio}>
              <line x1={left} x2={chartWidth - right} y1={y} y2={y} className="visual-grid-line" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="visual-axis-label">{label}</text>
            </g>
          )
        })}
        <polyline points={polyline} fill="none" className="visual-line" />
        {points.map((item, index) => {
          const point = pointAt(index)
          return (
            <g key={item.year}>
              <circle cx={point.x} cy={point.y} r="5" className="visual-point" />
              <text x={point.x} y={chartHeight - 12} textAnchor="middle" className="visual-axis-label">{item.year}</text>
              <text x={point.x} y={point.y - 11} textAnchor="middle" className="visual-value-label">{item.value.toLocaleString()}</text>
            </g>
          )
        })}
      </svg>
      <details className="visual-table-fallback">
        <summary>View data table</summary>
        <ChartTable
          data={values}
          columns={[{ key: 'year', label: 'Year' }, { key: 'value', label: 'Population' }]}
          ariaLabel="Population trend data table"
        />
      </details>
    </div>
  )
}

function MultiSeriesRateChart({ series }) {
  const allPoints = series.flatMap((group) => group.values.map((item) => toNumber(item.value)).filter((value) => value !== null))
  const max = Math.max(...allPoints, 100)
  const chartWidth = 640
  const chartHeight = 250
  const left = 48
  const right = 18
  const top = 24
  const bottom = 42
  const plotWidth = chartWidth - left - right
  const plotHeight = chartHeight - top - bottom
  const years = series[0]?.values.map((item) => item.year) ?? []
  const pointAt = (index, value) => ({
    x: left + (years.length <= 1 ? 0 : (index / (years.length - 1)) * plotWidth),
    y: top + ((max - value) / max) * plotHeight,
  })

  return (
    <div className="visual-chart">
      <div className="visual-legend">
        {series.map((group) => <span key={group.label}><i className={`legend-dot legend-dot-${group.key}`} />{group.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Employment indicators across 2014, 2022 and 2024">
        {[0, 0.5, 1].map((ratio) => {
          const y = top + ratio * plotHeight
          return (
            <g key={ratio}>
              <line x1={left} x2={chartWidth - right} y1={y} y2={y} className="visual-grid-line" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="visual-axis-label">{Math.round(max - ratio * max)}%</text>
            </g>
          )
        })}
        {series.map((group) => {
          const valid = group.values.map((item, index) => ({ ...item, index, numeric: toNumber(item.value) })).filter((item) => item.numeric !== null)
          const points = valid.map((item) => {
            const point = pointAt(item.index, item.numeric)
            return `${point.x},${point.y}`
          }).join(' ')
          return (
            <g key={group.label}>
              {valid.length > 1 && <polyline points={points} fill="none" className={`visual-line visual-line-${group.key}`} />}
              {valid.map((item) => {
                const point = pointAt(item.index, item.numeric)
                return <circle key={`${group.label}-${item.year}`} cx={point.x} cy={point.y} r="4.5" className={`visual-point visual-point-${group.key}`} />
              })}
            </g>
          )
        })}
        {years.map((year, index) => {
          const point = pointAt(index, 0)
          return <text key={year} x={point.x} y={chartHeight - 14} textAnchor="middle" className="visual-axis-label">{year}</text>
        })}
      </svg>
      <details className="visual-table-fallback">
        <summary>View data table</summary>
        <ChartTable
          data={years.map((year) => Object.fromEntries([['year', year], ...series.map((group) => [group.key, group.values.find((item) => item.year === year)?.value ?? null])]))}
          columns={[{ key: 'year', label: 'Year' }, ...series.map((group) => ({ key: group.key, label: group.label }))]}
          ariaLabel="Employment indicators data table"
        />
      </details>
    </div>
  )
}

function MultiSeriesCountChart({ series, ariaLabel = 'Provincial count series' }) {
  const allPoints = series.flatMap((group) => group.values.map((item) => toNumber(item.value)).filter((value) => value !== null))
  const max = Math.max(...allPoints, 1)
  const chartWidth = 640
  const chartHeight = 250
  const left = 62
  const right = 18
  const top = 24
  const bottom = 42
  const plotWidth = chartWidth - left - right
  const plotHeight = chartHeight - top - bottom
  const years = Array.from(new Set(series.flatMap((group) => group.values.map((item) => item.year))))
  const pointAt = (index, value) => ({
    x: left + (years.length <= 1 ? 0 : (index / (years.length - 1)) * plotWidth),
    y: top + ((max - value) / max) * plotHeight,
  })

  return (
    <div className="visual-chart">
      <div className="visual-legend">
        {series.map((group) => <span key={group.label}><i className={`legend-dot legend-dot-${group.key}`} />{group.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={ariaLabel}>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + ratio * plotHeight
          const label = Math.round(max - ratio * max).toLocaleString()
          return (
            <g key={ratio}>
              <line x1={left} x2={chartWidth - right} y1={y} y2={y} className="visual-grid-line" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="visual-axis-label">{label}</text>
            </g>
          )
        })}
        {series.map((group) => {
          const valid = group.values.map((item) => ({ ...item, index: years.indexOf(item.year), numeric: toNumber(item.value) })).filter((item) => item.numeric !== null && item.index >= 0)
          const points = valid.map((item) => {
            const point = pointAt(item.index, item.numeric)
            return `${point.x},${point.y}`
          }).join(' ')
          return (
            <g key={group.label}>
              {valid.length > 1 && <polyline points={points} fill="none" className={`visual-line visual-line-${group.key}`} />}
              {valid.map((item) => {
                const point = pointAt(item.index, item.numeric)
                return (
                  <g key={`${group.label}-${item.year}`}>
                    <circle cx={point.x} cy={point.y} r="4.5" className={`visual-point visual-point-${group.key}`} />
                    <title>{`${group.label} · ${item.year}: ${item.numeric.toLocaleString()}`}</title>
                  </g>
                )
              })}
            </g>
          )
        })}
        {years.map((year, index) => {
          const point = pointAt(index, 0)
          return <text key={year} x={point.x} y={chartHeight - 14} textAnchor="middle" className="visual-axis-label">{year}</text>
        })}
      </svg>
      <details className="visual-table-fallback">
        <summary>View data table</summary>
        <ChartTable
          data={years.map((year) => Object.fromEntries([['year', year], ...series.map((group) => [group.key, group.values.find((item) => item.year === year)?.value ?? null])]))}
          columns={[{ key: 'year', label: 'Year' }, ...series.map((group) => ({ key: group.key, label: group.label }))]}
          ariaLabel="Provincial count series data table"
        />
      </details>
    </div>
  )
}

function GroupedBarChart({ groups, formatter = (value) => value.toLocaleString() }) {
  const numericGroups = groups.map((group) => ({
    ...group,
    value: toNumber(group.value),
  }))
  const max = Math.max(...numericGroups.map((item) => item.value ?? 0), 1)

  return (
    <div className="visual-bar-chart" role="img" aria-label="Provincial grouped comparison">
      {numericGroups.map((group) => {
        const width = group.value === null ? 0 : Math.max(4, (group.value / max) * 100)
        return (
          <div className="visual-bar-row" key={group.label} tabIndex="0" title={group.value === null ? `${group.label}: No available data` : `${group.label}: ${formatter(group.value)}`}>
            <div className="visual-bar-label">{group.label}</div>
            <div className="visual-bar-track">
              <span className="visual-bar-fill" style={{ width: `${width}%` }} />
            </div>
            <strong>{group.value === null ? '—' : formatter(group.value)}</strong>
          </div>
        )
      })}
      <details className="visual-table-fallback">
        <summary>View data table</summary>
        <ChartTable
          data={numericGroups}
          columns={[{ key: 'label', label: 'Category' }, { key: 'value', label: 'Value', formatter }]}
          ariaLabel="Provincial grouped comparison data table"
        />
      </details>
    </div>
  )
}

function TVETProviderDirectory({ providers }) {
  const [query, setQuery] = React.useState('')

  const filtered = providers.filter((item) => {
    const haystack = [item.name, item.location, ...item.programs].join(' ').toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="tvet-directory">
      <div className="tvet-directory-toolbar">
        <div>
          <span className="economy-card-kicker">LISTED PROVIDERS</span>
          <h3>TESDA-Registered TVET Providers</h3>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search provider, location or program..."
          aria-label="Search TESDA-registered TVET providers"
        />
      </div>

      <div className="tvet-provider-grid">
        {filtered.map((provider) => (
          <article className="tvet-provider-card" key={provider.name}>
            <div className="tvet-provider-top">
              <span className="tvet-provider-number">{provider.name.slice(0, 1)}</span>
              <Wrench size={17} />
            </div>
            <h4>{provider.name}</h4>
            <p>{provider.location}</p>
            <div className="tvet-program-list">
              {provider.programs.map((program) => (
                <span key={program}>{program}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <StatusState compact title="No provider found" description="No listed provider matches your search." />
      )}
    </div>
  )
}


function ReligiousAffiliationTable({ data }) {
  const [query, setQuery] = React.useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = data.municipalities.filter((item) =>
    item.municipality.toLowerCase().includes(normalizedQuery),
  )

  const columns = [
    ['romanCatholic', 'Roman Catholic'],
    ['islam', 'Islam'],
    ['iglesiaNiCristo', 'Iglesia ni Cristo'],
    ['protestant', 'Protestant'],
    ['seventhDayAdventist', 'Seventh-day Adventist'],
    ['otherReligion', 'Other Religion'],
    ['noReligion', 'No Religion'],
  ]

  return (
    <div className="religion-profile">
      <div className="religion-profile-toolbar">
        <div>
          <span className="economy-card-kicker">2024 COMMUNITY-BASED MONITORING SYSTEM</span>
          <h3>Religious affiliation by municipality/city</h3>
          <p>Use the locality search to explore the detailed affiliation counts reported in the provincial profile.</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search municipality or city..."
          aria-label="Search religious affiliation by municipality or city"
        />
      </div>

      <div className="religion-province-total">
        <div>
          <span>PALAWAN</span>
          <strong>{data.provinceTotal.totalPopulation}</strong>
          <small>Total Population in the religious affiliation table</small>
        </div>
        <div className="religion-total-pills">
          {columns.map(([key, label]) => (
            <span key={key}>
              <em>{label}</em>
              <b>{data.provinceTotal[key]}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="religion-table-wrap">
        <table className="religion-table">
          <thead>
            <tr>
              <th>Municipality/City</th>
              <th>Total Population</th>
              {columns.map(([, label]) => <th key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.municipality}>
                <th scope="row">{item.municipality}</th>
                <td>{item.totalPopulation}</td>
                {columns.map(([key]) => <td key={`${item.municipality}-${key}`}>{item[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <StatusState compact title="No municipality found" description="No municipality or city matches your search." />
      )}

      <p className="religion-source-note">
        Source: {data.source}. Displayed as supplied in the provincial profile.
      </p>
    </div>
  )
}


export default function Economy() {
  const geography = provincialProfile.geographicAdministrative
  const headlineFacts = provincialProfile.headlineFacts
  const population = provincialProfile.population
  const employment = provincialProfile.employment
  const higherEducation = provincialProfile.higherEducation
  const tvet = provincialProfile.tvet
  const religiousAffiliation = provincialProfile.religiousAffiliation

  const naturalAssets = geography.filter(({ label }) => (
    [
      'Forest Land Area',
      'Closed forest',
      'Open Forest',
      'Mangrove Forest',
      'Marine Protected Area under NIPAS',
      'Terrestrial Protected Area including inland wetland and caves under NIPAS',
    ].includes(label)
  ))

  const administration = geography.filter(({ label }) => (
    [
      'Number of Islands',
      'Number of Municipalities',
      'Number of Component Cities',
      'Number of Barangays',
      'Congressional Districts',
      'Palawan Surface Water Resources',
      'Number of Community-Based Forest Management Agreements',
    ].includes(label)
  ))

  const geographyRows = geography.filter(({ label }) => (
    [
      'Region',
      'Distance from Manila',
      'Total Land Area',
      'Alienable and Disposable Land',
      'Coastal Length',
    ].includes(label)
  ))

  return (
    <div className="economy-page">
      <section className="economy-hero">
        <div className="container economy-hero-grid">
          <div className="economy-hero-copy">
            <span className="eyebrow">BRIEF PROVINCIAL PROFILE</span>
            <h1>Palawan provincial data, section by section.</h1>
            <p>
              This page presents the supplied geographic, population, employment, religious affiliation, higher education, and TVET information with its reference years and source labels.
            </p>

            <div className="economy-hero-actions">
              <a className="btn btn-light" href="#geographic">
                Explore the profile <ArrowRight size={16} />
              </a>
              <Link className="btn btn-outline" to="/locations">
                View municipalities <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <aside className="economy-hero-note">
            <div className="economy-hero-note-top">
              <span>DATA PRINCIPLE</span>
              <ShieldCheck size={18} />
            </div>
            <strong>One source of truth for the portal.</strong>
            <p>
              Values shown here come directly from the supplied Brief Provincial Profile.
              No missing figures are estimated.
            </p>
            <div className="economy-hero-foot">
              <span>PROFILE STATUS</span>
              <b>{provincialProfile.statusNote}</b>
            </div>
          </aside>
        </div>
      </section>

      <section className="profile-section-index" aria-label="Provincial profile sections">
        <div className="container">
          <div className="profile-section-index-inner">
            <div className="profile-section-index-label">
              <span>EXPLORE THE PROFILE</span>
              <strong>Jump to a data section</strong>
            </div>
            <nav className="profile-section-index-links" aria-label="Jump to data section">
              <a href="#key-indicators">At a glance</a>
              <a href="#geographic">Geography</a>
              <a href="#population">Population</a>
              <a href="#religious-affiliation">Religion</a>
              <a href="#higher-education">Education</a>
              <a href="#tvet">TVET</a>
              <a href="#employment">Employment</a>
              <a href="#natural-assets">Natural assets</a>
            </nav>
          </div>
        </div>
      </section>

      <section className="economy-summary" id="key-indicators">
        <div className="container">
          <div className="economy-section-intro">
            <span className="eyebrow eyebrow-dark">PALAWAN AT A GLANCE</span>
            <h2>Start with the province’s geographic and administrative footprint.</h2>
            <p>
              These headline facts are taken exactly from the supplied provincial profile.
            </p>
          </div>

          <div className="economy-fact-grid">
            {headlineFacts.map((fact) => (
              <FactCard key={fact.label} {...fact} />
            ))}
          </div>
        </div>

      </section>

      <section className="section profile-data-story-section" aria-labelledby="profile-data-story-title">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">PROFILE SNAPSHOT</span>
            <h2 id="profile-data-story-title">The profile, translated into a few clear visual signals.</h2>
            <p>
              This visual summary highlights selected figures already documented in the provincial profile. It is a presentation layer only; the detailed sections below remain the reference view.
            </p>
          </div>

          <div className="profile-data-story">
            <article className="profile-data-story-card">
              <span className="profile-data-story-kicker">POPULATION SERIES</span>
              <h3>Population remains the anchor for reading the province.</h3>
              <p>The profile records total population across multiple reference years, allowing the long-form population section to be read as a series rather than a single figure.</p>
              <PopulationLineChart values={population.totalPopulation} />
            </article>

            <article className="profile-data-story-card is-accent">
              <span className="profile-data-story-kicker">2024 REFERENCE</span>
              <h3>Total population</h3>
              <div className="profile-data-story-stat">
                <strong>{population.totalPopulation.find((item) => item.year === '2024')?.value ?? '—'}</strong>
                <span>2024<br />Source: {population.source}</span>
              </div>
            </article>
          </div>

          <div className="profile-data-story-card" style={{ marginTop: '18px' }}>
            <span className="profile-data-story-kicker">ADMINISTRATIVE FOOTPRINT</span>
            <h3>Selected geographic and administrative figures</h3>
            <div className="profile-meter-list">
              {administration
                .filter((item) => ['Number of Municipalities', 'Number of Component Cities', 'Number of Barangays', 'Number of Islands'].includes(item.label))
                .map((item) => (
                  <div className="profile-meter-row" key={item.label}>
                    <span>{item.label}</span>
                    <div className="profile-meter-track"><i className="profile-meter-fill" style={{ width: `${Math.min(100, Math.max(10, (toNumber(item.value) || 0) / Math.max(...administration.map((entry) => toNumber(entry.value) || 0)) * 100))}%` }} /></div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section economy-visual-dashboard" id="visual-dashboard">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">DATA VISUALS</span>
            <h2>Read the profile at a glance.</h2>
            <p>Selected indicators are visualized without changing the values, reference periods, or source notes in the supplied profile.</p>
            <div className="profile-data-note"><strong>Data rule:</strong> values are shown as supplied; unavailable values are displayed as —.</div>
          </div>

          <div className="visual-dashboard-grid">
            <DataVisualCard kicker="POPULATION" title="Population reference trend" note={`Source: ${population.source}`}>
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyTrendChart
                  data={population.totalPopulation}
                  series={[{ key: 'value', label: 'Population' }]}
                  title="Total population"
                  description="Population values recorded for the supplied reference years."
                  formatter={(value) => formatNumber(value)}
                  ariaLabel="Total population reference trend"
                />
              </Suspense>
            </DataVisualCard>

            <DataVisualCard kicker="SOCIAL INDICATORS" title="Poverty and subsistence, 2018–2023" note={`Source: ${population.source}`}>
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyTrendChart
                  data={population.povertyIncidenceFamilies.map((item, index) => ({
                    year: item.year,
                    povertyFamilies: toNumber(item.value),
                    povertyPopulation: toNumber(population.povertyIncidencePopulation[index]?.value),
                    subsistenceFamilies: toNumber(population.subsistenceIncidenceFamilies[index]?.value),
                    subsistencePopulation: toNumber(population.subsistenceIncidencePopulation[index]?.value),
                  }))}
                  series={[
                    { key: 'povertyFamilies', label: 'Poverty · families' },
                    { key: 'povertyPopulation', label: 'Poverty · population' },
                    { key: 'subsistenceFamilies', label: 'Subsistence · families' },
                    { key: 'subsistencePopulation', label: 'Subsistence · population' },
                  ]}
                  title="Poverty and subsistence incidence"
                  description="Incidence values across the supplied 2018, 2021, and 2023 reference years."
                  formatter={(value) => `${value}%`}
                  ariaLabel="Poverty and subsistence incidence trend"
                />
              </Suspense>
            </DataVisualCard>
          </div>
        </div>
      </section>

      <section className="section economy-profile-section" id="geographic">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">GEOGRAPHIC & ADMINISTRATIVE DATA</span>
            <h2>A detailed provincial reference.</h2>
            <p>
              The values below preserve the labels and figures from the supplied Brief Provincial Profile.
            </p>
          </div>

          <div className="economy-profile-grid">
            <article className="economy-profile-card economy-profile-card-large">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">GEOGRAPHY</span>
                  <h3>Location & physical profile</h3>
                </div>
                <Compass size={20} />
              </div>

              {geographyRows.map((item) => (
                <DataRow key={item.label} {...item} />
              ))}
            </article>

            <article className="economy-profile-card">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">ADMINISTRATION</span>
                  <h3>Provincial structure</h3>
                </div>
                <MapPinned size={20} />
              </div>

              {administration.map((item) => (
                <DataRow key={item.label} {...item} />
              ))}
            </article>
          </div>
        </div>
      </section>

      <section className="section economy-population-section" id="population">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">POPULATION</span>
            <h2>Population and household profile.</h2>
            <p>
              Exact values from the supplied provincial profile, presented by reference year and period.
            </p>
          </div>

          <div className="population-highlight">
            <div className="population-highlight-copy">
              <span className="economy-card-kicker">TOTAL POPULATION</span>
              <strong>{population.totalPopulation.find((item) => item.year === '2024')?.value}</strong>
              <span>2024</span>
              <small>Source: {population.source}</small>
            </div>

            <div className="population-highlight-grid">
              <SeriesCard label="Total Population" values={population.totalPopulation} />
              <SeriesCard label="Male Population" values={population.malePopulation} />
              <SeriesCard label="Female Population" values={population.femalePopulation} />
            </div>
          </div>

          <div className="population-series-grid">
            <PeriodSeriesCard label="Population Growth Rate" values={population.growthRate} />
            <SeriesCard label="Population Density" values={population.density} unit="persons/km²" />
            <SeriesCard label="Number of Households" values={population.households} />
            <SeriesCard label="Average Household Size" values={population.averageHouseholdSize} />
          </div>


          <div className="visual-two-column">
            <DataVisualCard kicker="SEX DISTRIBUTION" title="Male and female population" note={`Source: ${population.source}. 2024 sex-specific values are unavailable.`}>
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyGroupedBar
                  data={population.totalPopulation.map((item, index) => ({
                    year: item.year,
                    male: toNumber(population.malePopulation[index]?.value),
                    female: toNumber(population.femalePopulation[index]?.value),
                  }))}
                  categoryKey="year"
                  series={[
                    { key: 'male', label: 'Male' },
                    { key: 'female', label: 'Female' },
                  ]}
                  title="Male and female population"
                  description="Sex-specific population values from the supplied reference years."
                  ariaLabel="Male and female population columns"
                  formatter={(value) => formatNumber(value)}
                />
              </Suspense>
            </DataVisualCard>
            <DataVisualCard kicker="HOUSEHOLDS" title="Households and average household size" note={`Source: ${population.source}`}>
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyGroupedBar
                  data={population.households.map((item, index) => ({
                    year: item.year,
                    households: toNumber(item.value),
                    averageSize: toNumber(population.averageHouseholdSize[index]?.value),
                  }))}
                  categoryKey="year"
                  series={[
                    { key: 'households', label: 'Households' },
                    { key: 'averageSize', label: 'Average household size' },
                  ]}
                  title="Households and average household size"
                  description="Household counts and average household size are displayed together by reference year; scales remain separate in the data table."
                  ariaLabel="Households and average household size columns"
                  formatter={(value) => formatNumber(value)}
                />
              </Suspense>
            </DataVisualCard>
            <DataVisualCard kicker="DENSITY" title="Population density" note={`Unit: persons/km² · Source: ${population.source}`}>
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyTrendChart
                  data={population.density}
                  series={[{ key: 'value', label: 'Density' }]}
                  title="Population density"
                  description="Population density values from the supplied reference years."
                  formatter={(value) => `${value} persons/km²`}
                  ariaLabel="Population density trend"
                />
              </Suspense>
            </DataVisualCard>
          </div>
        </div>
      </section>

      <section className="section section-soft economy-social-section">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">SOCIAL INDICATORS</span>
            <h2>Household welfare and literacy.</h2>
            <p>
              These figures are kept with their original reference periods from the supplied source.
            </p>
          </div>

          <div className="population-social-grid">
            <article className="economy-profile-card">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">POVERTY INCIDENCE</span>
                  <h3>Among families</h3>
                </div>
                <Users size={20} />
              </div>
              {population.povertyIncidenceFamilies.map((item) => (
                <DataRow key={item.year} label={item.year} value={item.value} />
              ))}
            </article>

            <article className="economy-profile-card">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">POVERTY INCIDENCE</span>
                  <h3>Among population</h3>
                </div>
                <Users size={20} />
              </div>
              {population.povertyIncidencePopulation.map((item) => (
                <DataRow key={item.year} label={item.year} value={item.value} />
              ))}
            </article>

            <article className="economy-profile-card">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">SUBSISTENCE INCIDENCE</span>
                  <h3>Among families</h3>
                </div>
                <Users size={20} />
              </div>
              {population.subsistenceIncidenceFamilies.map((item) => (
                <DataRow key={item.year} label={item.year} value={item.value} />
              ))}
            </article>

            <article className="economy-profile-card">
              <div className="economy-card-heading">
                <div>
                  <span className="economy-card-kicker">SUBSISTENCE INCIDENCE</span>
                  <h3>Among population</h3>
                </div>
                <Users size={20} />
              </div>
              {population.subsistenceIncidencePopulation.map((item) => (
                <DataRow key={item.year} label={item.year} value={item.value} />
              ))}
            </article>
          </div>

          <article className="literacy-card">
            <div>
              <span className="economy-card-kicker">LITERACY RATE</span>
              <strong>{population.literacyRate.value}</strong>
              <span>{population.literacyRate.year}</span>
            </div>
            <div className="literacy-note">
              Source: {population.source}
            </div>
          </article>
        </div>
      </section>


      <section className="section economy-religion-section" id="religious-affiliation">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">DETAILED RELIGIOUS AFFILIATION TABLE</span>
            <h2>A locality-level community profile.</h2>
            <p>
              This table preserves the municipality/city rows, category labels and counts reported in the supplied profile.
            </p>
          </div>

          <DataVisualCard
            kicker="PROVINCE TOTAL"
            title="Reported religious affiliation counts"
            note={`Source: ${religiousAffiliation.source}`}
          >
            <GroupedBarChart
              groups={[
                { label: 'Roman Catholic', value: religiousAffiliation.provinceTotal.romanCatholic },
                { label: 'Islam', value: religiousAffiliation.provinceTotal.islam },
                { label: 'Iglesia ni Cristo', value: religiousAffiliation.provinceTotal.iglesiaNiCristo },
                { label: 'Protestant', value: religiousAffiliation.provinceTotal.protestant },
                { label: 'Seventh-day Adventist', value: religiousAffiliation.provinceTotal.seventhDayAdventist },
                { label: 'Other Religion', value: religiousAffiliation.provinceTotal.otherReligion },
                { label: 'No Religion', value: religiousAffiliation.provinceTotal.noReligion },
              ]}
            />
          </DataVisualCard>

          <ReligiousAffiliationTable data={religiousAffiliation} />
        </div>
      </section>

      <section className="section economy-higher-ed-section" id="higher-education">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">HIGHER EDUCATION / TALENT POOL</span>
            <h2>Higher education and the province’s education network.</h2>
            <p>
              Exact institution, enrollment and graduate information from the supplied provincial profile.
              Program-specific graduate counts remain unavailable where the source leaves them blank.
            </p>
          </div>

          <div className="higher-ed-highlight">
            <div className="higher-ed-highlight-copy">
              <span className="economy-card-kicker">2025 TOTAL HIGHER EDUCATION ENROLLMENT</span>
              <strong>{higherEducation.enrollment.find((item) => item.year === '2025')?.value}</strong>
              <span>{higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}</span>
            </div>
            <div className="higher-ed-highlight-side">
              <div>
                <GraduationCap size={20} />
                <small>2025 Total Higher Education Graduates</small>
                <strong>{higherEducation.graduates.find((item) => item.year === '2025')?.value}</strong>
              </div>
              <div>
                <School size={20} />
                <small>Palawan State University Colleges</small>
                <strong>19</strong>
              </div>
              <div>
                <School size={20} />
                <small>Western Philippines University/Colleges</small>
                <strong>7</strong>
              </div>
            </div>
          </div>

          <div className="higher-ed-series-grid">
            <HigherEdSeries label="Total Higher Education Enrollment" values={higherEducation.enrollment} />
            <HigherEdSeries label="Total Higher Education Graduates" values={higherEducation.graduates} />
          </div>


          <div className="visual-two-column">
            <DataVisualCard kicker="ENROLLMENT" title="Higher education enrollment" note={higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}>
              <GroupedBarChart groups={higherEducation.enrollment.map((item) => ({ label: item.year, value: item.value }))} />
            </DataVisualCard>
            <DataVisualCard kicker="GRADUATES" title="Higher education graduates" note={higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}>
              <GroupedBarChart groups={higherEducation.graduates.map((item) => ({ label: item.year, value: item.value }))} />
            </DataVisualCard>
          </div>

          <div className="visual-two-column profile-trend-pair">
            <DataVisualCard kicker="EDUCATION" title="Enrollment across reference years" note={higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}>
              <MultiSeriesCountChart
                ariaLabel="Higher education enrollment across the supplied reference years"
                series={[{ label: 'Enrollment', key: 'enrollment', values: higherEducation.enrollment }]}
              />
            </DataVisualCard>
            <DataVisualCard kicker="EDUCATION" title="Graduates across reference years" note={higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile'}>
              <MultiSeriesCountChart
                ariaLabel="Higher education graduates across the supplied reference years"
                series={[{ label: 'Graduates', key: 'graduates', values: higherEducation.graduates }]}
              />
            </DataVisualCard>
          </div>

          <div className="higher-ed-institution-grid">
            <InstitutionList
              title="Listed Universities and Colleges"
              label="PRIVATE / OTHER LISTED INSTITUTIONS"
              items={higherEducation.institutions}
            />
            <InstitutionList
              title={higherEducation.psuGroupLabel}
              label="STATE UNIVERSITY"
              items={higherEducation.palawanStateUniversityCampuses}
            />
            <InstitutionList
              title={higherEducation.wpuGroupLabel}
              label="STATE UNIVERSITY"
              items={higherEducation.westernPhilippinesUniversityCampuses}
            />
          </div>

          <article className="higher-ed-missing-data">
            <div>
              <span className="economy-card-kicker">NUMBER OF GRADUATES IN</span>
              <h3>Program-level graduate breakdown</h3>
            </div>
            <div className="higher-ed-missing-list">
              {higherEducation.graduateFields.map((field) => (
                <span key={field.name}>
                  {field.name}
                  <strong>{field.value ?? 'No available data'}</strong>
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section economy-tvet-section" id="tvet">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">TECHNICAL-VOCATIONAL EDUCATION AND TRAINING</span>
            <h2>A practical talent pool for technical and service industries.</h2>
            <p>
              The profile reports TESDA-registered providers, registered programs, assessment centers,
              performance indicators, provider locations, registered qualifications, and major TVET sectors.
            </p>
          </div>

          <div className="tvet-stat-grid">
            <article className="tvet-stat-card tvet-stat-card-featured">
              <span className="economy-card-kicker">TESDA-REGISTERED TVET PROVIDERS</span>
              <strong>{tvet.institutions.tesdaRegisteredProviders}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
            <article className="tvet-stat-card">
              <span className="economy-card-kicker">REGISTERED TVET PROGRAMS</span>
              <strong>{tvet.institutions.registeredPrograms}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
            <article className="tvet-stat-card">
              <span className="economy-card-kicker">ACCREDITED ASSESSMENT CENTERS</span>
              <strong>{tvet.institutions.accreditedAssessmentCenters}</strong>
              <small>Source: {tvet.institutions.source}</small>
            </article>
          </div>

          <div className="tvet-performance-grid">
            <TVETPerformanceCard label="TVET Enrollment / Enrollees" values={tvet.performance.enrollment} />
            <TVETPerformanceCard label="TVET Graduates" values={tvet.performance.graduates} />
            <TVETPerformanceCard label="TVET Certification Passers" values={tvet.performance.certificationPassers} />
          </div>

          <div className="tvet-visual-grid">
            <DataVisualCard kicker="2024 TVET PIPELINE" title="From enrollment to certification" note={`Source: ${tvet.source}. Only the supplied 2024 values are included in the funnel.`}>
              <LazyFunnelChart
                data={[
                  { name: 'Enrollment / Enrollees', value: toNumber(tvet.performance.enrollment.find((item) => item.year === '2024')?.value) },
                  { name: 'Graduates', value: toNumber(tvet.performance.graduates.find((item) => item.year === '2024')?.value) },
                  { name: 'Certification Passers', value: toNumber(tvet.performance.certificationPassers.find((item) => item.year === '2024')?.value) },
                ]}
                title="2024 TVET enrollment-to-certification funnel"
                description="Reported 2024 TESDA performance counts."
                formatter={(value) => formatNumber(value)}
                height={320}
              />
            </DataVisualCard>

            <DataVisualCard kicker="HIGHER EDUCATION" title="Graduates by field" note={higherEducation.source ? `Source: ${higherEducation.source}` : 'Source not specified in supplied profile. Unavailable field values remain —.'}>
              <LazyGroupedBar
                groups={higherEducation.graduateFields.map((field) => ({ label: field.name, value: field.value }))}
                formatter={(value) => formatNumber(value)}
              />
            </DataVisualCard>
          </div>

          <DataVisualCard kicker="2024 TVET PERFORMANCE" title="Reported 2024 TVET counts" note={`Source: ${tvet.source}. Earlier periods are displayed as supplied (-) where reported.`}>
            <GroupedBarChart
              groups={[
                { label: 'Enrollment / Enrollees', value: tvet.performance.enrollment.find((item) => item.year === '2024')?.value },
                { label: 'Graduates', value: tvet.performance.graduates.find((item) => item.year === '2024')?.value },
                { label: 'Certification Passers', value: tvet.performance.certificationPassers.find((item) => item.year === '2024')?.value },
              ]}
            />
          </DataVisualCard>

          <div className="tvet-provider-directory-wrap">
            <TVETProviderDirectory providers={tvet.listedProviders} />
            <p className="tvet-directory-note">
              The profile reports 41 TESDA-Registered TVET Providers; the directory below contains the providers explicitly listed in the supplied profile.
            </p>
          </div>

          <div className="tvet-sector-grid">
            {tvet.majorSectorPrograms.map((group) => (
              <article className="tvet-sector-card" key={group.sector}>
                <div className="tvet-sector-heading">
                  <BriefcaseBusiness size={18} />
                  <h3>{group.sector}</h3>
                </div>
                <div className="tvet-sector-programs">
                  {group.programs.map((program) => (
                    <span key={program}>{program}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="tvet-source-note">
            <span>Source</span>
            <strong>{tvet.source}</strong>
          </div>
        </div>
      </section>

      <section className="section economy-employment-section" id="employment">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">EMPLOYMENT</span>
            <h2>Labor market and workforce profile.</h2>
            <p>
              Exact employment indicators from the supplied provincial profile, presented by reference year.
            </p>
          </div>

          <div className="employment-highlight">
            <div className="employment-highlight-copy">
              <span className="economy-card-kicker">2024 LABOR FORCE</span>
              <strong>{employment.laborForce.find((item) => item.year === '2024')?.value}</strong>
              <span>Source: {employment.source}</span>
            </div>

            <div className="employment-highlight-stats">
              <div>
                <small>Labor Force Participation Rate</small>
                <strong>{employment.laborForceParticipationRate.find((item) => item.year === '2024')?.value}</strong>
              </div>
              <div>
                <small>Employment Rate</small>
                <strong>{employment.employmentRate.find((item) => item.year === '2024')?.value}</strong>
              </div>
              <div>
                <small>Unemployment Rate</small>
                <strong>{employment.unemploymentRate.find((item) => item.year === '2024')?.value}</strong>
              </div>
            </div>
          </div>

          <div className="employment-kpi-grid">
            <MetricKpiCard
              label="Employment Rate"
              value={employment.employmentRate.find((item) => item.year === '2024')?.value ? `${employment.employmentRate.find((item) => item.year === '2024').value}%` : '—'}
              unit="2024"
              sparkline={employment.employmentRate.map((item) => ({ year: item.year, value: toNumber(item.value) }))}
              formatter={(value) => `${value}%`}
            />
            <MetricKpiCard
              label="Unemployment Rate"
              value={employment.unemploymentRate.find((item) => item.year === '2024')?.value ? `${employment.unemploymentRate.find((item) => item.year === '2024').value}%` : '—'}
              unit="2024"
              sparkline={employment.unemploymentRate.map((item) => ({ year: item.year, value: toNumber(item.value) }))}
              formatter={(value) => `${value}%`}
            />
            <MetricKpiCard
              label="Underemployment Rate"
              value={employment.underemploymentRate.find((item) => item.year === '2024')?.value ? `${employment.underemploymentRate.find((item) => item.year === '2024').value}%` : '—'}
              unit="2024"
              sparkline={employment.underemploymentRate.map((item) => ({ year: item.year, value: toNumber(item.value) }))}
              formatter={(value) => `${value}%`}
            />
            <MetricKpiCard
              label="Labor Force"
              value={employment.laborForce.find((item) => item.year === '2024')?.value}
              unit="2024"
              note={employment.laborForce.note}
            />
            <MetricKpiCard
              label="Labor Force Participation Rate"
              value={employment.laborForceParticipationRate.find((item) => item.year === '2024')?.value ? `${employment.laborForceParticipationRate.find((item) => item.year === '2024').value}%` : '—'}
              unit="2024"
              note={employment.laborForceParticipationRate.note}
            />
          </div>

          <div className="employment-source-note">
            <span>Source</span>
            <strong>{employment.source}</strong>
          </div>
        </div>
      </section>

      <section className="section section-soft economy-assets-section" id="natural-assets">
        <div className="container">
          <div className="economy-section-intro economy-section-intro-wide">
            <span className="eyebrow eyebrow-dark">NATURAL & PROTECTED AREAS</span>
            <h2>Show the province’s natural asset base clearly.</h2>
            <p>
              This section presents the forest and protected-area figures exactly as provided.
            </p>
          </div>

          <div className="visual-two-column natural-assets-visuals">
            <DataVisualCard kicker="FOREST LAND" title="Forest land composition" note="Units: hectares. Source notes are retained from the supplied profile.">
              <Suspense fallback={<div className="chart-empty">Loading chart…</div>}>
                <LazyDonutChart
                  data={naturalAssets.filter((item) => ['Closed forest', 'Open Forest', 'Mangrove Forest'].includes(item.label)).map((item) => ({ name: item.label, value: toNumber(item.value) }))}
                  title="Forest land composition"
                  ariaLabel="Forest land composition: closed forest, open forest, and mangrove forest"
                />
              </Suspense>
            </DataVisualCard>
          </div>

          <div className="economy-assets-grid">
            {naturalAssets.map((item) => (
              <article className="economy-asset-card" key={item.label}>
                <div className="economy-asset-icon">
                  {item.label.includes('Protected Area') ? <ShieldCheck size={19} /> : <Waves size={19} />}
                </div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.source && <small>Source: {item.source}</small>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section economy-reference-section">
        <div className="container">
          <div className="economy-reference-card">
            <div className="economy-reference-icon">
              <Ruler size={21} />
            </div>
            <div>
              <span className="eyebrow eyebrow-dark">SOURCE & DATA NOTE</span>
              <h2>Keep the original reference intact as the dataset grows.</h2>
              <p>
                The website uses the supplied profile as its current reference record. Missing or blank fields remain unfilled, and separate source values are retained as reported.
              </p>
              <div className="economy-source-chips">
                {provincialProfile.sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>
              <div className="economy-unlabeled-source">
                <span>Unlabeled value in supplied source</span>
                <strong>{provincialProfile.sourceRecord.unlabeledValue}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
