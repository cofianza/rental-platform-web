/**
 * EstudiosSection
 * Lista de estudios de riesgo crediticio en el detalle de expediente
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { IconLoader, IconPlus, IconMail, IconX, IconRefresh, IconClipboardList } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { useAuthStore } from '@/stores/auth.store'
import { SolicitarEstudioModal } from './SolicitarEstudioModal'
import { EstudioDetailModal } from './EstudioDetailModal'
import { RegistrarResultadoModal } from './RegistrarResultadoModal'
import {
  ReintentarEstudioForm,
  puedeRelanzarEstudio,
  esCondicionadoSinInfo,
} from './ReintentarEstudioForm'
import type { IEstudio, ICreateEstudioInput } from '@/types/estudio'

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
 * co-arrendatario, cuyos datos viajan en estudio.datos_formulario.
 */
function getPersonaEvaluada(
  estudio: IEstudio,
  titular: { nombre: string; apellido: string; tipo_documento?: string | null; numero_documento?: string | null } | null | undefined,
): { nombre: string; apellido?: string | null; tipo_documento?: string | null; numero_documento?: string | null; etiqueta: 'Titular' | 'Co-arrendatario' } | null {
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
      etiqueta: 'Co-arrendatario',
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
  /** Refresca el expediente padre cuando el email del solicitante se corrigió
   *  desde el modal de enviar enlace (evita que el prop quede desactualizado). */
  onContactoActualizado?: () => void
}

