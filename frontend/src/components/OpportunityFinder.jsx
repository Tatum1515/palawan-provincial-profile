import { Search, SlidersHorizontal, X } from 'lucide-react'

export default function OpportunityFinder({
  query,
  sector,
  location,
  stage,
  sectors,
  locations,
  stages,
  resultCount,
  onQueryChange,
  onSectorChange,
  onLocationChange,
  onStageChange,
  onClear,
}) {
  const hasFilters = Boolean(query || sector !== 'All' || location !== 'All' || stage !== 'All')

  return (
    <div className="opportunity-finder-panel">
      <div className="finder-topline">
        <div>
          <span className="finder-kicker">INVESTMENT OPPORTUNITY FINDER</span>
          <h2>Find the right opportunity in Palawan.</h2>
          <p>Search project concepts by sector, location, or development stage.</p>
        </div>
        <div className="finder-count">
          <span>{resultCount}</span>
          <small>matching opportunities</small>
        </div>
      </div>

      <div className="finder-controls">
        <label className="finder-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search opportunities</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search project, sector, location..."
          />
        </label>

        <label>
          <span>Sector</span>
          <select value={sector} onChange={(event) => onSectorChange(event.target.value)}>
            <option value="All">All sectors</option>
            {sectors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span>Location</span>
          <select value={location} onChange={(event) => onLocationChange(event.target.value)}>
            <option value="All">All locations</option>
            {locations.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span>Stage</span>
          <select value={stage} onChange={(event) => onStageChange(event.target.value)}>
            <option value="All">All stages</option>
            {stages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <button className="finder-clear" type="button" onClick={onClear} disabled={!hasFilters}>
          {hasFilters ? <X size={15} /> : <SlidersHorizontal size={15} />}
          {hasFilters ? 'Clear filters' : 'Filter results'}
        </button>
      </div>
    </div>
  )
}
