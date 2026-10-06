import React, { useId, useState } from 'react'
import ChartTable from './ChartTable.jsx'

export default function ChartWrapper({
  title,
  description,
  children,
  data = [],
  columns = [],
  tableLabel = 'View as table',
  chartLabel = 'View chart',
  ariaLabel,
  className = '',
}) {
  const [tableView, setTableView] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  return (
    <section
      className={`chart-card ${className}`.trim()}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="chart-card-head">
          <div>
            {title && <h3 id={titleId}>{title}</h3>}
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <div className="chart-view-toggle" role="group" aria-label="Chart display options">
            <button
              type="button"
              className={!tableView ? 'is-active' : ''}
              aria-pressed={!tableView}
              onClick={() => setTableView(false)}
            >
              {chartLabel}
            </button>
            <button
              type="button"
              className={tableView ? 'is-active' : ''}
              aria-pressed={tableView}
              onClick={() => setTableView(true)}
            >
              {tableLabel}
            </button>
          </div>
      </div>
      <div className="chart-card-body">
        {tableView ? <ChartTable data={data} columns={columns} ariaLabel={ariaLabel || title || 'Chart data table'} /> : children}
      </div>
    </section>
  )
}
