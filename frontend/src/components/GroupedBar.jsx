import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_TEXT } from './chartTheme.js'

export default function GroupedBar({
  data = [],
  categoryKey = 'name',
  series = [],
  title,
  description,
  height = 300,
  formatter,
  ariaLabel,
}) {
  const columns = [
    { key: categoryKey, label: 'Category' },
    ...series.map((item) => ({ key: item.key, label: item.label || item.key, formatter })),
  ]

  return (
    <ChartWrapper title={title} description={description} data={data} columns={columns} ariaLabel={ariaLabel}>
      {data.length ? (
        <div className="chart-responsive" style={{ height }} role="img" aria-label={ariaLabel || title || 'Grouped column chart'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 24 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey={categoryKey} interval={0} angle={-25} textAnchor="end" height={54} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
              <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} tickFormatter={(value) => formatter ? formatter(value) : value.toLocaleString()} />
              <Tooltip formatter={(value, name) => [formatter ? formatter(value) : value, name]} />
              <Legend />
              {series.map((item, index) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label || item.key}
                  fill={item.color || CHART_COLORS[index % CHART_COLORS.length]}
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="chart-empty">No available data</div>}
    </ChartWrapper>
  )
}