export function EstudiosSection({ expedienteId, solicitante, onContactoActualizado }: EstudiosSectionProps) {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.rol === 'administrador' || user?.rol === 'operador_analista'
  // Propietario/inmobiliaria pueden ver el detalle completo del estudio
  // (TransUnion report) cuando ya esta completado — pagan por el reporte
  // y necesitan evaluar al solicitante. No pueden gestionarlo (cancelar,
  // reenviar enlace, registrar resultado): eso queda gateado a canManage.
  const isStakeholder = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'
  const canViewDetail = canManage || isStakeholder

  const [estudios, setEstudios] = useState<IEstudio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showSolicitar, setShowSolicitar] = useState(false)
  const [showDetail, setShowDetail] = useState<IEstudio | null>(null)
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
  }, [fetchEstudios])

  // ============================================
  // Actions
  // ============================================

  // Devuelve true/false para que el modal solo se cierre (y resetee sus
  // campos) cuando el POST fue exitoso — si falla, el usuario conserva lo
  // que escribió y puede corregir y reintentar.
  const handleCreate = async (data: ICreateEstudioInput): Promise<boolean> => {
    setActionLoading(true)
    try {
      await estudioService.createEstudio(expedienteId, data)
      toast.success('Estudio solicitado exitosamente')
      await fetchEstudios()
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar estudio'
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
      toast.success('Estudio cancelado')
      setCancelTarget(null)
      await fetchEstudios()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar estudio'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendLink = async () => {
    if (!sendLinkTarget) return
    const email = sendLinkEmail.trim().toLowerCase()
    if (!email || !/.+@.+\..+/.test(email)) {
      toast.error('Ingresa un correo válido para enviar el enlace')
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
      await fetchEstudios()
      // Si se corrigió el email, refrescar el expediente padre para que el
      // prop `solicitante.email` no quede desactualizado.
      if (conOverride) onContactoActualizado?.()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button
          onClick={fetchEstudios}
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Estudios de Riesgo Crediticio
        </h3>
        {canManage && (
          <button
            onClick={() => setShowSolicitar(true)}
            disabled={hasActiveEstudio || actionLoading}
            title={hasActiveEstudio ? 'Ya existe un estudio activo' : undefined}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconPlus size={16} />
            Solicitar estudio
          </button>
        )}
      </div>

      {/* Empty state */}
      {estudios.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <IconClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No hay estudios de riesgo
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No hay estudios de riesgo crediticio para este expediente.
          </p>
          {canManage && (
            <button
              onClick={() => setShowSolicitar(true)}
              disabled={hasActiveEstudio}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus size={16} />
              Solicitar estudio
            </button>
          )}
        </div>
      )}

      {/* List */}
      {estudios.length > 0 && (
        <div className="space-y-3">
          {estudios.map((estudio) => {
            const cardClickable = canViewDetail
            const persona = getPersonaEvaluada(estudio, solicitante)
            return (
              <div
                key={estudio.id}
                onClick={cardClickable ? () => setShowDetail(estudio) : undefined}
                role={cardClickable ? 'button' : undefined}
                tabIndex={cardClickable ? 0 : undefined}
                onKeyDown={
                  cardClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setShowDetail(estudio)
                        }
                      }
                    : undefined
                }
                className={`border border-gray-200 rounded-lg p-4 transition-colors ${
                  cardClickable ? 'hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer' : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          estudio.proveedor === 'transunion'
                            ? 'bg-blue-100 text-blue-700'
                            : estudio.proveedor === 'manual'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {PROVEEDOR_LABELS[estudio.proveedor] || estudio.proveedor}
                      </span>
                      <Badge estado={estudio.estado} />
                      <Badge estado={estudio.resultado} />
                      {persona?.etiqueta === 'Co-arrendatario' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Co-arrendatario
                        </span>
                      )}
                    </div>
                    {persona && (
                      <div className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">{persona.nombre}</span>
                        {persona.numero_documento && (
                          <span className="text-gray-500">
                            {' · '}
                            {persona.tipo_documento ? `${persona.tipo_documento} ` : ''}
                            {persona.numero_documento}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 space-x-3">
                      <span>{formatDate(estudio.fecha_solicitud || estudio.created_at)}</span>
                      {estudio.duracion_contrato_meses != null && estudio.duracion_contrato_meses > 0 && (
                        <span>{estudio.duracion_contrato_meses} meses</span>
                      )}
                      {estudio.solicitado_por && (
                        <span>
                          por {estudio.solicitado_por.nombre} {estudio.solicitado_por.apellido}
                        </span>
                      )}
                    </div>
                    {estudio.score != null && (
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            estudio.score >= 600
                              ? 'bg-green-100 text-green-700'
                              : estudio.score >= 400
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          Score: {estudio.score}
                        </span>
                      </div>
                    )}
                    {/* Motivo del desenlace. Solo se muestra donde el "por qué"
                        cambia lo que el gestor debe hacer: sin score (buró sin
                        información), rechazo, o fallo técnico. En un aprobado
                        las observaciones son solo el detalle del reporte, y el
                        badge + el score ya lo dicen todo. */}
                    {estudio.observaciones &&
                      (estudio.estado === 'fallido' ||
                        estudio.resultado === 'condicionado' ||
                        estudio.resultado === 'rechazado') && (
                        <p
                          className={`mt-2 text-xs rounded-lg border px-2.5 py-1.5 ${
                            estudio.estado === 'fallido' || estudio.resultado === 'rechazado'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          {estudio.observaciones}
                        </p>
                      )}
                  </div>

                  {/* Actions — solo gestion (admin/operador). El click "ver detalle"
                      ahora es la card entera. stopPropagation evita disparar el
                      modal de detalle al accionar sobre estos botones. */}
                  {canManage && !ESTADOS_FINALIZADOS.includes(estudio.estado) && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ESTADOS_PERMITIDOS_RESULTADO.includes(estudio.estado) && estudio.resultado === 'pendiente' && (
                        <button
                          onClick={() => setResultadoTarget(estudio)}
                          disabled={actionLoading}
                          title="Registrar resultado"
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        >
                          <IconClipboardList size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSendLinkEmail(solicitante?.email ?? '')
                          setSendLinkTarget(estudio)
                        }}
                        disabled={actionLoading}
                        title="Enviar enlace al solicitante"
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                      >
                        <IconMail size={18} />
                      </button>
                      <button
                        onClick={() => setCancelTarget(estudio)}
                        disabled={actionLoading}
                        title="Cancelar estudio"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <IconX size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Estudio fallido: reintento con el documento corregible aquí
                    mismo (antes este tab no ofrecía NINGUNA salida — el form
                    solo existía en la card del resumen). Gestores + dueños:
                    el backend autoriza a ambos en /ejecutar. stopPropagation
                    para no abrir el modal de detalle al interactuar. */}
                {(canManage || isStakeholder) && puedeRelanzarEstudio(estudio) && (
                  <div
                    className="mt-3"
                    onClick={(e) => e.stopPropagation()}
                    // Sin esto, Enter/Espacio dentro de los inputs burbujea al
                    // onKeyDown de la card y abre el modal de detalle.
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ReintentarEstudioForm
                      key={`${estudio.id}:${estudio.proveedor}`}
                      estudioId={estudio.id}
                      proveedorActual={estudio.proveedor}
                      persona={persona}
                      esTitular={persona?.etiqueta !== 'Co-arrendatario'}
                      esReconsulta={esCondicionadoSinInfo(estudio)}
                      onRetried={fetchEstudios}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <SolicitarEstudioModal
        isOpen={showSolicitar}
        onClose={() => setShowSolicitar(false)}
        onConfirmar={handleCreate}
        isLoading={actionLoading}
      />

      <EstudioDetailModal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        estudio={showDetail}
        readOnly={!canManage}
        solicitante={showDetail ? getSolicitanteParaModal(showDetail, solicitante) : solicitante}
      />

      <RegistrarResultadoModal
        isOpen={!!resultadoTarget}
        onClose={() => setResultadoTarget(null)}
        estudio={resultadoTarget}
        onSuccess={() => {
          toast.success('Resultado registrado exitosamente')
          setResultadoTarget(null)
          fetchEstudios()
        }}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancelar estudio"
        message="Esta seguro que desea cancelar este estudio? Esta accion no se puede deshacer."
        confirmLabel="Cancelar estudio"
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
            El solicitante recibirá un enlace para completar su formulario del estudio. Verifica o
            corrige el correo antes de enviar.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Correo destino</label>
            <input
              type="email"
              value={sendLinkEmail}
              onChange={(e) => setSendLinkEmail(e.target.value)}
              disabled={actionLoading}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              {sendLinkTarget?.tipo === 'con_coarrendatario'
                ? 'El enlace lo recibe el titular del expediente. Una corrección aquí solo cambia el destino de este envío.'
                : 'Si lo corriges, también se actualiza en los datos del solicitante.'}
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
