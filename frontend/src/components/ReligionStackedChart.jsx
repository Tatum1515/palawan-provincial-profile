import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartWrapper from './ChartWrapper.jsx'
import { CHART_COLORS, CHART_GRID, CHART_TEXT, CHART_AXIS } from './chartTheme.js'

const SERIES = [
  { key: 'romanCatholic', label: 'Roman Catholic' },
  { key: 'islam', label: 'Islam' },
  { key: 'iglesiaNiCristo', label: 'Iglesia ni Cristo' },
  { key: 'protestant', label: 'Protestant' },
  { key: 'seventhDayAdventist', label: 'Seventh-day Adventist' },
  { key: 'otherReligion', label: 'Other Religion' },
  { key: 'noReligion', label: 'No Religion' },
  { key: 'remainder', label: 'Other / not reported' },
].map((item, index) => ({ ...item, color: CHART_COLORS[index] }))
export default function ReligionStackedChart({ data = [], ariaLabel = 'Religious affiliation chart' }) {
  const columns = [
    { key: 'name', label: 'Municipality' },
    ...SERIES.map((item) => ({
      key: item.key,
      label: item.label,
      formatter: (value) => `${Number(value ?? 0).toFixed(1)}%`,
    })),
  ]

  return (
    <ChartWrapper
      title="Religious affiliation"
      description="Each municipality is normalized to 100% of its reported population; any unclassified remainder is shown separately."
      data={data}
      columns={columns}
    >
      {data.length ? (
        <div className="religion-stacked-shell" role="img" aria-label={ariaLabel}>
          <div className="religion-stacked-legend" aria-hidden="true">
            {SERIES.map((item) => (
              <span className="religion-stacked-legend-item" key={item.key}>
                <span className="religion-stacked-legend-dot" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </span>
            ))}
          </div>

          <div className="religion-stacked-help">
            <span>0%</span>
            <span>100% of reported population</span>
          </div>

          <div className="religion-stacked-scroll" tabIndex="0" aria-label="Scrollable municipality religion chart">
            <div className="religion-stacked-chart">
              <ResponsiveContainer width="100%" height={Math.max(520, data.length * 27 + 78)}>
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 8, right: 22, left: 4, bottom: 8 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: CHART_TEXT, fontSize: 11 }}
                    tickFormatter={(value) => `${value}%`}
                    ticks={[0, 25, 50, 75, 100]}
                    axisLine={{ stroke: '#d8e3de' }}
                    tickLine={{ stroke: '#d8e3de' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{ fill: CHART_AXIS, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(8,127,107,.05)' }}
                    contentStyle={{
                      border: '1px solid #dce7e2',
                      borderRadius: 10,
                      boxShadow: '0 10px 25px rgba(10,49,40,.10)',
                      fontSize: 11,
                    }}
                    formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, name]}
                    labelFormatter={(label) => label}
                  />
                  {SERIES.map((item, index) => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={item.label}
                      stackId="religion"
                      fill={item.color}
                      isAnimationActive={false}
                      radius={
                        index === 0
                          ? [4, 0, 0, 4]
                          : index === SERIES.length - 1
                            ? [0, 4, 4, 0]
                            : 0
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="chart-empty">No available data</div>
      )}
    </ChartWrapper>
  )
}
