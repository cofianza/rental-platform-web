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
 *   - Sin coarrendatario, el formulario para invitarlo solo si el API abre la
 *     ventana: en revisión o, desde la Decisión 2 (2026-09-25), aprobado antes
 *     del contrato (prima del 10 %); nunca en el canal del propietario directo
 *     (Decisión 4). Si no, no se muestra.
 *   - Adenda 3 V2 §6.1: también antes de la decisión del titular, si el API
 *     abre la ventana (coarrendatario desde el inicio).
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { toast } from 'sonner'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario, type IVentanaCoarrendatario } from '@/services/coarrendatarioService'
import { estudioService } from '@/services/estudioService'
import { EstudioDetailModal } from './EstudioDetailModal'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { CoarrendatarioReenviarInvitacion } from './CoarrendatarioReenviarInvitacion'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type { IEstudio } from '@/types/estudio'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { IconRefresh, IconUsers } from '@/components/icons'
import { textoVisible, esRolInterno, tipoFallo } from './textoVisible'
import { CONTACTO_COFIANZA_TEXTO } from './ContactoCofianzaInline'

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

/** Antes de que se decida al titular (Adenda 3 V2 §6.1). */
const PREVIOS_A_LA_DECISION = ['borrador', 'en_revision', 'informacion_incompleta']

