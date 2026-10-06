import React from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_TEXT } from './chartTheme.js'

export default function StackedBar({
  data = [],
  categoryKey = 'name',
  series = [],
  title,
  description,
  height = 360,
  percent = false,
  formatter,
}) {
  const columns = [
    { key: categoryKey, label: 'Category' },
    ...series.map((item) => ({ key: item.key, label: item.label || item.key, formatter })),
  ]

  return (
    <ChartWrapper title={title} description={description} data={data} columns={columns}>
      {data.length ? (
        <div className="chart-responsive" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 48 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey={categoryKey} tick={{ fill: CHART_TEXT, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={72} />
              <YAxis domain={percent ? [0, 100] : ['auto', 'auto']} tick={{ fill: CHART_AXIS, fontSize: 11 }} tickFormatter={(value) => percent ? `${value}%` : value.toLocaleString()} />
              <Tooltip formatter={(value, name) => [formatter ? formatter(value) : value, name]} />
              <Legend />
              {series.map((item, index) => (
                <Bar key={item.key} dataKey={item.key} name={item.label || item.key} stackId="stack" fill={item.color || CHART_COLORS[index % CHART_COLORS.length]} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="chart-empty">No available data</div>}
    </ChartWrapper>
  )
}
