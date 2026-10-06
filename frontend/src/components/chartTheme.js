export const CHART_COLORS = [
  '#007C66',
  '#B8860B',
  '#3568A8',
  '#B4556A',
  '#6C55A3',
  '#008B8B',
  '#7A5A32',
  '#4D7C6F',
]

export const CHART_GRID = 'rgba(43, 76, 66, 0.12)'
export const CHART_TEXT = '#52635D'
export const CHART_AXIS = '#52635D'

export function colorAt(index) {
  return CHART_COLORS[index % CHART_COLORS.length]
}
