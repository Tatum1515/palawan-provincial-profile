import React from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_COLORS } from './chartTheme.js'

export default function Sparkline({ data = [], dataKey = 'value', label = 'Trend', color = CHART_COLORS[0], width = '100%', height = 48, title, description, formatter }) {
  const validData = data.filter((item) => item?.[dataKey] !== null && item?.[dataKey] !== undefined)

  const columns = [{ key: dataKey, label, formatter }]

  return (
    <ChartWrapper title={title} description={description} data={data} columns={columns} className="chart-card-sparkline">
      {validData.length ? (
        <div className="chart-sparkline" role="img" aria-label={`${label} sparkline`} style={{ width, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={validData} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <span className="chart-sparkline-empty" aria-label={`${label}: no available data`}>—</span>}
    </ChartWrapper>
  )
}