const TIPO_DOC_LABEL: Record<string, string> = {
  cc: 'CC',
  ce: 'CE',
  ppt: 'PPT',
  pep: 'PEP',
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
  // Primera carga fallida: sin esto se ofrecía invitar aunque ya hubiera uno.
  const [errorCarga, setErrorCarga] = useState(false)
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
      setErrorCarga(false)
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
      if (!coaLoadedRef.current) {
        setCoa(null)
        setErrorCarga(true)
      }
    } finally {
      setLoading(false)
    }
  }, [expedienteId, onEstudioCompletado])

  useEffect(() => { fetchCoa() }, [fetchCoa, version])

  // Si se puede invitar y si la invitación sigue en pie (en revisión, o aprobado
  // antes del contrato). undefined = cargando; null = no se pudo leer (se cae a
  // la regla de antes: solo en revisión).
  const [ventana, setVentana] = useState<IVentanaCoarrendatario | null | undefined>(undefined)
  const fetchVentana = useCallback(() => {
    coarrendatarioService.getVentana(expedienteId).then(setVentana, () => setVentana(null))
  }, [expedienteId])
  const antesDeLaDecision = PREVIOS_A_LA_DECISION.includes(expedienteEstado)
  const ventanaAplica = expedienteEstado === 'condicionado' || expedienteEstado === 'aprobado' || antesDeLaDecision
  useEffect(() => {
    if (ventanaAplica) fetchVentana()
    else setVentana(null)
  }, [fetchVentana, version, ventanaAplica])
  const vigente = ventana?.vigente ?? expedienteEstado === 'condicionado'

  // Polling sutil mientras la invitación está pendiente o la evaluación en
  // proceso, para que el propietario vea el avance sin recargar. Una invitación
  // vencida ya no cambia sola (reenviarla llama a fetchCoa). La evaluación
  // 'fallido' sí se sigue mirando: el reintento se hace en otra tarjeta.
  // Con la pestaña oculta no se consulta.
  useEffect(() => {
    if (!coa) return
    const enEspera =
      (coa.estado === 'pendiente_aceptacion' && !invitacionVencida(coa) && vigente) ||
      (coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado')
    if (!enEspera) return
    const id = setInterval(() => { if (!document.hidden) fetchCoa() }, 8000)
    return () => clearInterval(id)
  }, [coa, fetchCoa, vigente])

  const esRolValido =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  if (loading || ventana === undefined) return null
  if (!esRolValido) return null
  // Aparece de la fase 'condicionado' en adelante y, con el coarrendatario desde
  // el inicio (el API abre la ventana), también antes de decidir al titular.
  if (
    !(antesDeLaDecision && ventana?.vigente) &&
    expedienteEstado !== 'condicionado' &&
    expedienteEstado !== 'aprobado' &&
    expedienteEstado !== 'rechazado' &&
    expedienteEstado !== 'cerrado'
  ) {
    return null
  }
  // Sin coarrendatario aún: el gestor (inmobiliaria / propietario / admin /
  // operador) puede invitarlo directamente — útil cuando es la inmobiliaria la
  // que lleva el expediente. Solo con la ventana abierta (en revisión, o
  // aprobado antes del contrato para bajar la prima al 10 %); si no, no hay
  // nada que mostrar.
  if (!coa && errorCarga) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos cargar el coarrendatario de este estudio.</p>
        <button
          type="button"
          onClick={() => void fetchCoa()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }
  if (!coa) {
    if (!(ventana?.puede_invitar ?? expedienteEstado === 'condicionado') || !puedeEditar) return null
    return (
      <CoarrendatarioInviteForm
        invitar={(input) => coarrendatarioService.invitar(expedienteId, input)}
        audience="gestor"
        aprobado={expedienteEstado === 'aprobado'}
        antesDeLaDecision={antesDeLaDecision}
        onInvited={() => { fetchCoa(); fetchVentana() }}
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
      toast.error('No se pudo abrir el detalle de la evaluación. Intente de nuevo.')
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
            <h3 className="inline-flex items-center gap-1 text-base font-semibold text-gray-900">
              Coarrendatario
              <InfoTip texto={AYUDA.coarrendatario} lado="derecha" />
            </h3>
            <p className="text-xs text-gray-500">
              Persona registrada como coarrendatario en este estudio. Si califica, suma puntaje e ingreso al del solicitante.
            </p>
          </div>
        </div>

        {/* Datos del invitado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          <InfoRow label="Nombre" value={`${coa.nombre} ${coa.apellido}`.trim()} />
          <InfoRow label="Documento" value={`${tipoLabel} ${coa.numero_documento}`} />
          <InfoRow label="Correo" value={coa.email} />
          <InfoRow label="Teléfono" value={coa.telefono || '—'} />
          <InfoRow label="Invitación enviada" value={fechaInvitacion} />
          {fechaAceptacion && <InfoRow label="Aceptó el" value={fechaAceptacion} />}
        </div>

        {/* Estado de la invitación + evaluación */}
        <EstadoBlock coa={coa} sinEfecto={!vigente} antesDeLaDecision={antesDeLaDecision} />

        {/* Invitación pendiente: corregir y reenviar, o cancelar para invitar a
            otra persona (P4). Con la ventana cerrada ya no rige (P3). El key
            remonta el form cuando los datos guardados cambian. */}
        {coa.estado === 'pendiente_aceptacion' && puedeEditar && vigente && (
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
            externo={!esRolInterno(userRol)}
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

function EstadoBlock({ coa, sinEfecto, antesDeLaDecision }: { coa: ICoarrendatario; sinEfecto: boolean; antesDeLaDecision: boolean }) {
  const fallida = coa.estudio?.estado === 'fallido'
  const fallo = coa.estudio ? tipoFallo(coa.estudio) : 'tecnico'
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    // P3: con el estudio ya decidido, la invitación pendiente ya no se puede aceptar.
    pendiente_aceptacion: sinEfecto
      ? {
          color: 'bg-gray-50 border-gray-200 text-gray-900',
          label: 'Invitación sin efecto',
          mensaje: 'El estudio ya se resolvió sin coarrendatario, así que esta invitación ya no se puede aceptar.',
        }
      : invitacionVencida(coa)
      ? {
          color: 'bg-amber-50 border-amber-200 text-amber-900',
          label: 'Invitación vencida',
          mensaje: `Venció el ${formatFecha(coa.token_expiracion)} sin respuesta y el enlace ya no sirve. Reenvíela para que le llegue uno nuevo.`,
        }
      : {
          color: 'bg-blue-50 border-blue-200 text-blue-900',
          label: 'Esperando respuesta',
          mensaje: antesDeLaDecision
            ? 'La invitación fue enviada. Su evaluación corre apenas autorice (con el estudio pagado); si no lo va a hacer, cancele la invitación.'
            : 'La invitación fue enviada por correo. Cuando la persona acepte, dispararemos su evaluación crediticia.',
        },
    aceptado: {
      color: fallida ? 'bg-red-50 border-red-200 text-red-900' : 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      // P2: sin evaluación terminada no entra al contrato ni al certificado.
      mensaje: fallida
        ? fallo !== 'tecnico'
          ? `Su evaluación no se completó: ${fallo === 'no_existe' ? 'la persona no aparece en la central consultada' : 'el primer apellido no coincide con el de la central'}. No es un rechazo; ${
              sinEfecto
                ? 'el estudio ya se resolvió sin él y no entra al contrato ni al certificado.'
                : fallo === 'no_existe'
                  ? `si el documento está mal escrito, comuníquese con Cofianza ${CONTACTO_COFIANZA_TEXTO} para corregirlo.`
                  : 'corrija el primer apellido y vuelva a consultar en el panel «Coarrendatario» de la evaluación crediticia.'
            }`
          : sinEfecto
          ? 'Su evaluación falló por un problema técnico y el estudio ya se resolvió sin él: no entra al contrato ni al certificado.'
          : 'Su evaluación falló por un problema técnico (no es un rechazo). Mientras no se complete no entra al contrato ni al certificado. Reinténtela en el panel «Coarrendatario» de la evaluación crediticia.'
        : coa.estudio?.estado === 'en_proceso'
          ? 'Estamos consultando su historial en las centrales de riesgo. Le avisaremos cuando termine.'
          : coa.estudio?.estado === 'pago_pendiente'
          ? 'Autorizó. Su evaluación corre apenas el estudio esté pagado, y el estudio se decide con los dos.'
          : antesDeLaDecision
          ? 'Autorizó. Su evaluación está por correr, y el estudio se decide con los dos.'
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
      mensaje: 'La evaluación del coarrendatario terminó. Ver resultado abajo.',
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
  externo,
}: {
  estudio: NonNullable<ICoarrendatario['estudio']>
  onVerDetalle: () => void
  loadingDetail: boolean
  externo: boolean
}) {
  const cfg: Record<string, { color: string; label: string }> = {
    // Mismas palabras que la evaluación (Adenda 3 V2 §7): válido, en revisión o no califica.
    aprobado: { color: 'bg-green-50 border-green-200 text-green-900', label: 'Válido' },
    condicionado: { color: 'bg-amber-50 border-amber-200 text-amber-900', label: 'En revisión' },
    rechazado: { color: 'bg-red-50 border-red-200 text-red-900', label: 'No califica' },
    pendiente: { color: 'bg-gray-50 border-gray-200 text-gray-900', label: 'Pendiente' },
  }
  const resultado = estudio.resultado || 'pendiente'
  // Adenda 3 V2 §7: un coarrendatario que no cuenta «no califica»; nunca
  // «rechazado» ni «no aprobable». No tumba el estudio: sigue con el titular.
  const noCalifica = resultado === 'rechazado' && /no califica como coarrendatario/i.test(estudio.observaciones ?? '')
  const c = noCalifica
    ? { color: 'bg-gray-50 border-gray-200 text-gray-900', label: 'No califica' }
    : (cfg[resultado] ?? cfg.pendiente)

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
              {noCalifica
                ? 'No aporta puntos ni ingreso, y el estudio sigue con el titular. No entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.'
                : 'Con este resultado no entra al contrato ni al certificado: la prima es la de firma sin coarrendatario.'}
            </p>
          )}
          {textoVisible(estudio.observaciones, { externo }) && (
            <p className="text-xs mt-2 opacity-90 whitespace-pre-wrap">
              {textoVisible(estudio.observaciones, { externo })}
            </p>
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
