import { locations } from '../data/siteData.js'

export default function MapPanel() {
  return <div className="map-panel"><div className="map-water"><div className="map-island" />{locations.slice(0,5).map((location, index) => <span key={location.name} className={`map-pin pin-${index + 1}`}>{location.name}</span>)}</div><div className="map-legend"><span>INVESTMENT LOCATIONS</span><h3>Explore Palawan by place.</h3><p>Use location profiles to understand the investment context and priority sectors in each area.</p>{locations.slice(0,4).map((location) => <div className="map-row" key={location.name}><b>{location.name}</b><span>{location.sectors.slice(0,2).join(' · ')}</span></div>)}</div></div>
}
