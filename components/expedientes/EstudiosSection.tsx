/**
 * EstudiosSection
 * Lista de estudios de riesgo crediticio en el detalle de expediente
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { documento } from '@/components/contratos/v3/campos'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { IconLoader, IconPlus, IconMail, IconX, IconRefresh, IconClipboardList, IconEye } from '@/components/icons'
import { colorEvaluacion, rotuloEvaluacion } from './EstudioEstadoCard'
import { estudioService } from '@/services/estudioService'
import { creditosEstudiosService } from '@/services/creditosEstudiosService'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { SolicitarEstudioModal } from './SolicitarEstudioModal'
import { EstudioDetailModal } from './EstudioDetailModal'
import { RegistrarResultadoModal } from './RegistrarResultadoModal'
import {
  ReintentarEstudioForm,
  puedeRelanzarEstudio,
  esPendienteDeEjecutar,
} from './ReintentarEstudioForm'
import type { IEstudio, ICreateEstudioInput } from '@/types/estudio'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { textoVisible, esRolInterno, centralDefinida } from './textoVisible'
import { SkeletonTable } from '@/components/ui/Skeleton'

// ============================================
// Constants
// ============================================

const PROVEEDOR_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  sifin: 'SIFIN',
  datacredito: 'DataCrédito',
}

const ESTADOS_FINALIZADOS = ['completado', 'fallido', 'cancelado']
const ESTADOS_PERMITIDOS_RESULTADO = ['solicitado', 'en_proceso']

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Persona evaluada por el estudio. Para tipo='individual' es el titular del
 * expediente (prop solicitante). Para tipo='con_coarrendatario' es el
 * coarrendatario, cuyos datos viajan en estudio.datos_formulario.
 */
function getPersonaEvaluada(
  estudio: IEstudio,
  titular: { nombre: string; apellido: string; tipo_documento?: string | null; numero_documento?: string | null } | null | undefined,
): { nombre: string; apellido?: string | null; tipo_documento?: string | null; numero_documento?: string | null; etiqueta: 'Titular' | 'Coarrendatario' } | null {
  if (estudio.tipo === 'con_coarrendatario') {
    const datos = (estudio.datos_formulario || {}) as {
      nombre_completo?: string
      apellido?: string
      tipo_documento?: string
      numero_documento?: string
    }
    if (!datos.nombre_completo && !datos.numero_documento) return null
    return {
      nombre: (datos.nombre_completo || '').trim(),
      // El apellido capturado en su propio campo al invitar — lo usa el form
      // de reintento para proponer el primer apellido que DataCrédito
      // contrasta contra Registraduría (derivarlo del nombre completo falla
      // con dos nombres o apellidos compuestos).
      apellido: datos.apellido ?? null,
      tipo_documento: datos.tipo_documento ?? null,
      numero_documento: datos.numero_documento ?? null,
      etiqueta: 'Coarrendatario',
    }
  }
  if (!titular) return null
  return {
    nombre: `${titular.nombre} ${titular.apellido}`.trim(),
    apellido: titular.apellido ?? null,
    tipo_documento: titular.tipo_documento ?? null,
    numero_documento: titular.numero_documento ?? null,
    etiqueta: 'Titular',
  }
}

/**
 * Adaptador para EstudioDetailModal: el modal espera nombre/apellido por
 * separado. Para coarrendatario tomamos `nombre_completo` y lo partimos por
 * el primer espacio.
 */
function getSolicitanteParaModal(
  estudio: IEstudio,
  titular: { nombre: string; apellido: string; tipo_documento?: string | null; numero_documento?: string | null } | null | undefined,
): { nombre: string; apellido: string; tipo_documento?: string | null; numero_documento?: string | null } | null | undefined {
  if (estudio.tipo !== 'con_coarrendatario') return titular
  const datos = (estudio.datos_formulario || {}) as {
    nombre_completo?: string
    tipo_documento?: string
    numero_documento?: string
  }
  const completo = (datos.nombre_completo || '').trim()
  if (!completo) return titular
  const idx = completo.indexOf(' ')
  return {
    nombre: idx === -1 ? completo : completo.slice(0, idx),
    apellido: idx === -1 ? '' : completo.slice(idx + 1),
    tipo_documento: datos.tipo_documento ?? null,
    numero_documento: datos.numero_documento ?? null,
  }
}

// ============================================
// Props
// ============================================

