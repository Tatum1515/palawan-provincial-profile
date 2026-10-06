import React from 'react'

function displayValue(value, formatter) {
  if (value === null || value === undefined || value === '') return '—'
  return formatter ? formatter(value) : String(value)
}

export default function ChartTable({ data = [], columns = [], ariaLabel = 'Chart data table' }) {
  const resolvedColumns = columns.length
    ? columns
    : data.length
      ? Object.keys(data[0]).map((key) => ({ key, label: key }))
      : []

  return (
    <div className="chart-table-wrap">
      <table className="chart-table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {resolvedColumns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length ? data.map((row, rowIndex) => (
            <tr key={row.id ?? row.key ?? rowIndex}>
              {resolvedColumns.map((column) => (
                <td key={column.key}>{displayValue(row[column.key], column.formatter)}</td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={Math.max(resolvedColumns.length, 1)}>No available data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
