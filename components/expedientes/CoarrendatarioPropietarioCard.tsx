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

import { toast } from 'sonner'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'
import { estudioService } from '@/services/estudioService'
import { EstudioDetailModal } from './EstudioDetailModal'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { CoarrendatarioReenviarInvitacion } from './CoarrendatarioReenviarInvitacion'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type { IEstudio } from '@/types/estudio'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { IconUsers } from '@/components/icons'

interface CoarrendatarioPropietarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /**
   * Se dispara cuando el estudio del coarrendatario COMPLETA: la ponderación
   * del backend puede haber movido el expediente a aprobado/rechazado solo,
   * y sin refrescar al padre la página seguiría ofreciendo "Aprobar
   * expediente" sobre un estado que ya no existe (400 al pulsarlo).
   */
  onEstudioCompletado?: () => void
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
  onEstudioCompletado,
}: CoarrendatarioPropietarioCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)
  const [estudioFull, setEstudioFull] = useState<IEstudio | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Gerencia y el miembro 'solo_lectura' entran aquí con rol 'inmobiliaria':
  // ven la card (es lectura) pero no las acciones, que el API les niega.
  const puedeEditar = usePuedeEditar()

  const coaLoadedRef = useRef(false)
  // Detecta la transición a estudio completado UNA vez, para avisar al padre.
  const estudioCompletadoNotificadoRef = useRef(false)
  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      const primeraCarga = !coaLoadedRef.current
      setCoa(data)
      coaLoadedRef.current = true
      if (data?.estudio?.estado === 'completado' && !estudioCompletadoNotificadoRef.current) {
        estudioCompletadoNotificadoRef.current = true
        // Solo si se completó MIENTRAS se miraba (polling). Si ya venía completado,
        // el padre ya tiene el dato: avisarle lo recargaba, esta tarjeta se volvía
        // a montar y avisaba otra vez → recargas sin fin.
        if (!primeraCarga) onEstudioCompletado?.()
      }
    } catch {
      // No borrar la card por un error transitorio del polling (502 / red
      // móvil): solo la dejamos en null si nunca llegó a cargar.
      if (!coaLoadedRef.current) setCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId, onEstudioCompletado])

  useEffect(() => { fetchCoa() }, [fetchCoa, version])

  // Polling sutil mientras la invitación está pendiente o la evaluación en
  // proceso, para que el propietario vea el avance sin recargar. Una invitación
  // vencida ya no cambia sola (reenviarla llama a fetchCoa). La evaluación
  // 'fallido' sí se sigue mirando: el reintento se hace en otra tarjeta.
  // Con la pestaña oculta no se consulta.
  useEffect(() => {
    if (!coa) return
    const enEspera =
      (coa.estado === 'pendiente_aceptacion' && !invitacionVencida(coa) && expedienteEstado === 'condicionado') ||
      (coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado')
    if (!enEspera) return
    const id = setInterval(() => { if (!document.hidden) fetchCoa() }, 8000)
    return () => clearInterval(id)
  }, [coa, fetchCoa, expedienteEstado])

  const esRolValido =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  if (loading) return null
  if (!esRolValido) return null
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
  // Sin co-arrendatario aún: el gestor (inmobiliaria / propietario / admin /
  // operador) puede invitarlo directamente — útil cuando es la inmobiliaria la
  // que lleva el expediente. Solo mientras está condicionado; en estados
  // posteriores sin co-arrendatario, no hay nada que mostrar.
  if (!coa) {
    if (expedienteEstado !== 'condicionado' || !puedeEditar) return null
    return (
      <CoarrendatarioInviteForm
        invitar={(input) => coarrendatarioService.invitar(expedienteId, input)}
        audience="gestor"
        onInvited={fetchCoa}
      />
    )
  }

  const handleVerDetalle = async () => {
    if (!coa.estudio_id) return
    setLoadingDetail(true)
    try {
      const full = await estudioService.getEstudioById(coa.estudio_id)
      setEstudioFull(full)
      setShowDetail(true)
    } catch {
      // Aqui no habia ni catch: el error subia y el boton quedaba girando.
      toast.error('No se pudo abrir el detalle de la evaluación. Intenta de nuevo.')
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
            <IconUsers size={20} className="text-primary-700" />
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

        {/* Estado de la invitación + evaluación */}
        <EstadoBlock coa={coa} sinEfecto={expedienteEstado !== 'condicionado'} />

        {/* Invitación pendiente: corregir y reenviar, o cancelar para invitar a
            otra persona (P4). Fuera de condicionado ya no rige (P3). El key
            remonta el form cuando los datos guardados cambian. */}
        {coa.estado === 'pendiente_aceptacion' && puedeEditar && expedienteEstado === 'condicionado' && (
          <CoarrendatarioReenviarInvitacion
            key={coa.updated_at}
            expedienteId={expedienteId}
            coa={coa}
            onCambio={fetchCoa}
          />
        )}

        {/* Resultado del estudio: lo mostramos en cuanto el estudio embebido
            terminó ('completado'), sin depender de que el campo coa.estado haya
            ganado la carrera contra la transición del expediente. */}
        {coa.estudio && coa.estudio.estado === 'completado' && (
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

function EstadoBlock({ coa, sinEfecto }: { coa: ICoarrendatario; sinEfecto: boolean }) {
  const fallida = coa.estudio?.estado === 'fallido'
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    // P3: con el estudio ya decidido, la invitación pendiente ya no se puede aceptar.
    pendiente_aceptacion: sinEfecto
      ? {
          color: 'bg-gray-50 border-gray-200 text-gray-900',
          label: 'Invitación sin efecto',
          mensaje: 'El estudio ya no está en revisión, así que esta invitación ya no se puede aceptar.',
        }
      : invitacionVencida(coa)
      ? {
          color: 'bg-amber-50 border-amber-200 text-amber-900',
          label: 'Invitación vencida',
          mensaje: `Venció el ${formatFecha(coa.token_expiracion)} sin respuesta y el enlace ya no sirve. Reenvíala para que le llegue uno nuevo.`,
        }
      : {
          color: 'bg-blue-50 border-blue-200 text-blue-900',
          label: 'Esperando respuesta',
          mensaje: 'La invitación fue enviada por correo. Cuando la persona acepte, dispararemos su evaluación crediticia.',
        },
    aceptado: {
      color: fallida ? 'bg-red-50 border-red-200 text-red-900' : 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      mensaje: fallida
        ? 'Su evaluación falló por un problema técnico (no es un rechazo). Reinténtala en el panel «Co-arrendatario» de la evaluación, aquí abajo.'
        : coa.estudio?.estado === 'en_proceso'
          ? 'Estamos consultando su historial en las centrales de riesgo. Te avisaremos cuando termine.'
          : 'Procesando su evaluación crediticia.',
    },
    rechazado_invitacion: {
      color: 'bg-red-50 border-red-200 text-red-900',
      label: 'Declinó la invitación',
      mensaje: 'La persona invitada declinó. El solicitante puede invitar a alguien más.',
    },
    estudio_completado: {
      color: 'bg-gray-50 border-gray-200 text-gray-900',
      label: 'Evaluación completada',
      mensaje: 'La evaluación del co-arrendatario terminó. Ver resultado abajo.',
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
    rechazado: { color: 'bg-red-50 border-red-200 text-red-900', label: 'No aprobable' },
    pendiente: { color: 'bg-gray-50 border-gray-200 text-gray-900', label: 'Pendiente' },
  }
  const resultado = estudio.resultado || 'pendiente'
  const c = cfg[resultado] ?? cfg.pendiente

  return (
    <div className={`mt-3 border rounded-md p-3 ${c.color}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Resultado de la evaluación: {c.label}</p>
          {estudio.score !== null && estudio.score !== undefined && (
            <p className="text-xs mt-1 opacity-90">Score: <strong>{estudio.score}</strong></p>
          )}
          {estudio.fecha_completado && (
            <p className="text-xs mt-1 opacity-90">Completado el {formatFecha(estudio.fecha_completado)}</p>
          )}
          {/* P2: solo cuenta con la evaluación terminada y no rechazada. */}
          {resultado === 'rechazado' && (
            <p className="text-xs mt-1 font-medium">
              Con este resultado no entra al contrato ni al certificado: la prima es la de firma sin co-arrendatario.
            </p>
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

/** El enlace de la invitación expira (7 días); reenviarla renueva la fecha. */
function invitacionVencida(coa: ICoarrendatario): boolean {
  return coa.estado === 'pendiente_aceptacion' && new Date(coa.token_expiracion) < new Date()
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
