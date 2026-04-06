/**
 * ScoreGauge
 * Indicador visual semicircular del score CreditVision
 * Rojo (0-399) | Amarillo (400-599) | Verde (600-999)
 */

'use client'

interface ScoreGaugeProps {
  score: number | null | undefined
  resultado?: string
  size?: 'sm' | 'md' | 'lg'
}

const MAX_SCORE = 999

const SIZES = {
  sm: { width: 120, height: 72, fontSize: 'text-lg', labelSize: 'text-xs', strokeWidth: 8, radius: 44 },
  md: { width: 180, height: 108, fontSize: 'text-3xl', labelSize: 'text-sm', strokeWidth: 10, radius: 68 },
  lg: { width: 240, height: 144, fontSize: 'text-4xl', labelSize: 'text-base', strokeWidth: 12, radius: 90 },
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string; label: string } {
  if (score >= 600) return { stroke: '#16a34a', text: 'text-green-600', bg: 'bg-green-50', label: 'Aprobado' }
  if (score >= 400) return { stroke: '#d97706', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Condicionado' }
  return { stroke: '#dc2626', text: 'text-red-600', bg: 'bg-red-50', label: 'Rechazado' }
}

function getResultadoLabel(resultado?: string): string {
  switch (resultado) {
    case 'aprobado': return 'Aprobado'
    case 'rechazado': return 'Rechazado'
    case 'condicionado': return 'Condicionado'
    default: return ''
  }
}

export function ScoreGauge({ score, resultado, size = 'md' }: ScoreGaugeProps) {
  const config = SIZES[size]
  const hasScore = score != null && score >= 0

  if (!hasScore) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: config.width, height: config.height }}
        >
          <svg
            width={config.width}
            height={config.height}
            viewBox={`0 0 ${config.width} ${config.height}`}
          >
            <path
              d={describeArc(config.width / 2, config.height, config.radius, 180, 360)}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className={`${config.fontSize} font-bold text-gray-400`}>N/A</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className={`${config.labelSize} text-gray-500`}>
            {resultado ? getResultadoLabel(resultado) : 'Score no disponible'}
          </span>
        </div>
      </div>
    )
  }

  const colors = getScoreColor(score!)
  const percentage = Math.min(score! / MAX_SCORE, 1)
  const startAngle = 180
  const endAngle = 180 + (percentage * 180)

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: config.width, height: config.height }}
      >
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
        >
          {/* Background arc */}
          <path
            d={describeArc(config.width / 2, config.height, config.radius, 180, 360)}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />
          {/* Score arc */}
          {percentage > 0 && (
            <path
              d={describeArc(config.width / 2, config.height, config.radius, startAngle, endAngle)}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`${config.fontSize} font-bold ${colors.text}`}>
            {score}
          </span>
        </div>
      </div>
      <span className={`${config.labelSize} font-medium ${colors.text} mt-1`}>
        {resultado ? getResultadoLabel(resultado) : colors.label}
      </span>
      {/* Scale labels */}
      {size !== 'sm' && (
        <div className="flex justify-between w-full mt-1 px-1">
          <span className="text-[10px] text-gray-400">0</span>
          <span className="text-[10px] text-gray-400">999</span>
        </div>
      )}
    </div>
  )
}

// ── SVG arc helper ──────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}
