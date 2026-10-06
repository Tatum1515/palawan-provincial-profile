import React from 'react'
import { Cell, Funnel, FunnelChart as RechartsFunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_COLORS, CHART_TEXT } from './chartTheme.js'

export default function FunnelChart({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  title,
  description,
  height = 340,
  formatter,
}) {
  const chartData = data.filter((item) => item?.[valueKey] !== null && item?.[valueKey] !== undefined)
  const columns = [
    { key: nameKey, label: 'Stage' },
    { key: valueKey, label: 'Value', formatter },
  ]

  return (
    <ChartWrapper title={title} description={description} data={data} columns={columns}>
      {chartData.length ? (
        <div className="chart-responsive" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsFunnelChart>
              <Tooltip formatter={(value) => formatter ? formatter(value) : value} />
              <Funnel data={chartData} dataKey={valueKey} nameKey={nameKey} isAnimationActive={false}>
                {chartData.map((item, index) => <Cell key={`${item[nameKey]}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                <LabelList position="right" fill={CHART_TEXT} stroke="none" dataKey={nameKey} />
              </Funnel>
            </RechartsFunnelChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="chart-empty">No available data</div>}
    </ChartWrapper>
  )
}
