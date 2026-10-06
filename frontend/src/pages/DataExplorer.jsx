import { useMemo, useState } from 'react'
import { Database, Search, X, ArrowRight, Download, Printer, SlidersHorizontal, Eye, FileText, BarChart3, CalendarDays, Layers3, CheckCircle2, AlertCircle, Map, MapPin, Users, BriefcaseBusiness, GraduationCap, Wrench } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { provincialProfile } from '../data/provincialProfile.js'
import { toNumber } from '../utils/numbers.js'
import { LazyIndicatorChart } from '../components/lazy.js'
import StatusState from '../components/StatusState.jsx'
import '../styles/data-explorer.css'

const sections = [
  { key: 'geographic', label: 'Geographic & administrative', source: 'Provincial profile', items: provincialProfile.geographicAdministrative.map((item) => ({ label: item.label, value: item.value, year: 'Reference not specified', source: item.source || 'Provincial profile' })) },
  { key: 'population', label: 'Population & households', source: provincialProfile.population.source, items: [
    ['Total population', provincialProfile.population.totalPopulation],
    ['Population density', provincialProfile.population.density],
    ['Households', provincialProfile.population.households],
    ['Average household size', provincialProfile.population.averageHouseholdSize],
    ['Poverty incidence — families', provincialProfile.population.povertyIncidenceFamilies],
    ['Poverty incidence — population', provincialProfile.population.povertyIncidencePopulation],
    ['Subsistence incidence — families', provincialProfile.population.subsistenceIncidenceFamilies],
    ['Subsistence incidence — population', provincialProfile.population.subsistenceIncidencePopulation],
    ['Literacy rate', [provincialProfile.population.literacyRate]],
  ].flatMap(([label, values]) => values.map((item) => ({ label, value: item.value, year: item.year, source: provincialProfile.population.source }))) },
  { key: 'employment', label: 'Employment', source: provincialProfile.employment.source, items: [
    ['Labor force participation rate', provincialProfile.employment.laborForceParticipationRate],
    ['Employment rate', provincialProfile.employment.employmentRate],
    ['Unemployment rate', provincialProfile.employment.unemploymentRate],
    ['Underemployment rate', provincialProfile.employment.underemploymentRate],
    ['Labor force', provincialProfile.employment.laborForce],
  ].flatMap(([label, values]) => values.map((item) => ({ label, value: item.value, year: item.year, source: provincialProfile.employment.source }))) },
  { key: 'higher-education', label: 'Higher education', source: provincialProfile.higherEducation.source || 'Source not specified in supplied profile', items: [
    ...provincialProfile.higherEducation.enrollment.map((item) => ({ label: 'Higher education enrollment', value: item.value, year: item.year })),
    ...provincialProfile.higherEducation.graduates.map((item) => ({ label: 'Higher education graduates', value: item.value, year: item.year })),
  ].map((item) => ({ ...item, source: provincialProfile.higherEducation.source || 'Source not specified in supplied profile' })) },
  { key: 'tvet', label: 'TVET', source: provincialProfile.tvet.performance.source, items: [
    ['TVET enrollment', provincialProfile.tvet.performance.enrollment],
    ['TVET graduates', provincialProfile.tvet.performance.graduates],
    ['TVET certification passers', provincialProfile.tvet.performance.certificationPassers],
  ].flatMap(([label, values]) => values.map((item) => ({ label, value: item.value, year: item.year, source: provincialProfile.tvet.performance.source }))) },
]

function normalize(value) {
  return String(value ?? '').toLowerCase().trim()
}

