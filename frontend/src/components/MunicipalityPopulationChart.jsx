import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_COLORS, CHART_GRID, CHART_TEXT } from './chartTheme.js'
import { formatNumber, toNumber } from '../utils/numbers.js'

export default function MunicipalityPopulationChart({ data = [], height = 620, ariaLabel = 'Municipality population ranking' }) {
  const rows = data.map((item) => ({
    name: item.municipality?.replace(', Palawan', '') || '—',
    population: toNumber(item.totalPopulation),
  }))
  const columns = [
    { key: 'name', label: 'Municipality' },
    { key: 'population', label: 'Population', formatter: formatNumber },
  ]

  return (
    <ChartWrapper
      title=""
      description=""
      data={rows}
      columns={columns}
      ariaLabel={ariaLabel}
      className="municipality-population-chart-wrapper"
    >
      {rows.length ? (
        <div className="chart-responsive" style={{ height: Math.max(height, rows.length * 30) }} role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 42, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_TEXT, fontSize: 11 }} tickFormatter={(value) => formatNumber(value)} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
              <Tooltip formatter={(value) => [formatNumber(value), 'Population']} />
              <Bar dataKey="population" fill={CHART_COLORS[0]} radius={[0, 5, 5, 0]} isAnimationActive={false}>
                <LabelList dataKey="population" position="right" formatter={(value) => formatNumber(value)} fill={CHART_TEXT} fontSize={10} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="chart-empty">No available data</div>}
    </ChartWrapper>
  )
}
