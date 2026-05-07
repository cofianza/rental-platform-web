/**
 * CoarrendatarioPropietarioCard — visible para propietario / inmobiliaria /
 * administrador / operador_analista en el resumen del expediente.
 *
 * Muestra a quién invitó el solicitante, en qué estado está la invitación y,
 * si el estudio del coarrendatario ya terminó, su resultado y score.
 *
 * Visibilidad:
 *   - Aparece desde estado='condicionado' en adelante (también en
 *     'aprobado' y 'rechazado' para que quede el rastro de quién acompañó).
 *   - Si nunca se invitó coarrendatario → no se muestra.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'
import { estudioService } from '@/services/estudioService'
import { EstudioDetailModal } from './EstudioDetailModal'
import type { IEstudio } from '@/types/estudio'

interface CoarrendatarioPropietarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
}

const TIPO_DOC_LABEL: Record<string, string> = {
  cc: 'CC',
  ce: 'CE',
  ti: 'TI',
  pasaporte: 'Pasaporte',
  nit: 'NIT',
}

export function CoarrendatarioPropietarioCard({
  expedienteId,
  expedienteEstado,
  userRol,
}: CoarrendatarioPropietarioCardProps) {
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)
  const [estudioFull, setEstudioFull] = useState<IEstudio | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      setCoa(data)
    } catch {
      setCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchCoa() }, [fetchCoa])

  // Polling sutil mientras la invitación está pendiente o el estudio en proceso,
  // para que el propietario vea el avance sin recargar.
  useEffect(() => {
    if (!coa) return
    const enEspera =
      coa.estado === 'pendiente_aceptacion' ||
      (coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado')
    if (!enEspera) return
    const id = setInterval(fetchCoa, 8000)
    return () => clearInterval(id)
  }, [coa, fetchCoa])

  const esRolValido =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  if (loading) return null
  if (!esRolValido) return null
  if (!coa) return null
  // Solo aparece de la fase 'condicionado' en adelante. Mientras el expediente
  // sigue en borrador / en_revision no tiene sentido mostrar al coarrendatario.
  if (
    expedienteEstado !== 'condicionado' &&
    expedienteEstado !== 'aprobado' &&
    expedienteEstado !== 'rechazado' &&
    expedienteEstado !== 'cerrado'
  ) {
    return null
  }

  const handleVerDetalle = async () => {
    if (!coa.estudio_id) return
    setLoadingDetail(true)
    try {
      const full = await estudioService.getEstudioById(coa.estudio_id)
      setEstudioFull(full)
      setShowDetail(true)
    } finally {
      setLoadingDetail(false)
    }
  }

  const tipoLabel = TIPO_DOC_LABEL[coa.tipo_documento] ?? coa.tipo_documento.toUpperCase()
  const fechaInvitacion = formatFecha(coa.created_at)
  const fechaAceptacion = coa.aceptado_at ? formatFecha(coa.aceptado_at) : null

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Co-arrendatario invitado</h3>
            <p className="text-xs text-gray-500">
              El solicitante invitó a esta persona como co-arrendatario para respaldar el arrendamiento.
            </p>
          </div>
        </div>

        {/* Datos del invitado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          <InfoRow label="Nombre" value={`${coa.nombre} ${coa.apellido}`.trim()} />
          <InfoRow label="Documento" value={`${tipoLabel} ${coa.numero_documento}`} />
          <InfoRow label="Email" value={coa.email} />
          <InfoRow label="Teléfono" value={coa.telefono || '—'} />
          <InfoRow label="Invitación enviada" value={fechaInvitacion} />
          {fechaAceptacion && <InfoRow label="Aceptó el" value={fechaAceptacion} />}
        </div>

        {/* Estado de la invitación + estudio */}
        <EstadoBlock coa={coa} />

        {/* Resultado del estudio (cuando ya completó) */}
        {coa.estado === 'estudio_completado' && coa.estudio && (
          <ResultadoEstudioBlock
            estudio={coa.estudio}
            onVerDetalle={handleVerDetalle}
            loadingDetail={loadingDetail}
          />
        )}
      </div>

      <EstudioDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        estudio={estudioFull}
        readOnly={userRol === 'propietario' || userRol === 'inmobiliaria'}
        solicitante={{
          nombre: coa.nombre,
          apellido: coa.apellido,
          tipo_documento: coa.tipo_documento,
          numero_documento: coa.numero_documento,
        }}
      />
    </>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-800 text-right truncate">{value}</span>
    </div>
  )
}

function EstadoBlock({ coa }: { coa: ICoarrendatario }) {
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    pendiente_aceptacion: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Esperando respuesta',
      mensaje: 'La invitación fue enviada por correo. Cuando la persona acepte, dispararemos su estudio crediticio.',
    },
    aceptado: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      mensaje: coa.estudio?.estado === 'en_proceso'
        ? 'Estamos consultando su historial crediticio en TransUnion. Te avisaremos cuando termine.'
        : 'Procesando su estudio crediticio.',
    },
    rechazado_invitacion: {
      color: 'bg-red-50 border-red-200 text-red-900',
      label: 'Declinó la invitación',
      mensaje: 'La persona invitada declinó. El solicitante puede invitar a alguien más.',
    },
    estudio_completado: {
      color: 'bg-gray-50 border-gray-200 text-gray-900',
      label: 'Estudio completado',
      mensaje: 'El estudio del co-arrendatario terminó. Ver resultado abajo.',
    },
  }
  const c = cfg[coa.estado]
  return (
    <div className={`border rounded-md p-3 ${c.color}`}>
      <p className="text-sm font-medium">{c.label}</p>
      <p className="text-xs mt-1 opacity-90">{c.mensaje}</p>
    </div>
  )
}

function ResultadoEstudioBlock({
  estudio,
  onVerDetalle,
  loadingDetail,
}: {
  estudio: NonNullable<ICoarrendatario['estudio']>
  onVerDetalle: () => void
  loadingDetail: boolean
}) {
  const cfg: Record<string, { color: string; label: string }> = {
    aprobado: { color: 'bg-green-50 border-green-200 text-green-900', label: 'Aprobado' },
    condicionado: { color: 'bg-amber-50 border-amber-200 text-amber-900', label: 'Condicionado' },
    rechazado: { color: 'bg-red-50 border-red-200 text-red-900', label: 'Rechazado' },
    pendiente: { color: 'bg-gray-50 border-gray-200 text-gray-900', label: 'Pendiente' },
  }
  const resultado = estudio.resultado || 'pendiente'
  const c = cfg[resultado] ?? cfg.pendiente

  return (
    <div className={`mt-3 border rounded-md p-3 ${c.color}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Resultado del estudio: {c.label}</p>
          {estudio.score !== null && estudio.score !== undefined && (
            <p className="text-xs mt-1 opacity-90">Score: <strong>{estudio.score}</strong></p>
          )}
          {estudio.fecha_completado && (
            <p className="text-xs mt-1 opacity-90">Completado el {formatFecha(estudio.fecha_completado)}</p>
          )}
          {estudio.observaciones && (
            <p className="text-xs mt-2 opacity-90 whitespace-pre-wrap">{estudio.observaciones}</p>
          )}
        </div>
        <button
          onClick={onVerDetalle}
          disabled={loadingDetail}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0"
        >
          {loadingDetail ? 'Cargando…' : 'Ver detalle'}
        </button>
      </div>
    </div>
  )
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