export default function DataExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [section, setSection] = useState(() => searchParams.get('section') || 'all')
  const [year, setYear] = useState('all')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [municipality, setMunicipality] = useState(() => searchParams.get('municipality') || 'all')
  const selectedIndicator = searchParams.get('indicator') || ''

  const municipalityOptions = provincialProfile.religiousAffiliation.municipalities

  const municipalityRows = useMemo(() => {
    if (municipality === 'all') return []
    const selected = municipalityOptions.find((item) => item.municipality === municipality)
    if (!selected) return []
    const labels = [
      ['Total population', selected.totalPopulation],
      ['Roman Catholic', selected.romanCatholic],
      ['Islam', selected.islam],
      ['Iglesia ni Cristo', selected.iglesiaNiCristo],
      ['Protestant', selected.protestant],
      ['Seventh-day Adventist', selected.seventhDayAdventist],
      ['Other religion', selected.otherReligion],
      ['No religion', selected.noReligion],
    ]
    return labels.map(([label, value]) => ({
      label,
      value,
      year: '2020',
      source: provincialProfile.religiousAffiliation.source,
      numericValue: toNumber(value),
      sectionKey: 'municipality',
      sectionLabel: 'Municipality profile',
      municipality: selected.municipality,
      dataStatus: value === null || value === undefined || value === '' || value === '-' ? 'not-reported' : 'reported',
    }))
  }, [municipality, municipalityOptions])

  const allRows = useMemo(() => {
    const provincialRows = sections.flatMap((group) => group.items.map((item) => ({
      ...item,
      numericValue: toNumber(item.value),
      sectionKey: group.key,
      sectionLabel: group.label,
      dataStatus: item.value === null || item.value === undefined || item.value === '' || item.value === '-' ? 'not-reported' : 'reported',
    })))
    return municipality === 'all' ? provincialRows : [...provincialRows, ...municipalityRows]
  }, [municipality, municipalityRows])

  const rows = useMemo(() => {
    const q = normalize(query)
    return allRows
      .filter((item) => section === 'all' || item.sectionKey === section)
      .filter((item) => year === 'all' || (item.year || '—') === year)
      .filter((item) => source === 'all' || (item.source || '—') === source)
      .filter((item) => status === 'all' || item.dataStatus === status)
      .filter((item) => !q || [item.label, item.value, item.year, item.source, item.sectionLabel, item.municipality].some((field) => normalize(field).includes(q)))
  }, [query, section, year, source, status, allRows])

  const yearOptions = useMemo(() => [...new Set(allRows.map((row) => row.year || '—'))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })), [allRows])
  const sourceOptions = useMemo(() => [...new Set(allRows.map((row) => row.source || '—'))].sort((a, b) => String(a).localeCompare(String(b))), [allRows])
  const reportedCount = rows.filter((row) => row.dataStatus === 'reported').length
  const notReportedCount = rows.length - reportedCount
  const indicatorCount = new Set(rows.map((row) => row.label)).size
  const hasActiveFilters = Boolean(query || section !== 'all' || year !== 'all' || source !== 'all' || status !== 'all' || municipality !== 'all')

  const topicCoverage = useMemo(() => sections.map((group) => {
    const groupRows = allRows.filter((row) => row.sectionKey === group.key)
    const reported = groupRows.filter((row) => row.dataStatus === 'reported').length
    const indicators = new Set(groupRows.map((row) => row.label)).size
    const coverage = groupRows.length ? Math.round((reported / groupRows.length) * 100) : 0
    return { ...group, records: groupRows.length, reported, indicators, coverage }
  }), [allRows])

  const topicIcon = {
    geographic: Map,
    population: Users,
    employment: BriefcaseBusiness,
    'higher-education': GraduationCap,
    tvet: Wrench,
  }

  const selectTopic = (key) => {
    setSection(key)
    window.requestAnimationFrame(() => {
      document.querySelector('.data-explorer-table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const clearFilters = () => {
    setQuery('')
    setSection('all')
    setYear('all')
    setSource('all')
    setStatus('all')
    setMunicipality('all')
    setSearchParams({})
  }
  const selectedRows = allRows.filter((row) => row.label === selectedIndicator)

  const selectIndicator = (label) => {
    const next = {}
    if (municipality !== 'all') {
      next.municipality = municipality
      next.section = section
    }
    if (label) next.indicator = label
    setSearchParams(next)
  }

  const exportCsv = () => {
    const headers = ['Section', 'Indicator', 'Value', 'Reference year', 'Source']
    const escapeCsv = (value) => {
      const text = String(value ?? '')
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text

    }
    const csv = [headers, ...rows.map((row) => [row.sectionLabel, row.label, row.value ?? '', row.year || '', row.source || ''])]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'palawan-provincial-profile-data.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportSelectedCsv = () => {
    if (!selectedRows.length) return

    const headers = ['Section', 'Indicator', 'Value', 'Reference year', 'Source']
    const escapeCsv = (value) => {
      const text = String(value ?? '')
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
    }
    const csv = [headers, ...selectedRows.map((row) => [row.sectionLabel, row.label, row.value ?? '', row.year || '', row.source || ''])]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedIndicator.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'indicator'}-data.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="data-explorer-page">
      <section className="data-explorer-hero">
        <div className="container">
          <span className="eyebrow-light">DATA EXPLORER</span>
          <h1>Find a provincial indicator.</h1>
          <p>Search the supplied profile data by indicator, value, reference year, source, or section. No values are estimated or generated here.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="data-explorer-tools">
            <label className="data-explorer-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search provincial data</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indicator, year, source, or value..." />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear data search"><X size={17} /></button>}
            </label>
            <label className="data-explorer-filter">
              <span><SlidersHorizontal size={14} aria-hidden="true" /> Section</span>
              <select value={section} onChange={(event) => setSection(event.target.value)}>
                <option value="all">All sections</option>
                {sections.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}
                {municipality !== 'all' && <option value="municipality">Municipality profile</option>}
              </select>
            </label>
            <label className="data-explorer-filter">
              <span><MapPin size={14} aria-hidden="true" /> Municipality</span>
              <select value={municipality} onChange={(event) => { setMunicipality(event.target.value); setSection(event.target.value === 'all' ? 'all' : 'municipality'); setSearchParams(event.target.value === 'all' ? {} : { municipality: event.target.value, section: 'municipality' }) }}>
                <option value="all">All municipalities</option>
                {municipalityOptions.map((item) => <option value={item.municipality} key={item.municipality}>{item.municipality.replace(', Palawan', '')}</option>)}
              </select>
            </label>
            <label className="data-explorer-filter">
              <span><CalendarDays size={14} aria-hidden="true" /> Year</span>
              <select value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">All years</option>
                {yearOptions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
            <label className="data-explorer-filter">
              <span><FileText size={14} aria-hidden="true" /> Source</span>
              <select value={source} onChange={(event) => setSource(event.target.value)}>
                <option value="all">All sources</option>
                {sourceOptions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
            <label className="data-explorer-filter">
              <span><Layers3 size={14} aria-hidden="true" /> Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All records</option>
                <option value="reported">Value reported</option>
                <option value="not-reported">No value supplied</option>
              </select>
            </label>
            {hasActiveFilters && (
              <button type="button" className="data-explorer-clear" onClick={clearFilters}>
                <X size={15} aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>

          {municipality !== 'all' && (
            <section className="data-municipality-context" aria-label="Selected municipality data context">
              <div className="data-municipality-context-icon"><MapPin size={18} aria-hidden="true" /></div>
              <div className="data-municipality-context-copy">
                <span className="eyebrow">MUNICIPALITY CONTEXT</span>
                <strong>{municipality.replace(', Palawan', '')}</strong>
                <p>Showing the municipality profile values currently supplied in the CBMS religious affiliation table alongside the provincial indicators.</p>
              </div>
              <Link to={`/locations?municipality=${encodeURIComponent(municipality)}`} className="data-municipality-context-link">Open municipality profile <ArrowRight size={15} aria-hidden="true" /></Link>
            </section>
          )}

          <section className="data-topic-overview" aria-labelledby="data-topic-overview-title">
            <div className="data-topic-overview-heading">
              <div>
                <span className="eyebrow">DATA COVERAGE</span>
                <h2 id="data-topic-overview-title">Explore the profile by topic.</h2>
                <p>Coverage reflects only the values currently supplied in the working provincial profile.</p>
              </div>
              <span className="data-topic-overview-caption">Click a topic to filter the table</span>
            </div>
            <div className="data-topic-grid">
              {topicCoverage.map((topic) => {
                const Icon = topicIcon[topic.key] || Database
                return (
                  <button type="button" className={`data-topic-card ${section === topic.key ? 'is-active' : ''}`} key={topic.key} onClick={() => selectTopic(topic.key)} aria-pressed={section === topic.key}>
                    <div className="data-topic-card-top">
                      <span className="data-topic-icon"><Icon size={17} aria-hidden="true" /></span>
                      <span className="data-topic-card-arrow"><ArrowRight size={15} aria-hidden="true" /></span>
                    </div>
                    <strong>{topic.label}</strong>
                    <div className="data-topic-metrics"><span>{topic.indicators} indicators</span><span>{topic.reported}/{topic.records} values</span></div>
                    <div className="data-topic-bar" aria-label={`${topic.coverage}% reported`}>
                      <span style={{ width: `${topic.coverage}%` }} />
                    </div>
                    <div className="data-topic-footer"><span>{topic.coverage}% supplied</span><span>{topic.records} records</span></div>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="data-explorer-insights" aria-label="Data coverage summary">
            <div className="data-explorer-insight">
              <div className="data-explorer-insight-icon"><Database size={16} aria-hidden="true" /></div>
              <div><strong>{rows.length}</strong><span>matching records</span></div>
            </div>
            <div className="data-explorer-insight">
              <div className="data-explorer-insight-icon"><BarChart3 size={16} aria-hidden="true" /></div>
              <div><strong>{indicatorCount}</strong><span>indicators</span></div>
            </div>
            <div className="data-explorer-insight">
              <div className="data-explorer-insight-icon is-reported"><CheckCircle2 size={16} aria-hidden="true" /></div>
              <div><strong>{reportedCount}</strong><span>values reported</span></div>
            </div>
            <div className="data-explorer-insight">
              <div className="data-explorer-insight-icon is-pending"><AlertCircle size={16} aria-hidden="true" /></div>
              <div><strong>{notReportedCount}</strong><span>without supplied values</span></div>
            </div>
          </div>

          {selectedIndicator && selectedRows.length > 0 && (
            <section className="data-indicator-detail" aria-labelledby="data-indicator-title">
              <div className="data-indicator-heading">
                <div>
                  <span className="eyebrow">INDICATOR DETAIL</span>
                  <h2 id="data-indicator-title">{selectedIndicator}</h2>
                  <p>{selectedRows[0].sectionLabel} · {selectedRows[0].source || 'Source not specified'}</p>
                </div>
                <button type="button" className="data-detail-close" onClick={() => selectIndicator('')}><X size={16} aria-hidden="true" /> Close detail</button>
              </div>
              <div className="data-indicator-meta">
                <span><BarChart3 size={16} aria-hidden="true" /><strong>{selectedRows.length}</strong> supplied observations</span>
                <span><FileText size={16} aria-hidden="true" /> Source: {selectedRows[0].source || 'Not specified in supplied profile'}</span>
              </div>
              <LazyIndicatorChart indicator={selectedIndicator} rows={selectedRows} onExportCsv={exportSelectedCsv} />
            </section>
          )}

          <div className="data-explorer-summary" aria-live="polite">
            <div><Database size={18} /><strong>{rows.length}</strong><span>matching data records</span></div>
            <div className="data-explorer-actions">
              <button type="button" onClick={exportCsv} disabled={!rows.length} title="Download the current filtered data as CSV"><Download size={16} aria-hidden="true" /> Export CSV</button>
              <button type="button" onClick={() => window.print()} title="Print the current data view"><Printer size={16} aria-hidden="true" /> Print</button>
              <Link to="/profile">Open full provincial profile <ArrowRight size={15} /></Link>
            </div>
          </div>

          <div className="data-explorer-table-wrap">
            <table className="data-explorer-table">
              <caption className="sr-only">Searchable provincial profile data</caption>
              <thead>
                <tr><th scope="col">Section</th><th scope="col">Indicator</th><th scope="col">Value</th><th scope="col">Reference year</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Detail</th></tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.sectionKey}-${row.label}-${row.year}-${index}`}>
                    <td><span className="data-explorer-section">{row.sectionLabel}</span></td>
                    <th scope="row">{row.label}</th>
                    <td className="data-explorer-value">{row.value ?? '—'}</td>
                    <td>{row.year || '—'}</td>
                    <td>{row.source || '—'}</td><td><span className={`data-explorer-status data-explorer-status-${row.dataStatus}`}><span className="data-explorer-status-dot" aria-hidden="true" />{row.dataStatus === 'reported' ? 'Reported as supplied' : 'No value supplied'}</span></td><td><button type="button" className="data-detail-link" onClick={() => selectIndicator(row.label)}><Eye size={15} aria-hidden="true" /> View detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <StatusState compact title="No matching data" description="No supplied data records match your current search or filter." />}
          </div>

          <p className="data-explorer-note">Values are displayed as supplied in the current provincial profile. Where a source or reference year is not specified in the source data, the portal does not infer one.</p>
        </div>
      </section>
    </main>
  )
}
