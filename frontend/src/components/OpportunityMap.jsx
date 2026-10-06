import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowUpRight, Building2, Fish, Leaf, MapPin, Monitor, Truck, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { municipalityNamesMatch, normalizeMunicipalityName } from '../utils/municipalityMatcher.js'
import AccessibleLeafletControls from './AccessibleLeafletControls.jsx'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js'

const GEOJSON_URL = '/data/palawan-municipalities.geojson'
const PUERTO_PRINCESA_GEOJSON_URL = '/data/puerto-princesa.geojson'

const NAME_ALIASES = {
  'El Nido (Bacuit)': 'El Nido',
  'Rizal (Marcos)': 'Rizal',
  'Española': 'Sofronio Española',
}

const PUERTO_PRINCESA_CENTER = [9.7391667, 118.7352778]

const SECTOR_CONFIG = {
  'Tourism & Hospitality': { label: 'Tourism', icon: 'building' },
  'Agriculture & Agri-business': { label: 'Agri-business', icon: 'leaf' },
  'Fisheries & Aquaculture': { label: 'Fisheries', icon: 'fish' },
  'Renewable Energy': { label: 'Renewable energy', icon: 'zap' },
  'ICT & Digital Services': { label: 'ICT & digital', icon: 'monitor' },
  'Infrastructure & Logistics': { label: 'Infrastructure & logistics', icon: 'truck' },
}

function normalizeName(value = '') {
  return normalizeMunicipalityName(value)
}

function getFeatureName(feature) {
  return (
    feature?.properties?.ADM3_EN ||
    feature?.properties?.NAME_3 ||
    feature?.properties?.name ||
    feature?.properties?.NAME ||
    ''
  )
}

function resolveLocation(location, features) {
  const normalized = normalizeName(location)
  if (!normalized) return null

  const feature = features.find((item) => municipalityNamesMatch(getFeatureName(item), location))
  if (!feature) return null

  const bounds = L.geoJSON(feature).getBounds()
  if (!bounds.isValid()) return null

  const center = bounds.getCenter()
  return [center.lat, center.lng]
}

function iconSvg(kind) {
  const paths = {
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  }

  return paths[kind] || paths.building
}

function createOpportunityIcon(sector) {
  const config = SECTOR_CONFIG[sector] || SECTOR_CONFIG['Tourism & Hospitality']
  const html = `<div class="opportunity-map-marker" role="img" aria-label="${config.label} opportunity">${iconSvg(config.icon)}</div>`

  return L.divIcon({
    html,
    className: 'opportunity-map-marker-wrap',
    iconSize: [40, 48],
    iconAnchor: [20, 44],
    popupAnchor: [0, -42],
  })
}

const markerIcons = Object.fromEntries(
  Object.keys(SECTOR_CONFIG).map((sector) => [sector, createOpportunityIcon(sector)]),
)

function FitBounds({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    const bounds = L.latLngBounds(points)
    if (!bounds.isValid()) return

    map.fitBounds(bounds, { padding: [34, 34], maxZoom: 9, animate: false })
  }, [map, points])

  return null
}

function sectorIconComponent(sector) {
  const config = SECTOR_CONFIG[sector]
  const icons = { building: Building2, leaf: Leaf, fish: Fish, zap: Zap, monitor: Monitor, truck: Truck }
  const Icon = icons[config?.icon] || Building2
  return <Icon size={15} aria-hidden="true" />
}

