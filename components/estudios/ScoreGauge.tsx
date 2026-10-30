/**
 * ScoreGauge
 * Indicador visual semicircular del puntaje de la central de riesgo (0-999).
 * Neutro: el puntaje de la central no es el veredicto (un 773 puede salir no
 * aprobable por mora). Qué papel tienen los cortes de la Adenda 2 §2 (sin
 * cifras) solo se le explica a Cofianza (`leyenda`); a la inmobiliaria no (Política §2).
 */

'use client'

import { IconInfo } from '@/components/icons'

interface ScoreGaugeProps {
  score: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  /** Solo Cofianza: qué papel tiene el puntaje de la central (Adenda 2 §2), sin cifras. */
  leyenda?: boolean
}

const MAX_SCORE = 999
const COLOR_ARCO = '#047857'

const SIZES = {
  sm: { width: 120, height: 72, fontSize: 'text-lg', labelSize: 'text-xs', strokeWidth: 8, radius: 44 },
  md: { width: 180, height: 108, fontSize: 'text-3xl', labelSize: 'text-sm', strokeWidth: 10, radius: 68 },
  lg: { width: 240, height: 144, fontSize: 'text-4xl', labelSize: 'text-base', strokeWidth: 12, radius: 90 },
}

export function ScoreGauge({ score, size = 'md', leyenda = false }: ScoreGaugeProps) {
  const config = SIZES[size]
  const hasScore = score != null && score >= 0
  const percentage = hasScore ? Math.min(score / MAX_SCORE, 1) : 0

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
              d={describeArc(config.width / 2, config.height, config.radius, 180, 180 + percentage * 180)}
              fill="none"
              stroke={COLOR_ARCO}
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`${config.fontSize} font-bold ${hasScore ? 'text-primary-700' : 'text-gray-500'}`}>
            {hasScore ? score : '—'}
          </span>
        </div>
      </div>
      {hasScore ? (
        <span className={`${config.labelSize} text-gray-600 mt-1`}>
          Puntaje de la central de riesgo · {score} de {MAX_SCORE}
        </span>
      ) : (
        <div className="flex items-center gap-1.5 mt-1">
          <IconInfo size={14} className="text-gray-500" />
          <span className={`${config.labelSize} text-gray-500`}>Sin puntaje de la central</span>
        </div>
      )}
      {leyenda && (
        <p className="mt-1 text-center text-[11px] text-gray-500">
          {/* X9: sin cortes escritos a mano (los fija la Política y pueden cambiar). */}
          El puntaje de la central es una entrada más: por debajo del mínimo se rechaza y en la franja media va a revisión.
        </p>
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
