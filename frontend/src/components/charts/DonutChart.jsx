import ChartWrapper from '../ChartWrapper.jsx'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CHART_COLORS, CHART_TEXT } from '../chartTheme.js'

function displayValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

export default function DonutChart({
  data = [],
  height = 260,
  ariaLabel = 'Donut chart',
}) {
  const columns = [{ key: 'name', label: 'Category' }, { key: 'value', label: 'Value', formatter: displayValue }]

  const validData = data.filter(
    (item) =>
      item &&
      item.value !== null &&
      item.value !== undefined &&
      Number.isFinite(Number(item.value)),
  )

  if (!validData.length) {
    return (
      <ChartWrapper data={data} columns={columns} ariaLabel={ariaLabel} className="donut-chart-wrapper">
        <div
        role="img"
        aria-label={`${ariaLabel}: no data available`}
        style={{
          minHeight: height,
          display: 'grid',
          placeItems: 'center',
          color: CHART_TEXT,
        }}
      >
        —
        </div>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper data={data} columns={columns} ariaLabel={ariaLabel} className="donut-chart-wrapper">
      <div
      role="img"
      aria-label={ariaLabel}
      style={{
        width: '100%',
        height,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={validData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={2}
            strokeWidth={1}
            stroke="#ffffff"
          >
            {validData.map((entry, index) => (
              <Cell
                key={`${entry.name}-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) => [
              displayValue(value),
              'Value',
            ]}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}