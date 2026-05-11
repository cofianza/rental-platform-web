/**
 * Auditoria de score — visible solo para rol='administrador'.
 *
 * Muestra el reporte que devuelve GET /expedientes/:id/auditoria-score:
 * compara la decision del sistema sobre el estudio crediticio con la
 * politica oficial (POLITICA DE EVALUACION Y APROBACION POR SCORE).
 *
 * Como hoy el sistema solo evalua el factor "Score externo" (modelo
 * v0.1), el reporte muestra explicitamente los 5 factores pendientes
 * para que sea claro que la auditoria es parcial.
 */

'use client'

import { useEffect, useState } from 'react'
import { expedienteService, type IAuditoriaScoreReporte } from '@/services/expedienteService'
import { IconLoader, IconCheck, IconX, IconAlertTriangle } from '@/components/icons'

interface AuditoriaScoreCardProps {
  expedienteId: string
}

const DECISION_LABEL: Record<string, string> = {
  aprobado_automatico: 'Aprobado automático',
  revision_manual: 'Revisión manual',
  rechazado: 'Rechazado',
  aprobado: 'Aprobado',
  condicionado: 'Condicionado',
  pendiente: 'Pendiente',
}

export function AuditoriaScoreCard({ expedienteId }: AuditoriaScoreCardProps) {
  const [data, setData] = useState<IAuditoriaScoreReporte | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    expedienteService
      .getAuditoriaScore(expedienteId)
      .then((r) => setData(r))
      .catch((err) => {
        // Si no hay estudio aun, ocultamos la card en lugar de mostrar error.
        const msg = err instanceof Error ? err.message : 'Error al cargar auditoría'
        if (msg.toLowerCase().includes('no hay estudios') || msg.toLowerCase().includes('estudio_not_found')) {
          setData(null)
          setError(null)
        } else {
          setError(msg)
        }
      })
      .finally(() => setLoading(false))
  }, [expedienteId])

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <IconLoader size={16} className="animate-spin" />
          Cargando auditoría…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
        <p className="text-sm text-red-700">No se pudo cargar la auditoría: {error}</p>
      </div>
    )
  }

  if (!data) return null

  const cumplio = data.cumplimiento.coincide
  const score = data.scoreExterno.valor

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Solo administrador
            </span>
            <span className="text-xs text-gray-500">Modelo v{data.modelo.version}</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Auditoría de score</h3>
          <p className="text-xs text-gray-500 mt-1">
            Compara la decisión del sistema con la POLÍTICA DE EVALUACIÓN Y APROBACIÓN POR SCORE.
          </p>
        </div>
        <CumplimientoBadge ok={cumplio} />
      </div>

      {/* Resumen comparativo */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-200">
        <ResumenItem
          label="Score externo"
          valor={score !== null ? `${score} pts` : 'N/A'}
          sub={data.scoreExterno.rango ? `Rango ${data.scoreExterno.rango.etiqueta}` : null}
        />
        <ResumenItem
          label="Decisión política"
          valor={DECISION_LABEL[data.decisionPolitica.resultado]}
          sub="según política oficial"
        />
        <ResumenItem
          label="Decisión sistema"
          valor={DECISION_LABEL[data.decisionSistema.resultado]}
          sub="aplicada por la plataforma"
        />
      </div>

      {/* Observación de cumplimiento */}
      <div className={`px-6 py-4 border-b border-gray-200 ${cumplio ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-start gap-2">
          {cumplio ? (
            <IconCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
          ) : (
            <IconAlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          )}
          <p className={`text-xs ${cumplio ? 'text-green-800' : 'text-amber-800'}`}>
            {data.cumplimiento.observacion}
          </p>
        </div>
      </div>

      {/* Regla dura */}
      {!data.scoreExterno.cumple_regla_dura && data.scoreExterno.motivo_regla_dura && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <IconX size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800">
              <strong>Regla dura activada:</strong> {data.scoreExterno.motivo_regla_dura}
            </p>
          </div>
        </div>
      )}

      {/* Detalle de la decisión política */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          ¿Qué dice la política?
        </h4>
        <p className="text-sm text-gray-700">{data.decisionPolitica.explicacion}</p>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Lógica del sistema:</strong> {data.decisionSistema.logica_aplicada}
        </p>
      </div>

      {/* Factores de la política */}
      <div className="px-6 py-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Factores evaluados (suma total 100 pts)
        </h4>
        <div className="space-y-2">
          {data.factores.map((f) => (
            <FactorRow key={f.id} factor={f} />
          ))}
        </div>
      </div>

      {/* Nota final */}
      <div className="px-6 py-3 bg-slate-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Nota:</strong> {data.modelo.nota}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Referencia: <code className="font-mono">{data.modelo.referencia_politica}</code>
        </p>
      </div>
    </div>
  )
}

// ============================================================
// Subcomponentes
// ============================================================

function CumplimientoBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${
        ok
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {ok ? <IconCheck size={12} /> : <IconAlertTriangle size={12} />}
      {ok ? 'Cumple política' : 'Revisar gap'}
    </span>
  )
}

function ResumenItem({
  label,
  valor,
  sub,
}: {
  label: string
  valor: string
  sub?: string | null
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{valor}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function FactorRow({ factor }: { factor: import('@/services/expedienteService').IAuditoriaFactor }) {
  const capturado = factor.capturado
  return (
    <div
      className={`border rounded-md p-3 ${
        capturado ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {capturado ? (
            <IconCheck size={14} className="text-green-600 shrink-0" />
          ) : (
            <IconAlertTriangle size={14} className="text-gray-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-800 truncate">{factor.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {capturado && factor.puntos !== null && (
            <span className="text-sm font-semibold text-gray-700">
              {factor.puntos} / {factor.maximo} pts
            </span>
          )}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              capturado
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {capturado ? 'Capturado' : 'Pendiente'}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{factor.detalle}</p>
    </div>
  )
}
