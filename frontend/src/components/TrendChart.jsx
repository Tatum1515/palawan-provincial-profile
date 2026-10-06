import React from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_TEXT } from './chartTheme.js'

export default function TrendChart({
  data = [],
  xKey = 'year',
  series = [{ key: 'value', label: 'Value' }],
  title,
  description,
  height = 300,
  formatter,
  note,
}) {
  const columns = [
    { key: xKey, label: 'Period' },
    ...series.map((item) => ({ key: item.key, label: item.label || item.key, formatter })),
  ]

  const chartData = data.filter((row) => series.some((item) => row?.[item.key] !== null && row?.[item.key] !== undefined))

  return (
    <ChartWrapper title={title} description={description} data={data} columns={columns}>
      {chartData.length ? (
        <>
          <div className="chart-responsive" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey={xKey} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickFormatter={(value) => formatter ? formatter(value) : value.toLocaleString()} />
                <Tooltip formatter={(value, name) => [formatter ? formatter(value) : value, name]} />
                {series.length > 1 && <Legend />}
                {series.map((item, index) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.label || item.key} stroke={item.color || CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {note && <p className="chart-note">{note}</p>}
        </>
      ) : <div className="chart-empty">No available data</div>}
    </ChartWrapper>
  )
}
