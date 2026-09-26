/**
 * CoarrendatarioCard — visible para el SOLICITANTE cuando su expediente
 * está en estado 'condicionado' o, desde la Decisión 2 (2026-09-25), aprobado
 * y todavía sin contrato: sumar al co-arrendatario baja la prima al 10 %. La
 * ventana la decide el API (en revisión o aprobado antes del contrato, canal de
 * inmobiliaria: Decisión 4).
 *
 * Mario (5-may-2026): nuevo paradigma. Cuando el estudio queda condicionado,
 * en vez de pedir documentos, ofrecemos invitar a un co-arrendatario.
 * Cofianza no pide fiador — pide que pongas a la persona con quien vas
 * a vivir y juntos los respaldamos como un solo arrendatario.
 *
 * El formulario de invitación es compartido (CoarrendatarioInviteForm); aquí
 * decidimos visibilidad y mostramos el estado actual de la invitación.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario, type IVentanaCoarrendatario } from '@/services/coarrendatarioService'
import { autorizacionService } from '@/services/autorizacionService'
import type { IPerfilProspecto } from '@/types/autorizacion'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { CoarrendatarioReenviarInvitacion } from './CoarrendatarioReenviarInvitacion'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { IconUsers } from '@/components/icons'

interface CoarrendatarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onUpdate?: () => void
}

export function CoarrendatarioCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onUpdate,
}: CoarrendatarioCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)

  const coaLoadedRef = useRef(false)
  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      setCoa(data)
      coaLoadedRef.current = true
    } catch {
      // No borrar la card por un error transitorio del polling: solo dejamos
      // null si nunca llegó a cargar.
      if (!coaLoadedRef.current) setCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchCoa() }, [fetchCoa, version])

  // Si se puede invitar y si la invitación sigue en pie. undefined = cargando;
  // null = no se pudo leer (se cae a la regla de antes: solo en revisión).
  const aprobado = expedienteEstado === 'aprobado'
  const [ventana, setVentana] = useState<IVentanaCoarrendatario | null | undefined>(undefined)
  const fetchVentana = useCallback(() => {
    coarrendatarioService.getVentana(expedienteId).then(setVentana, () => setVentana(null))
  }, [expedienteId])
  useEffect(() => {
    if (expedienteEstado === 'condicionado' || aprobado) fetchVentana()
    else setVentana(null)
  }, [fetchVentana, version, expedienteEstado, aprobado])
  const vigente = ventana?.vigente ?? expedienteEstado === 'condicionado'
  const puedeInvitar = ventana?.puede_invitar ?? expedienteEstado === 'condicionado'

  // Al autorizar, el prospecto ya escribió nombre/apellido/correo/WhatsApp de
  // la persona con quien va a vivir, y ahí le prometimos que "no tenía que
  // repetir nada". Sin esto la card llegaba en blanco y le tocaba teclearlo
  // todo de nuevo justo cuando acaba de recibir una mala noticia.
  const [intencion, setIntencion] = useState<IPerfilProspecto['coarrendatario_intencion']>(null)
  const [intencionLista, setIntencionLista] = useState(false)
  const intencionPedidaRef = useRef(false)
  useEffect(() => {
    const aplica = !coa && !loading && ventana !== undefined && puedeInvitar && userRol === 'solicitante'
    if (!aplica) { setIntencionLista(true); return }
    if (intencionPedidaRef.current) return
    intencionPedidaRef.current = true
    autorizacionService
      .getStatus(expedienteId)
      .then((a) => setIntencion(a?.perfil_prospecto?.coarrendatario_intencion ?? null))
      .catch(() => setIntencion(null))
      .finally(() => setIntencionLista(true))
  }, [coa, loading, ventana, puedeInvitar, userRol, expedienteId])

  // Polling sutil mientras está pendiente_aceptacion o aceptado (sin resultado)
  // para que el solicitante vea el cambio sin recargar. Una invitación vencida
  // ya no cambia sola (reenviarla llama a fetchCoa) y con la pestaña oculta no
  // se consulta.
  useEffect(() => {
    if (!coa || !vigente) return
    const enEspera =
      (coa.estado === 'pendiente_aceptacion' && !invitacionVencida(coa)) || coa.estado === 'aceptado'
    if (!enEspera) return
    const id = setInterval(() => { if (!document.hidden) fetchCoa() }, 6000)
    return () => clearInterval(id)
  }, [coa, fetchCoa, vigente])

  // Visibilidad: solicitante con la invitación en pie (en revisión, o aprobado
  // antes del contrato). Ya resuelto, solo para decir que su invitación
  // pendiente quedó sin efecto (P3).
  if (loading || ventana === undefined) return null
  if (userRol !== 'solicitante') return null
  if (!vigente && coa?.estado !== 'pendiente_aceptacion') return null

  // ── Sin coarrendatario: invitar ────────────────────────────────────
  if (!coa) {
    if (!puedeInvitar) return null
    // Esperamos la intención antes de montar el form: sus campos se
    // inicializan una sola vez y llegar tarde equivale a no traerla.
    if (!intencionLista) return null
    // `id`: el aviso de «aprobado» de la evaluación trae un enlace hasta aquí.
    return (
      <div id="coarrendatario" className="scroll-mt-4">
        <CoarrendatarioInviteForm
          invitar={(input) => coarrendatarioService.invitar(expedienteId, input)}
          audience="solicitante"
          initial={intencion}
          aprobado={aprobado}
          onInvited={() => { fetchCoa(); fetchVentana(); onUpdate?.() }}
        />
      </div>
    )
  }

  // ── Con coarrendatario invitado: estado actual ─────────────────────
  return (
    <div id="coarrendatario" className="scroll-mt-4 border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <IconUsers size={20} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Co-arrendatario invitado</h3>
          <p className="text-sm text-gray-700 truncate">
            <strong>{coa.nombre} {coa.apellido}</strong> · {coa.email}
          </p>
        </div>
      </div>

      <EstadoBadge coa={coa} sinEfecto={!vigente} aprobado={aprobado} />

      {/* Invitación pendiente: el solicitante puede corregirla y reenviarla, o
          cancelarla para invitar a otra persona (P4); con el estudio ya
          resuelto no (P3). El key remonta el form cuando los datos cambian. */}
      {coa.estado === 'pendiente_aceptacion' && vigente && (
        <CoarrendatarioReenviarInvitacion
          key={coa.updated_at}
          expedienteId={expedienteId}
          coa={coa}
          onCambio={fetchCoa}
        />
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────

/** El enlace de la invitación expira (7 días); reenviarla renueva la fecha. */
function invitacionVencida(coa: ICoarrendatario): boolean {
  return coa.estado === 'pendiente_aceptacion' && new Date(coa.token_expiracion) < new Date()
}

function EstadoBadge({ coa, sinEfecto, aprobado }: { coa: ICoarrendatario; sinEfecto: boolean; aprobado: boolean }) {
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    pendiente_aceptacion: sinEfecto
      ? {
          color: 'bg-gray-50 border-gray-200 text-gray-900',
          label: 'Invitación sin efecto',
          mensaje: 'Tu estudio ya se resolvió, así que esta invitación ya no se puede aceptar.',
        }
      : invitacionVencida(coa)
      ? {
          color: 'bg-amber-50 border-amber-200 text-amber-900',
          label: 'Invitación vencida',
          mensaje: `Venció el ${new Date(coa.token_expiracion).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} sin respuesta y el enlace ya no sirve. Reenvíala abajo para que le llegue uno nuevo.`,
        }
      : {
          color: 'bg-blue-50 border-blue-200 text-blue-900',
          label: 'Esperando respuesta',
          mensaje: 'Le enviamos la invitación por correo. Te avisaremos cuando responda.',
        },
    aceptado: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      mensaje: aprobado
        ? 'Estamos procesando su evaluación crediticia. Si queda vinculado, la prima de vinculación baja al 10 % del canon; te avisamos por correo.'
        : 'Estamos procesando su evaluación crediticia. Cuando termine, un analista de Cofianza decide tu caso con los dos resultados y te avisamos.',
    },
    rechazado_invitacion: {
      color: 'bg-red-50 border-red-200 text-red-900',
      label: 'Declinó la invitación',
      mensaje: 'La persona declinó. Puedes invitar a alguien más.',
    },
    estudio_completado: {
      color: 'bg-green-50 border-green-200 text-green-900',
      label: 'Evaluación completada',
      // Adenda 2 §5: no hay resultado combinado automático; decide un analista.
      // Sobre un aprobado (Decisión 2) su resultado no es del titular (Ley 1266):
      // solo si quedó vinculado, y eso va por correo.
      mensaje: aprobado
        ? 'La evaluación de tu co-arrendatario terminó y tu estudio sigue aprobado. Te contamos por correo si quedó vinculado y qué prima pagas.'
        : 'La evaluación de tu co-arrendatario terminó. Un analista de Cofianza decide tu caso con los resultados de los dos; te avisamos por notificación y correo.',
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