interface EstudiosSectionProps {
  expedienteId: string
  /** Solicitante (persona evaluada) — viene del expediente padre y se muestra
   *  en cada card del listado y en el modal de detalle. Opcional para tolerar
   *  contextos donde aun no se cargo. El email prellena el modal de "enviar
   *  enlace" (corregible ahí mismo si estaba mal escrito). */
  solicitante?: {
    nombre: string
    apellido: string
    tipo_documento?: string | null
    numero_documento?: string | null
    email?: string | null
  } | null
  /** Refresca el expediente padre tras cualquier acción sobre una evaluación
   *  (solicitar, cancelar, reintentar, registrar resultado, enviar enlace): el
   *  Resumen queda montado aunque esté oculto y sin esto mostraba lo anterior.
   *  Esta lista se vuelve a pedir sola al subir `version`. */
  onEstudioActualizado?: () => void
  /** P3 y Decisión 2: la evaluación del coarrendatario se reintenta mientras su invitación siga en pie. */
  coarrendatarioVigente?: boolean
  /** Sube con cada «Reevaluar con documentos» del banner: abre el detalle del titular en la apelación. */
  pedidoReevaluar?: number
  /** Ya se abrió el detalle por el pedido: la página lo vuelve a 0 (al volver a la pestaña no se reabre). */
  onPedidoAtendido?: () => void
}

