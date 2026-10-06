import { useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTable from './ChartTable.jsx'
import { CHART_COLORS, CHART_GRID, CHART_TEXT, CHART_AXIS } from './chartTheme.js'
import { toNumber } from '../utils/numbers.js'

function safeFileName(value) {
  return String(value || 'indicator')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'indicator'
}

function displayRawValue(value) {
  return value === null || value === undefined || value === '' || value === '-' ? '—' : String(value)
}

function uniqueDisplayValues(rows, key) {
  return [...new Set(rows.map((row) => displayRawValue(row?.[key])).filter(Boolean))]
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '—').split(/\s+/)
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  lines.forEach((item, index) => context.fillText(item, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

async function downloadChartAsPng(container, { indicator, rows }) {
  const svg = container?.querySelector('svg')
  if (!svg) return false

  const serializer = new XMLSerializer()
  const svgClone = svg.cloneNode(true)
  const chartWidth = Math.max(svg.clientWidth || 900, 320)
  const chartHeight = Math.max(svg.clientHeight || 320, 220)

  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  svgClone.setAttribute('width', String(chartWidth))
  svgClone.setAttribute('height', String(chartHeight))

  const source = serializer.serializeToString(svgClone)
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = svgUrl
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
    })

    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
    const padding = 32
    const headerHeight = 104
    const footerHeight = 54
    const canvasWidth = chartWidth + padding * 2
    const canvasHeight = chartHeight + padding * 2 + headerHeight + footerHeight
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(canvasWidth * scale)
    canvas.height = Math.round(canvasHeight * scale)

    const context = canvas.getContext('2d')
    if (!context) return false

    context.scale(scale, scale)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvasWidth, canvasHeight)

    const years = uniqueDisplayValues(rows, 'year')
    const sources = uniqueDisplayValues(rows, 'source')
    const yearText = `Reference year${years.length === 1 ? '' : 's'}: ${years.length ? years.join(', ') : '—'}`
    const sourceText = `Source: ${sources.length ? sources.join(' / ') : '—'}`

    context.fillStyle = '#123b2a'
    context.font = "700 22px 'DM Sans', Arial, sans-serif"
    drawWrappedText(context, indicator || 'Indicator', padding, padding + 24, canvasWidth - padding * 2, 27)

    context.fillStyle = '#536158'
    context.font = "14px 'DM Sans', Arial, sans-serif"
    context.fillText(yearText, padding, padding + 62)

    context.fillStyle = '#657268'
    context.font = "13px 'DM Sans', Arial, sans-serif"
    drawWrappedText(context, sourceText, padding, padding + 84, canvasWidth - padding * 2, 18)

    const chartTop = padding + headerHeight
    context.drawImage(image, padding, chartTop, chartWidth, chartHeight)

    context.fillStyle = '#657268'
    context.font = "12px 'DM Sans', Arial, sans-serif"
    context.fillText('Palawan Provincial Profile · Data Explorer', padding, canvasHeight - 20)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return false

    const pngUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = pngUrl
    link.download = `${safeFileName(indicator)}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(pngUrl)
    return true
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export default function DataIndicatorChart({ indicator, rows = [], onExportCsv }) {
  const [tableView, setTableView] = useState(false)
  const [exporting, setExporting] = useState(false)
  const chartRef = useRef(null)

  const chartData = useMemo(() => rows
    .map((row, index) => ({
      id: `${row.year || 'period'}-${row.value ?? 'missing'}-${index}`,
      period: row.year || 'Period not specified',
      numericValue: row.numericValue ?? toNumber(row.value),
      value: row.numericValue ?? toNumber(row.value),
      rawValue: row.value,
    }))
    .filter((row) => row.value !== null), [rows])

  const columns = useMemo(() => [
    { key: 'period', label: 'Reference year' },
    { key: 'rawValue', label: 'Value', formatter: displayRawValue },
  ], [])

  const handlePngExport = async () => {
    setExporting(true)
    try {
      await downloadChartAsPng(chartRef.current, { indicator, rows })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="data-indicator-visualization">
      <div className="data-indicator-chart-toolbar" role="group" aria-label={`${indicator} display and export options`}>
        <div className="data-indicator-view-toggle" role="group" aria-label="Indicator view options">
          <button
            type="button"
            className={!tableView ? 'is-active' : ''}
            aria-pressed={!tableView}
            onClick={() => setTableView(false)}
          >
            View chart
          </button>
          <button
            type="button"
            className={tableView ? 'is-active' : ''}
            aria-pressed={tableView}
            onClick={() => setTableView(true)}
          >
            View as table
          </button>
        </div>
        <div className="data-indicator-export-actions">
          {onExportCsv && (
            <button
              type="button"
              className="data-indicator-export"
              onClick={onExportCsv}
              disabled={!rows.length}
              aria-label={`Export ${indicator} data as CSV`}
              title="Export indicator data as CSV"
            >
              <Download size={15} aria-hidden="true" /> Export CSV
            </button>
          )}
          <button
            type="button"
            className="data-indicator-export"
            onClick={handlePngExport}
            disabled={tableView || !chartData.length || exporting}
            aria-label={`Download ${indicator} chart as PNG`}
            title={tableView ? 'Switch to chart view to download PNG' : 'Download chart as PNG'}
          >
            {exporting ? <><Download size={15} aria-hidden="true" /> Exporting…</> : <><Download size={15} aria-hidden="true" /> Download PNG</>}
          </button>
        </div>
      </div>

      {tableView ? (
        <ChartTable
          data={rows.map((row, index) => ({
            id: `${row.year || 'period'}-${index}`,
            period: row.year || 'Period not specified',
            rawValue: row.value,
          }))}
          columns={columns}
          ariaLabel={`${indicator} data table`}
        />
      ) : chartData.length ? (
        <div
          ref={chartRef}
          className="data-indicator-recharts"
          role="img"
          aria-label={`Chart of ${indicator} by reference year`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 18, right: 18, left: 12, bottom: 24 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="period" tick={{ fill: CHART_TEXT, fontSize: 11 }} />
              <YAxis
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                width={58}
                tickFormatter={(value) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              />
              <Tooltip
                formatter={(value, _name, item) => [displayRawValue(item?.payload?.rawValue), 'Value']}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="value" name="Value" fill={CHART_COLORS[0]} radius={[5, 5, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="data-indicator-empty" role="status">No numeric observations are available for this indicator.</div>
      )}
    </div>
  )
}