export default function OpportunityMap({ opportunities = [] }) {
  const [geojson, setGeojson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    let cancelled = false

    async function load() {
      const fetchJson = async (url) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Unable to load map data (${response.status}).`)
        return response.json()
      }

      try {
        setLoading(true)
        setError('')

        const data = await fetchJson(GEOJSON_URL)
        const sourceFeatures = Array.isArray(data?.features) ? data.features : []
        const features = sourceFeatures.some((feature) => feature?.properties?.ADM2_EN)
          ? sourceFeatures.filter((feature) => feature?.properties?.ADM2_EN === 'Palawan')
          : sourceFeatures.filter((feature) => Boolean(getFeatureName(feature)))

        if (!features.length) throw new Error('No Palawan municipality boundaries were found.')

        try {
          const puertoData = await fetchJson(PUERTO_PRINCESA_GEOJSON_URL)
          const puertoFeatures = Array.isArray(puertoData?.features) ? puertoData.features : []
          features.push(...puertoFeatures)
        } catch {
          // Puerto Princesa boundary is optional. The existing town-center pin remains available.
        }

        if (!cancelled) setGeojson({ type: 'FeatureCollection', features })
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load the opportunity map.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const resolved = useMemo(() => {
    const features = geojson?.features || []
    const items = opportunities.map((item) => {
      const locationKey = normalizeName(item.location)
      const boundaryCenter = resolveLocation(item.location, features)
      const center = boundaryCenter || (locationKey === normalizeName('Puerto Princesa City') ? PUERTO_PRINCESA_CENTER : null)

      return {
        ...item,
        center,
        isGeocoded: !boundaryCenter && Boolean(center),
      }
    })

    return {
      items: items.filter((item) => item.center),
      unmatched: items.filter((item) => !item.center),
    }
  }, [geojson, opportunities])

  const points = resolved.items.map((item) => item.center)

  return (
    <section className="opportunity-map-section" aria-labelledby="opportunity-map-title">
      <div className="opportunity-map-card">
        <div className="opportunity-map-head">
          <div>
            <span className="eyebrow">OPPORTUNITY MAP</span>
            <h2 id="opportunity-map-title">See active opportunity locations at a glance.</h2>
            <p>
              Pins use the opportunity record's location field. Boundary-based locations use municipality-level positions; Puerto Princesa City uses its mapped town-center coordinate because it is not included in the 23-municipality boundary file.
            </p>
          </div>
          <div className="opportunity-map-count">
            <strong>{resolved.items.length}</strong>
            <span>mapped opportunities</span>
          </div>
        </div>

        {loading && <div className="opportunity-map-state">Loading opportunity map…</div>}
        {error && <div className="opportunity-map-state opportunity-map-state-error">{error}</div>}

        {!loading && !error && (
          <div className="opportunity-map-shell">
            <MapContainer
              center={[9.8, 118.7]}
              zoom={7}
              minZoom={6}
              maxZoom={11}
              scrollWheelZoom
              keyboard
              zoomControl
              zoomAnimation={!prefersReducedMotion}
              fadeAnimation={!prefersReducedMotion}
              markerZoomAnimation={!prefersReducedMotion}
              className="opportunity-map-container"
              aria-label="Palawan map showing investment opportunity locations"
            >
              <AccessibleLeafletControls />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={points} />

              {resolved.items.map((item) => (
                <Marker
                  key={item.id}
                  position={item.center}
                  icon={markerIcons[item.sector] || markerIcons['Tourism & Hospitality']}
                  keyboard
                  title={`${item.title} — ${item.location}`}
                >
                  <Popup className="opportunity-map-popup" closeButton>
                    <div className="opportunity-popup-content">
                      <div className="opportunity-popup-kicker">
                        {sectorIconComponent(item.sector)}
                        <span>{item.sector}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <div className="opportunity-popup-location"><MapPin size={14} aria-hidden="true" /> {item.location}</div>
                      <p>{item.summary}</p>
                      <div className="opportunity-popup-status">
                        <span>Status</span>
                        <strong>{item.investment || 'For validation'}</strong>
                      </div>
                      <Link className="opportunity-popup-link" to={`/opportunities/${item.id}`}>
                        View opportunity <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            <div className="opportunity-map-overlay" aria-label="Map legend">
              <strong>Sector</strong>
              {Object.entries(SECTOR_CONFIG).map(([sector, config]) => (
                <span key={sector}><i className="opportunity-map-legend-icon">{sectorIconComponent(sector)}</i>{config.label}</span>
              ))}
              <small>All current records are marked <b>For validation</b>.</small>
            </div>
          </div>
        )}

        {resolved.unmatched.length > 0 && (
          <div className="opportunity-map-warning" role="status">
            {resolved.unmatched.length} opportunity location{resolved.unmatched.length === 1 ? '' : 's'} could not be placed on the map: {resolved.unmatched.map((item) => item.location).join(', ')}.
          </div>
        )}
      </div>
    </section>
  )
}
