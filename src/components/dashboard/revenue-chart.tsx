'use client'

import { formatCurrency } from '@/lib/utils'

export interface ChartDataPoint {
  label: string
  value: number
  isCurrent: boolean
  showLabel: boolean // whether to display this label on x-axis
}

interface RevenueChartProps {
  data: ChartDataPoint[]
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0].x},${pts[0].y}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y }
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`)
  }
  return d.join(' ')
}

/** Calculate nice round step for Y-axis */
function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const residual = rawStep / magnitude
  if (residual <= 1.5) return magnitude
  if (residual <= 3) return 2 * magnitude
  if (residual <= 7) return 5 * magnitude
  return 10 * magnitude
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value))

  // Y-axis scale
  const step = niceStep(maxValue / 3)
  const yMax = step === 0 ? 10 : Math.ceil(maxValue / step) * step || step
  const yMarkers: number[] = []
  for (let v = 0; v <= yMax; v += step) {
    yMarkers.push(v)
  }
  // Limit to 5 markers max
  if (yMarkers.length > 5) {
    const newStep = niceStep(maxValue / 2)
    const newYMax = Math.ceil(maxValue / newStep) * newStep || newStep
    yMarkers.length = 0
    for (let v = 0; v <= newYMax; v += newStep) {
      yMarkers.push(v)
    }
  }
  const actualYMax = yMarkers[yMarkers.length - 1] || 1

  // Chart dimensions
  const chartLeft = 0
  const chartRight = 100 // percentage
  const chartTop = 4
  const chartBottom = 44
  const chartHeight = chartBottom - chartTop

  // Build points (as percentage x, absolute y for SVG)
  const points = data.map((d, i) => ({
    x: data.length === 1 ? 50 : (i / (data.length - 1)) * 100,
    y: chartTop + chartHeight - (d.value / actualYMax) * chartHeight,
  }))

  // SVG paths
  const linePath = smoothPath(points)
  const curvePart = linePath.indexOf('C') >= 0
    ? linePath.slice(linePath.indexOf('C'))
    : `L ${points[points.length - 1].x},${points[points.length - 1].y}`
  const fillPath = `M 0,${chartBottom} L ${points[0].x},${points[0].y} ${curvePart} L 100,${chartBottom} Z`

  const currentIdx = data.findIndex(d => d.isCurrent)

  // Labels to show on x-axis
  const visibleLabels = data.map((d, i) => ({
    label: d.label,
    show: d.showLabel,
    isCurrent: d.isCurrent,
    pct: data.length === 1 ? 50 : (i / (data.length - 1)) * 100,
  }))

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-[42px] z-10" style={{ pointerEvents: 'none' }}>
        {yMarkers.map((v, i) => {
          const pct = 100 - (v / actualYMax) * 100
          // Offset for chart area within the container (chart is ~52px + 18px labels = ~70px)
          // Y markers map to the SVG area
          return (
            <div
              key={i}
              className="absolute text-[8px] font-medium right-1"
              style={{
                top: `${(pct / 100) * 52}px`,
                color: 'rgba(255,255,255,0.25)',
                transform: 'translateY(-50%)',
              }}
            >
              {v >= 1000 ? `€${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `€${v}`}
            </div>
          )
        })}
      </div>

      {/* Chart SVG */}
      <div className="ml-[42px]">
        <svg viewBox="0 0 100 48" className="w-full h-[52px] mb-1" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(80,200,120,0.25)" />
              <stop offset="100%" stopColor="rgba(80,200,120,0)" />
            </linearGradient>
          </defs>
          {/* Horizontal grid lines */}
          {yMarkers.slice(1, -1).map((v, i) => {
            const y = chartTop + chartHeight - (v / actualYMax) * chartHeight
            return (
              <line
                key={i}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.3"
                strokeDasharray="1,1"
              />
            )
          })}
          <path d={fillPath} fill="url(#heroChartGrad)" />
          <path d={linePath} fill="none" stroke="rgba(80,200,120,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {currentIdx >= 0 && (
            <circle cx={points[currentIdx].x} cy={points[currentIdx].y} r="2.5" fill="rgba(80,200,120,0.9)" />
          )}
        </svg>

        {/* X-axis labels */}
        <div className="relative h-[14px] mb-4">
          {visibleLabels.filter(l => l.show).map((l, i) => (
            <div
              key={i}
              className="absolute text-[7px] font-semibold"
              style={{
                left: `${l.pct}%`,
                transform: 'translateX(-50%)',
                color: l.isCurrent ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.30)',
              }}
            >
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
