import { lazy } from 'react'

export const LazyDonutChart = lazy(() => import('./charts/DonutChart.jsx'))
export const LazyStackedBar = lazy(() => import('./StackedBar.jsx'))
export const LazyTrendChart = lazy(() => import('./TrendChart.jsx'))
export const LazyFunnelChart = lazy(() => import('./FunnelChart.jsx'))
export const LazySparkline = lazy(() => import('./Sparkline.jsx'))
export const LazyGroupedBar = lazy(() => import('./GroupedBar.jsx'))

export const LazyIndicatorChart = lazy(() => import('./DataIndicatorChart.jsx'))

export const LazyOpportunityMap = lazy(() => import('./OpportunityMap.jsx'))
