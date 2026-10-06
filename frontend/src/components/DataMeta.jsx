export default function DataMeta({ year, source, asOf, status, note }) {
  const parts = [
    year ? `Reference year ${year}` : null,
    source ? `Source ${source}` : null,
    asOf ? `As of ${asOf}` : null,
    status ? `Data status ${status}` : null,
    note ? note : null,
  ].filter(Boolean)

  if (!parts.length) return null

  return (
    <div className="data-meta" aria-label={parts.join('; ')}>
      {year && <span className="data-meta-year">Reference year: {year}</span>}
      {source && <span className="data-meta-source">Source: {source}</span>}
      {asOf && <span className="data-meta-asof">As of: {asOf}</span>}
      {status && <span className="data-meta-status">Data status: {status}</span>}
      {note && <span className="data-meta-note">{note}</span>}
    </div>
  )
}
