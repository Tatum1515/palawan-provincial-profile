import { ArrowRight, Building2, Database, MapPin, Printer, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { provincialProfile } from '../data/provincialProfile.js'
import { getMunicipalityLogo } from '../data/municipalityLogos.js'
import '../styles/locations.css'

const religionColumns = [
  ['romanCatholic', 'Roman Catholic'],
  ['islam', 'Islam'],
  ['iglesiaNiCristo', 'Iglesia ni Cristo'],
  ['protestant', 'Protestant'],
  ['seventhDayAdventist', 'Seventh-day Adventist'],
  ['otherReligion', 'Other Religion'],
  ['noReligion', 'No Religion'],
]

const toNumber = (value) => Number(String(value ?? 0).replace(/,/g, '')) || 0

export default function Locations() {
  const municipalities = provincialProfile.religiousAffiliation.municipalities
  const geography = provincialProfile.geographicAdministrative
  const [query, setQuery] = useState('')
  const [selectedName, setSelectedName] = useState(null)
  const [compareNames, setCompareNames] = useState([])

  const filteredMunicipalities = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return municipalities
    return municipalities.filter((item) => item.municipality.toLowerCase().includes(normalized))
  }, [municipalities, query])

  const selected = municipalities.find((item) => item.municipality === selectedName) || null
  const maxPopulation = Math.max(...municipalities.map((item) => toNumber(item.totalPopulation)), 1)
  const getValue = (label) => geography.find((item) => item.label === label)?.value ?? '—'
  const compareItems = compareNames.map((name) => municipalities.find((item) => item.municipality === name)).filter(Boolean)
  const toggleCompare = (name) => {
    setCompareNames((current) => current.includes(name) ? current.filter((item) => item !== name) : current.length < 2 ? [...current, name] : [current[1], name])
  }

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
              <span className="eyebrow eyebrow-dark">MUNICIPALITY DIRECTORY</span>
              <h2>Explore the 23 municipalities.</h2>
              <p>
                Select a municipality to view the exact population and religious affiliation counts contained in the supplied profile table.
              </p>
            </div>
            <div className="locations-source-pill">
              Source: {provincialProfile.religiousAffiliation.source}
            </div>
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

          <div className="municipality-card-grid">
            {filteredMunicipalities.map((item, index) => (
              <button
                type="button"
                key={item.municipality}
                className={`municipality-profile-card${selectedName === item.municipality ? ' is-selected' : ''}`}
                onClick={() => setSelectedName(item.municipality)}
                aria-pressed={selectedName === item.municipality}
              >
                <span className="municipality-card-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="municipality-card-logo">
                  {getMunicipalityLogo(item.municipality.replace(', Palawan', '')) ? (
                    <img
                      src={getMunicipalityLogo(item.municipality.replace(', Palawan', ''))}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="municipality-card-logo-fallback">{item.municipality.charAt(0)}</span>
                  )}
                </span>
                <span className="municipality-card-copy">
                  <span className="municipality-card-name">{item.municipality.replace(', Palawan', '')}</span>
                  <span className="municipality-card-location">{item.totalPopulation} reported population</span>
                </span>
                <span className="municipality-card-actions">
                  <span
                    role="checkbox"
                    aria-checked={compareNames.includes(item.municipality)}
                    tabIndex={0}
                    className={`municipality-compare-toggle${compareNames.includes(item.municipality) ? ' is-active' : ''}`}
                    onClick={(event) => { event.stopPropagation(); toggleCompare(item.municipality) }}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleCompare(item.municipality) } }}
                  >
                    Compare
                  </span>
                  <span className="municipality-card-arrow"><ArrowRight size={15} /></span>
                </span>
              </button>
            ))}
          </div>

          {filteredMunicipalities.length === 0 && (
            <div className="locations-empty">
              No municipality matches “{query}”.
            </div>
          )}

          <div className="municipality-compare-panel">
            <div className="municipality-compare-heading">
              <div>
                <span className="eyebrow eyebrow-dark">SIDE-BY-SIDE VIEW</span>
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
                        {getMunicipalityLogo(item.municipality.replace(', Palawan', '')) ? <img src={getMunicipalityLogo(item.municipality.replace(', Palawan', ''))} alt="" /> : item.municipality.charAt(0)}
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
                    <div className="municipality-compare-metrics">
                      {religionColumns.slice(0, 4).map(([key, label]) => (
                        <div key={key}>
                          <span>{label}</span>
                          <strong>{item[key]}</strong>
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
        <section className="section section-soft municipality-detail-section">
          <div className="container">
            <div className="municipality-detail-card">
              <div className="municipality-detail-heading">
                <div className="municipality-detail-brand">
                  <div className="municipality-detail-logo">
                    {getMunicipalityLogo(selected.municipality.replace(', Palawan', '')) ? (
                      <img
                        src={getMunicipalityLogo(selected.municipality.replace(', Palawan', ''))}
                        alt=""
                      />
                    ) : (
                      <span>{selected.municipality.charAt(0)}</span>
                    )}
                  </div>
                  <div className="municipality-detail-title">
                    <span className="eyebrow eyebrow-dark">MUNICIPALITY PROFILE</span>
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
                    <strong>{Math.round((toNumber(selected.totalPopulation) / maxPopulation) * 100)}%</strong>
                  </div>
                  <div className="municipality-scale-track">
                    <span style={{ width: `${Math.max(3, (toNumber(selected.totalPopulation) / maxPopulation) * 100)}%` }} />
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
                  <span className="eyebrow eyebrow-dark">REPORTED CATEGORIES</span>
                  <h3>Religious affiliation counts</h3>
                </div>
                <small>Counts shown exactly as supplied.</small>
              </div>

              <div className="municipality-religion-grid municipality-religion-bars">
                {religionColumns.map(([key, label]) => {
                  const maxReligion = Math.max(...religionColumns.map(([religionKey]) => toNumber(selected[religionKey])), 1)
                  const value = toNumber(selected[key])
                  const width = value === 0 ? 0 : Math.max(4, (value / maxReligion) * 100)
                  return (
                    <article key={key}>
                      <div className="municipality-religion-head">
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                      <div className="municipality-religion-track" aria-hidden="true">
                        <span style={{ width: `${width}%` }} />
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="municipality-detail-actions">
                <button type="button" className="municipality-print-button" onClick={() => window.print()} aria-label={`Print ${selected.municipality} profile`}>
                  <Printer size={14} />
                  Print profile
                </button>
              </div>

              <div className="municipality-detail-footer">
                <span>Source: {provincialProfile.religiousAffiliation.source}</span>
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