export function EstudiosSection({
  expedienteId,
  solicitante,
  onEstudioActualizado,
  coarrendatarioVigente = true,
  pedidoReevaluar = 0,
  onPedidoAtendido,
}: EstudiosSectionProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const user = useUsuarioVista()
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Propietario/inmobiliaria pueden ver el detalle completo del estudio
  // (TransUnion report) cuando ya esta completado — pagan por el reporte
  // y necesitan evaluar al solicitante. No pueden gestionarlo (cancelar,
  // reenviar enlace, registrar resultado): eso queda gateado a canManage.
  const isStakeholder = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'
  // Gerencia también abre el detalle (el modal le llega en solo lectura).
  const canViewDetail = canManage || isStakeholder || user?.rol === 'gerencia_consulta'
  // El miembro solo lectura ve la evaluación pero no la ejecuta (el API le da 403).
  const puedeEditar = usePuedeEditar()

  const [estudios, setEstudios] = useState<IEstudio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showSolicitar, setShowSolicitar] = useState(false)
  const [showDetail, setShowDetail] = useState<IEstudio | null>(null)
  const [irAReevaluacion, setIrAReevaluacion] = useState(false)
  // El detalle movió la apelación: al cerrarlo se relee el estudio entero (el banner del rechazo cambia).
  const apelacionCambiada = useRef(false)
  const [cancelTarget, setCancelTarget] = useState<IEstudio | null>(null)
  const [resultadoTarget, setResultadoTarget] = useState<IEstudio | null>(null)
  // Enviar enlace: modal con el email visible y corregible ANTES de enviar
  // (antes se enviaba a ciegas y el destino solo se descubría en el toast).
  const [sendLinkTarget, setSendLinkTarget] = useState<IEstudio | null>(null)
  const [sendLinkEmail, setSendLinkEmail] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ============================================
  // Fetch
  // ============================================

  const fetchEstudios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await estudioService.getEstudiosForExpediente(expedienteId)
      setEstudios(res.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar estudios'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchEstudios()
  }, [fetchEstudios, version])

  // Banner del rechazo: abre la evaluación más reciente del titular, ya en la
  // apelación, una sola vez. El pedido vive en la página (esta sección se
  // desmonta al cambiar de pestaña): ella lo vuelve a 0 al atenderlo.
  useEffect(() => {
    if (!pedidoReevaluar) return
    const titular = estudios
      .filter((e) => e.tipo !== 'con_coarrendatario' && e.estado === 'completado' && e.resultado !== 'aprobado')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    if (!titular) return
    onPedidoAtendido?.()
    setShowDetail(titular)
    setIrAReevaluacion(true)
  }, [pedidoReevaluar, estudios, onPedidoAtendido])

  // Tras una acción: con padre, recarga el estudio (y esta lista con él);
  // sin padre, solo la lista.
  const trasCambio = () => (onEstudioActualizado ? onEstudioActualizado() : fetchEstudios())

  // ============================================
  // Actions
  // ============================================

  // Devuelve true/false para que el modal solo se cierre (y resetee sus
  // campos) cuando el POST fue exitoso — si falla, el usuario conserva lo
  // que escribió y puede corregir y reintentar.
  const handleCreate = async (
    data: ICreateEstudioInput,
    { usarCredito }: { usarCredito: boolean },
  ): Promise<boolean> => {
    setActionLoading(true)
    try {
      await estudioService.createEstudio(expedienteId, data)
      if (!usarCredito) {
        toast.success('Evaluación solicitada exitosamente')
      } else {
        // H99: la evaluación ya existe; el crédito se reserva después. Si
        // falla, queda solicitada sin pagar y se cobra desde Pagos.
        try {
          const r = await creditosEstudiosService.liberarEstudio(expedienteId)
          toast.success(
            `Evaluación solicitada y pagada con un cupo de su paquete (le quedan ${r.saldo_restante})`,
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'No se pudo reservar el cupo.'
          toast.warning(`Evaluación solicitada, pero sin pagar: ${msg} Cóbrela desde la sección de pagos.`)
        }
      }
      trasCambio()
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo solicitar la evaluación.'
      toast.error(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setActionLoading(true)
    try {
      await estudioService.cancelEstudio(cancelTarget.id)
      toast.success('Evaluación cancelada')
      setCancelTarget(null)
      trasCambio()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cancelar la evaluación.'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendLink = async () => {
    if (!sendLinkTarget) return
    const email = sendLinkEmail.trim().toLowerCase()
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error('Ingrese un correo válido para enviar el enlace')
      return
    }
    setActionLoading(true)
    try {
      // Solo mandamos el override si difiere del registrado (si cambió, el
      // backend también actualiza el email del solicitante titular).
      const registrado = (solicitante?.email ?? '').toLowerCase()
      const conOverride = email !== registrado
      const res = await estudioService.enviarEnlace(
        sendLinkTarget.id,
        conOverride ? { email } : undefined,
      )
      toast.success(`Enlace enviado a ${res.email_destino}`)
      setSendLinkTarget(null)
      // También refresca `solicitante.email` si se corrigió.
      trasCambio()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar enlace'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  // ============================================
  // Check if there's an active estudio
  // ============================================

  const hasActiveEstudio = estudios.some(
    (e) => !ESTADOS_FINALIZADOS.includes(e.estado),
  )

  // ============================================
  // Render
  // ============================================

  // Solo la primera carga: al refrescar se sigue viendo lo que ya estaba.
  if (loading && estudios.length === 0) {
    return <SkeletonTable filas={2} columnas={4} etiqueta="Cargando evaluaciones…" />
  }

  if (error) {
    return (
      <div role="alert" className="py-8 text-center">
        <p className="mb-3 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={fetchEstudios}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="inline-flex items-center gap-1.5 text-lg font-semibold text-gray-900">
            Evaluaciones crediticias
            <InfoTip texto={AYUDA.evaluaciones} lado="derecha" />
          </h3>
          {canManage && hasActiveEstudio && (
            <p className="mt-1 text-sm text-gray-600">
              Ya hay una evaluación en curso. Para pedir otra, primero termine o cancele la que está activa.
            </p>
          )}
        </div>
        {canManage && estudios.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSolicitar(true)}
            disabled={hasActiveEstudio || actionLoading}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlus size={16} />
            Solicitar evaluación
          </button>
        )}
      </div>

      {/* Empty state */}
      {estudios.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
          <IconClipboardList size={32} className="mx-auto mb-3 text-gray-400" />
          <h4 className="text-base font-semibold text-gray-900">Sin evaluación crediticia</h4>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
            Todavía no hay ninguna evaluación crediticia para este estudio.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowSolicitar(true)}
              disabled={hasActiveEstudio}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconPlus size={16} />
              Solicitar evaluación
            </button>
          )}
        </div>
      )}

      {/* List: una tarjeta por evaluación; el detalle se abre con su botón (antes
          la tarjeta entera era un botón con otros botones adentro). */}
      {estudios.length > 0 && (
        <ul className="space-y-3">
          {estudios.map((estudio) => {
            const persona = getPersonaEvaluada(estudio, solicitante)
            const cancelada = estudio.estado === 'cancelado'
            const motivo =
              textoVisible(estudio.observaciones, { externo: !esRolInterno(user?.rol) }) &&
              (estudio.estado === 'fallido' ||
                estudio.resultado === 'condicionado' ||
                estudio.resultado === 'rechazado')
                ? textoVisible(estudio.observaciones, { externo: !esRolInterno(user?.rol) })
                : null
            const notaInterna = (estudio as IEstudio & { nota_interna?: string | null }).nota_interna
            const gestionable = canManage && !ESTADOS_FINALIZADOS.includes(estudio.estado)
            const puedeRegistrar =
              !estudio.espera_autorizacion &&
              ESTADOS_PERMITIDOS_RESULTADO.includes(estudio.estado) &&
              estudio.resultado === 'pendiente' &&
              (estudio.proveedor === 'manual' || estudio.estado === 'en_proceso' || !!estudio.estudio_padre_id)
            // Esperando el pago o consultando el buró, el enlace sacaría a la
            // evaluación de su estado; y en consulta tampoco se cancela. La
            // reevaluación no lleva formulario: la decide un analista.
            const puedeEnviarFormulario =
              estudio.estado !== 'pago_pendiente' && estudio.estado !== 'en_proceso' && !estudio.estudio_padre_id
            const puedeCancelar = estudio.estado !== 'en_proceso'
            const reintentable =
              (canManage || isStakeholder) &&
              puedeEditar &&
              // La reevaluación no se ejecuta: la API responde 409 (no vuelve a consultar la central).
              !estudio.estudio_padre_id &&
              puedeRelanzarEstudio(estudio) &&
              (coarrendatarioVigente || estudio.tipo !== 'con_coarrendatario')
            const hayAcciones = canViewDetail || (gestionable && (puedeRegistrar || puedeEnviarFormulario || puedeCancelar))

            return (
              <li
                key={estudio.id}
                className={`overflow-hidden rounded-xl border ${cancelada ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="px-4 py-4 sm:px-5">
                  {/* Quién y cómo salió */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`text-base font-semibold ${cancelada ? 'text-gray-600' : 'text-gray-900'}`}>
                          {persona?.nombre || 'Persona evaluada'}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {persona?.etiqueta ?? (estudio.tipo === 'con_coarrendatario' ? 'Coarrendatario' : 'Titular')}
                        </span>
                        {estudio.estudio_padre_id && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            Reevaluación
                          </span>
                        )}
                      </p>
                      {persona?.numero_documento && (
                        <p className="mt-0.5 text-sm text-gray-600">
                          {persona.tipo_documento ? documento(persona.tipo_documento, persona.numero_documento) : persona.numero_documento}
                        </p>
                      )}
                    </div>
                    {/* Una sola pastilla, con el mismo nombre que el Resumen y el detalle. */}
                    <Badge
                      estado={colorEvaluacion(estudio)}
                      label={rotuloEvaluacion(estudio)}
                      className="self-start"
                    />
                  </div>

                  {/* Datos de la solicitud */}
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>Solicitada el {formatDate(estudio.fecha_solicitud || estudio.created_at)}</span>
                    {estudio.duracion_contrato_meses != null && estudio.duracion_contrato_meses > 0 && (
                      <span>Contrato de {estudio.duracion_contrato_meses} meses</span>
                    )}
                    {estudio.solicitado_por && (
                      <span>
                        Por {estudio.solicitado_por.nombre} {estudio.solicitado_por.apellido}
                      </span>
                    )}
                    {esRolInterno(user?.rol) && centralDefinida(estudio) && (
                      <span>Central: {PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor}</span>
                    )}
                    {estudio.score != null && (
                      // Neutro: el puntaje de la central no es el veredicto.
                      <span className="font-medium text-gray-900">
                        Puntaje de la central: <span className="tabular-nums">{estudio.score}</span>
                      </span>
                    )}
                  </p>

                  {/* Motivo del desenlace. Solo se muestra donde el "por qué"
                      cambia lo que el gestor debe hacer: sin score (buró sin
                      información), rechazo, o fallo técnico. En un aprobado
                      las observaciones son solo el detalle del reporte, y el
                      badge + el score ya lo dicen todo. */}
                  {motivo && (
                    <p
                      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                        estudio.estado === 'fallido' || estudio.resultado === 'rechazado'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-amber-50 text-amber-900'
                      }`}
                    >
                      {motivo}
                    </p>
                  )}
                  {/* Nota interna (cifras, umbrales, centrales): la API solo
                      la manda a Cofianza. Las observaciones de arriba son
                      las que ve la inmobiliaria. */}
                  {notaInterna && (
                    <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <span className="font-semibold">Nota interna (solo Cofianza): </span>
                      {notaInterna}
                    </p>
                  )}
                  {/* Adenda 4 V3 §12: retenida por la espera del coarrendatario, la API no la deja decidir. */}
                  {gestionable && estudio.espera_autorizacion && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      La decisión espera al coarrendatario hasta el{' '}
                      {new Date(estudio.espera_autorizacion.hasta).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })}.
                    </p>
                  )}
                </div>

                {/* Estudio fallido (o que no arrancó solo): reintento con el documento
                    corregible aquí mismo. Gestores + dueños: el backend autoriza a
                    ambos en /ejecutar. */}
                {reintentable && (
                  <div className="border-t border-gray-100 px-4 py-4 sm:px-5">
                    <ReintentarEstudioForm
                      key={estudio.id}
                      estudioId={estudio.id}
                      persona={persona}
                      esTitular={persona?.etiqueta !== 'Coarrendatario'}
                      expedienteId={expedienteId}
                      esPrimeraEjecucion={esPendienteDeEjecutar(estudio)}
                      onRetried={trasCambio}
                    />
                  </div>
                )}

                {/* Acciones: el detalle para quien lo puede abrir; la gestión
                    (registrar, enviar formulario, cancelar) solo admin/operador. */}
                {hayAcciones && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
                    {gestionable && puedeRegistrar && (
                      // Cargar el resultado a mano: la evaluación manual, una consulta
                      // que quedó en curso o la reevaluación (apelación), que nace
                      // 'solicitado' con la central del padre y solo se decide aquí.
                      <button
                        type="button"
                        onClick={() => setResultadoTarget(estudio)}
                        disabled={actionLoading}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:opacity-50"
                      >
                        <IconClipboardList size={16} />
                        Registrar resultado
                      </button>
                    )}
                    {canViewDetail && (
                      <button
                        type="button"
                        onClick={() => setShowDetail(estudio)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        <IconEye size={16} />
                        Ver detalle
                      </button>
                    )}
                    {gestionable && puedeEnviarFormulario && (
                      <button
                        type="button"
                        onClick={() => {
                          setSendLinkEmail(solicitante?.email ?? '')
                          setSendLinkTarget(estudio)
                        }}
                        disabled={actionLoading}
                        title="Envía a la persona el enlace del formulario de la evaluación"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                      >
                        <IconMail size={16} />
                        Enviar formulario
                      </button>
                    )}
                    {gestionable && puedeCancelar && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(estudio)}
                        disabled={actionLoading}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 sm:ml-auto"
                      >
                        <IconX size={16} />
                        Cancelar evaluación
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Modals */}
      <SolicitarEstudioModal
        isOpen={showSolicitar}
        onClose={() => setShowSolicitar(false)}
        onConfirmar={handleCreate}
        isLoading={actionLoading}
        expedienteId={expedienteId}
      />

      <EstudioDetailModal
        isOpen={!!showDetail}
        onClose={() => {
          setShowDetail(null)
          setIrAReevaluacion(false)
          // Con la apelación movida (reevaluación nueva, soporte o fecha) la
          // página relee el estudio: el banner del rechazo seguía con el plazo
          // viejo. La lista se relee con él.
          if (apelacionCambiada.current) {
            apelacionCambiada.current = false
            trasCambio()
            return
          }
          // Lo demás que cambia el detalle (certificado, listas) se ve en la
          // lista: se relee en silencio, sin el spinner.
          estudioService.getEstudiosForExpediente(expedienteId).then((r) => setEstudios(r.data), () => undefined)
        }}
        onApelacionCambiada={() => {
          apelacionCambiada.current = true
        }}
        irAReevaluacion={irAReevaluacion}
        estudio={showDetail}
        readOnly={!canManage}
        solicitante={showDetail ? getSolicitanteParaModal(showDetail, solicitante) : solicitante}
      />

      <RegistrarResultadoModal
        isOpen={!!resultadoTarget}
        onClose={() => setResultadoTarget(null)}
        estudio={resultadoTarget}
        expedienteId={expedienteId}
        onSuccess={() => {
          toast.success('Resultado registrado exitosamente')
          setResultadoTarget(null)
          trasCambio()
        }}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancelar evaluación"
        message="¿Seguro que desea cancelar esta evaluación? No se puede deshacer."
        confirmLabel="Cancelar evaluación"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Enviar enlace self-service: el email se ve y se corrige aquí antes
          de enviar (si cambia, el backend actualiza también el solicitante). */}
      <Modal
        isOpen={!!sendLinkTarget}
        onClose={() => setSendLinkTarget(null)}
        title="Enviar enlace al solicitante"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            El solicitante recibirá un enlace para completar su formulario del estudio. Verifique o
            corrija el correo antes de enviar.
          </p>
          <div>
            <label htmlFor="estudios-section-correo-destino" className="block text-xs font-medium text-gray-700 mb-1">Correo destino</label>
            <input id="estudios-section-correo-destino"
              type="email"
              value={sendLinkEmail}
              onChange={(e) => setSendLinkEmail(e.target.value)}
              disabled={actionLoading}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              {sendLinkTarget?.tipo === 'con_coarrendatario'
                ? 'El enlace lo recibe el titular del estudio. Una corrección aquí solo cambia el destino de este envío.'
                : 'Si lo corrige, también se actualiza en los datos del solicitante.'}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSendLinkTarget(null)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendLink}
              disabled={actionLoading || !sendLinkEmail.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50"
            >
              {actionLoading && <IconLoader size={14} className="animate-spin" />}
              Enviar enlace
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
