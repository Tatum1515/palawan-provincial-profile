import { ArrowRight, BarChart3, Building2, Database, FileText, GitCompare, MapPin, Printer, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { provincialProfile } from '../data/provincialProfile.js'
import { toNumber } from '../utils/numbers.js'
import { getMunicipalityLogo } from '../data/municipalityLogos.js'
import { buildReligionDonutData, buildReligionStackedData, cleanMunicipalityName, RELIGION_COLUMNS as religionColumns } from '../utils/locationChartData.js'
import StatusState from '../components/StatusState.jsx'
import DataMeta from '../components/DataMeta.jsx'
import '../styles/locations.css'

const PalawanMap = lazy(() => import('../components/PalawanMap.jsx'))
const DonutChart = lazy(() => import('../components/charts/DonutChart.jsx'))
const MunicipalityPopulationChart = lazy(() => import('../components/MunicipalityPopulationChart.jsx'))
const ReligionStackedChart = lazy(() => import('../components/ReligionStackedChart.jsx'))

export default function Locations() {
  const municipalities = provincialProfile.religiousAffiliation.municipalities
  const geography = provincialProfile.geographicAdministrative
  const [query, setQuery] = useState('')
  const [selectedName, setSelectedName] = useState(null)
  const [compareNames, setCompareNames] = useState([])
  const [religionSort, setReligionSort] = useState('romanCatholic')
  const [populationSort, setPopulationSort] = useState('desc')

  const filteredMunicipalities = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return municipalities
    return municipalities.filter((item) => item.municipality.toLowerCase().includes(normalized))
  }, [municipalities, query])

  const selected = municipalities.find((item) => item.municipality === selectedName) || null
  const maxPopulation = Math.max(...municipalities.map((item) => Number(String(item.totalPopulation ?? 0).replace(/,/g, '')) || 0), 1)
  const selectedReligionData = selected ? buildReligionDonutData(selected) : []
  const religionStackedData = buildReligionStackedData(municipalities)
  const sortedPopulation = useMemo(() => {
    const rows = [...filteredMunicipalities]
    rows.sort((a, b) => {
      const left = toNumber(a.totalPopulation) ?? -1
      const right = toNumber(b.totalPopulation) ?? -1
      return populationSort === 'asc' ? left - right : right - left
    })
    return rows
  }, [filteredMunicipalities, populationSort])
  const getValue = (label) => geography.find((item) => item.label === label)?.value ?? '—'
  const compareItems = compareNames.map((name) => municipalities.find((item) => item.municipality === name)).filter(Boolean)
  const toggleCompare = (name) => {
    setCompareNames((current) => current.includes(name) ? current.filter((item) => item !== name) : current.length < 2 ? [...current, name] : [current[1], name])
  }

  useEffect(() => {
    if (!selectedName) return

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('municipality-profile')
      if (!target) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedName])

  return (
    <div className="locations-page">
      <section className="locations-hero">
        <div className="container locations-hero-inner">
          <div>
            <span className="eyebrow-light">ADMINISTRATIVE DIRECTORY</span>
            <h1>Palawan’s municipalities, in one place.</h1>
            <p>
              A profile-based directory of the 23 municipalities named in the supplied 2024 CBMS religious affiliation table.
            </p>
          </div>
          <div className="locations-hero-stat">
            <strong>{getValue('Number of Municipalities')}</strong>
            <span>Number of Municipalities</span>
          </div>
        </div>
      </section>

      <section className="locations-overview">
        <div className="container">
          <div className="locations-overview-grid">
            <article>
              <span><MapPin size={17} /></span>
              <strong>{getValue('Number of Islands')}</strong>
              <small>Number of Islands</small>
            </article>
            <article>
              <span><Building2 size={17} /></span>
              <strong>{getValue('Number of Component Cities')}</strong>
              <small>Number of Component Cities</small>
            </article>
            <article>
              <span><Database size={17} /></span>
              <strong>{getValue('Number of Barangays')}</strong>
              <small>Number of Barangays</small>
            </article>
            <article>
              <span><Users size={17} /></span>
              <strong>{getValue('Congressional Districts')}</strong>
              <small>Congressional Districts</small>
            </article>
          </div>
        </div>
      </section>

      <section className="section locations-directory-section">
        <div className="container">
          <div className="locations-section-heading">
            <div>
              <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><MapPin size={14} aria-hidden="true" /> MUNICIPALITY DIRECTORY</span>
              <h2>Explore the 23 municipalities.</h2>
              <p>
                Select a municipality to view the exact population and religious affiliation counts contained in the supplied profile table.
              </p>
            </div>
            <DataMeta year="2020" source={provincialProfile.religiousAffiliation.source} />
          </div>

          <div className="locations-search-wrap">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search municipality..."
              aria-label="Search municipality"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear municipality search">
                <X size={17} />
              </button>
            )}
          </div>

          <div className="locations-results-line">
            <span>{filteredMunicipalities.length} of {municipalities.length} municipalities shown</span>
            <Link to="/profile#religious-affiliation">
              Open full religious affiliation table <ArrowRight size={15} />
            </Link>
          </div>

          <Suspense fallback={<div className="real-map-loading" role="status">Loading interactive map…</div>}>
            <PalawanMap onSelectMunicipality={setSelectedName} />
          </Suspense>

          <div className="locations-chart-grid">
            <div className="locations-chart-card">
              <div className="locations-chart-card-head">
                <div>
                  <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><BarChart3 size={14} aria-hidden="true" /> POPULATION RANKING</span>
                  <h3>All 23 municipalities</h3>
                  <p>Sortable population ranking using the supplied CBMS table values.</p>
                </div>
                <label className="locations-sort-control">
                  <span className="locations-control-label"><SlidersHorizontal size={13} aria-hidden="true" /> Sort</span>
                  <select value={populationSort} onChange={(event) => setPopulationSort(event.target.value)} aria-label="Sort municipality population">
                    <option value="desc">Largest first</option>
                    <option value="asc">Smallest first</option>
                  </select>
                </label>
              </div>
              <Suspense fallback={<div className="chart-empty" role="status">Loading population chart…</div>}>
                <MunicipalityPopulationChart data={sortedPopulation} ariaLabel="Population ranking of all 23 Palawan municipalities" />
              </Suspense>
            </div>

            <div className="locations-chart-card">
              <div className="locations-chart-card-head">
                <div>
                  <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><Database size={14} aria-hidden="true" /> RELIGIOUS AFFILIATION</span>
                  <h3>Municipalities at a glance</h3>
                  <p>Each bar totals 100%; the remainder is shown as other / not reported.</p>
                </div>
                <label className="locations-sort-control">
                  <span className="locations-control-label"><SlidersHorizontal size={13} aria-hidden="true" /> Sort by</span>
                  <select value={religionSort} onChange={(event) => setReligionSort(event.target.value)} aria-label="Sort religion chart by category">
                    {religionColumns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
              </div>
              <Suspense fallback={<div className="chart-empty" role="status">Loading religion chart…</div>}>
                <ReligionStackedChart
                  data={[...religionStackedData].sort((a, b) => (b[religionSort] ?? -1) - (a[religionSort] ?? -1))}
                  ariaLabel="100 percent stacked religious affiliation chart across all 23 municipalities"
                />
              </Suspense>
            </div>
          </div>

          <div className="municipality-card-grid">
            {filteredMunicipalities.map((item, index) => (
              <article
                key={item.municipality}
                className={`municipality-profile-card${selectedName === item.municipality ? ' is-selected' : ''}`}
              >
                <button
                  type="button"
                  className="municipality-card-main"
                  onClick={() => setSelectedName(item.municipality)}
                  aria-pressed={selectedName === item.municipality}
                  aria-label={`View ${item.municipality.replace(', Palawan', '')} profile`}
                >
                  <span className="municipality-card-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="municipality-card-logo">
                    {getMunicipalityLogo(item.municipality.replace(', Palawan', '')) ? (
                      <img
                        src={getMunicipalityLogo(item.municipality.replace(', Palawan', ''))}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="municipality-card-logo-fallback">{item.municipality.charAt(0)}</span>
                    )}
                  </span>
                  <span className="municipality-card-copy">
                    <span className="municipality-card-name">{item.municipality.replace(', Palawan', '')}</span>
                    <span className="municipality-card-location">{item.totalPopulation} reported population</span>
                  </span>
                </button>
                <span className="municipality-card-actions">
                  <button
                    type="button"
                    aria-pressed={compareNames.includes(item.municipality)}
                    className={`municipality-compare-toggle${compareNames.includes(item.municipality) ? ' is-active' : ''}`}
                    onClick={() => toggleCompare(item.municipality)}
                  >
                    <GitCompare size={12} aria-hidden="true" />
                    Compare
                  </button>
                  <span className="municipality-card-arrow" aria-hidden="true"><ArrowRight size={15} /></span>
                </span>
              </article>
            ))}
          </div>

          {filteredMunicipalities.length === 0 && (
            <StatusState compact title="No municipality found" description={`No municipality matches “${query}”.`} />
          )}

          <div className="municipality-compare-panel">
            <div className="municipality-compare-heading">
              <div>
                <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><GitCompare size={14} aria-hidden="true" /> SIDE-BY-SIDE VIEW</span>
                <h3>Compare two municipalities</h3>
                <p>Select up to two cards using <strong>Compare</strong>. This view presents the supplied counts without ranking either municipality.</p>
              </div>
              {compareNames.length > 0 && (
                <button type="button" className="municipality-compare-clear" onClick={() => setCompareNames([])}>Clear</button>
              )}
            </div>

            {compareItems.length === 0 ? (
              <div className="municipality-compare-empty">Choose one or two municipalities from the directory above.</div>
            ) : (
              <div className="municipality-compare-grid">
                {compareItems.map((item) => (
                  <article key={item.municipality} className="municipality-compare-card">
                    <div className="municipality-compare-card-head">
                      <div className="municipality-compare-mini-logo">
                        {getMunicipalityLogo(item.municipality.replace(', Palawan', '')) ? <img src={getMunicipalityLogo(item.municipality.replace(', Palawan', ''))} alt="" loading="lazy" decoding="async" /> : item.municipality.charAt(0)}
                      </div>
                      <div>
                        <span className="eyebrow eyebrow-dark">MUNICIPALITY</span>
                        <h4>{item.municipality.replace(', Palawan', '')}</h4>
                      </div>
                    </div>
                    <div className="municipality-compare-population">
                      <span>Reported population</span>
                      <strong>{item.totalPopulation}</strong>
                    </div>
                    <div className="municipality-compare-chart">
                      <Suspense fallback={<div className="chart-empty" role="status">Loading chart…</div>}>
                        <DonutChart
                          data={buildReligionDonutData(item)}
                          height={260}
                          ariaLabel={`${cleanMunicipalityName(item.municipality)} religious affiliation distribution`}
                        />
                      </Suspense>
                    </div>
                    <div className="municipality-compare-metrics">
                      {religionColumns.slice(0, 4).map(([key, label]) => (
                        <div key={key}>
                          <span>{label}</span>
                          <strong>{item[key] ?? '—'}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {selected && (
        <section id="municipality-profile" className="section section-soft municipality-detail-section">
          <div className="container">
            <div className="municipality-detail-card">
              <div className="municipality-detail-heading">
                <div className="municipality-detail-brand">
                  <div className="municipality-detail-logo">
                    {getMunicipalityLogo(selected.municipality.replace(', Palawan', '')) ? (
                      <img
                        src={getMunicipalityLogo(selected.municipality.replace(', Palawan', ''))}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span>{selected.municipality.charAt(0)}</span>
                    )}
                  </div>
                  <div className="municipality-detail-title">
                    <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><MapPin size={14} aria-hidden="true" /> MUNICIPALITY PROFILE</span>
                    <h2>{selected.municipality.replace(', Palawan', '')}</h2>
                    <p>Municipal emblem and profile figures from the supplied provincial data.</p>
                    <div className="municipality-detail-meta">
                      <span>Palawan</span>
                      <span>{selected.totalPopulation} reported population</span>
                    </div>
                  </div>
                </div>
                <button type="button" className="municipality-detail-close" onClick={() => setSelectedName(null)} aria-label="Close municipality details">
                  <X size={18} />
                </button>
              </div>

              <div className="municipality-detail-summary">
                <div className="municipality-detail-population">
                  <span>CBMS table total population</span>
                  <strong>{selected.totalPopulation}</strong>
                </div>
                <div className="municipality-population-scale">
                  <div className="municipality-scale-label">
                    <span>Population scale within the 23 listed municipalities</span>
                    <strong>{Math.round(((Number(String(selected.totalPopulation ?? 0).replace(/,/g, '')) || 0) / maxPopulation) * 100)}%</strong>
                  </div>
                  <div className="municipality-scale-track">
                    <span style={{ width: `${Math.max(3, ((Number(String(selected.totalPopulation ?? 0).replace(/,/g, '')) || 0) / maxPopulation) * 100)}%` }} />
                  </div>
                  <small>Relative visual scale only; it is not a population ranking.</small>
                </div>
              </div>

              <div className="municipality-snapshot" aria-label="Municipality profile snapshot">
                <article>
                  <span>Total population</span>
                  <strong>{selected.totalPopulation}</strong>
                  <small>2024 CBMS table</small>
                </article>
                <article>
                  <span>Roman Catholic</span>
                  <strong>{selected.romanCatholic}</strong>
                  <small>Reported count</small>
                </article>
                <article>
                  <span>Islam</span>
                  <strong>{selected.islam}</strong>
                  <small>Reported count</small>
                </article>
                <article>
                  <span>Iglesia ni Cristo</span>
                  <strong>{selected.iglesiaNiCristo}</strong>
                  <small>Reported count</small>
                </article>
              </div>

              <div className="municipality-detail-section-title">
                <div>
                  <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><FileText size={14} aria-hidden="true" /> REPORTED CATEGORIES</span>
                  <h3>Religious affiliation counts</h3>
                </div>
                <small>Counts shown exactly as supplied.</small>
              </div>

              <div className="municipality-selected-religion-table">
                {selectedReligionData.map((entry) => (
                  <div key={entry.name}>
                    <span>{entry.name}</span>
                    <strong>{entry.value === null ? '—' : entry.value.toLocaleString('en-US')}</strong>
                  </div>
                ))}
              </div>

              <div className="municipality-selected-religion-chart">
                <div className="municipality-detail-section-title">
                  <div>
                    <span className="eyebrow eyebrow-dark locations-eyebrow-icon"><BarChart3 size={14} aria-hidden="true" /> RELIGION MIX</span>
                    <h3>Religious affiliation distribution</h3>
                  </div>
                  <small>Counts are converted to shares of the supplied municipal total.</small>
                </div>
                <Suspense fallback={<div className="chart-empty" role="status">Loading religion chart…</div>}>
                  <DonutChart
                    data={selectedReligionData}
                    height={300}
                    ariaLabel={`${cleanMunicipalityName(selected.municipality)} religious affiliation distribution`}
                  />
                </Suspense>
              </div>

              <div className="municipality-detail-actions">
                <button type="button" className="municipality-print-button" onClick={() => window.print()} aria-label={`Print ${selected.municipality} profile`}>
                  <Printer size={14} />
                  Print profile
                </button>
              </div>

              <div className="municipality-detail-footer">
                <DataMeta year="2020" source={provincialProfile.religiousAffiliation.source} />
                <Link to="/profile#religious-affiliation">
                  View full table <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
