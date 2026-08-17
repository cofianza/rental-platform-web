/**
 * EstudioEstadoCard — resumen del estado del estudio crediticio para
 * propietario/inmobiliaria/admin/operador en la pestaña Resumen del expediente.
 *
 * Auto-oculto cuando no hay estudio activo. Muestra estado + resultado +
 * proveedor + fecha y CTA al tab Estudios. Mismo patrón visual que la card
 * de cita y de contrato.
 *
 * Para el solicitante existe EstudioSolicitanteCard que es accionable
 * (formulario, polling, reintentos). Esta es solo informativa.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { IconCheck, IconClock } from '@/components/icons'
import { estudioService } from '@/services/estudioService'
import { formatDate } from '@/lib/constants'
import { ReintentarEstudioForm } from './ReintentarEstudioForm'
import type { IEstudio, EstadoEstudio, ResultadoEstudio } from '@/types/estudio'

interface EstudioEstadoCardProps {
  expedienteId: string
  /** Callback para llevar al usuario a la pestaña Estudios. */
  onVerEstudios?: () => void
  /** Rol del usuario actual — para mostrar el botón "Reintentar consulta" a los
   *  gestores (inmobiliaria / propietario / admin / operador) cuando falló. */
  userRol?: string
  /** Datos del solicitante (persona evaluada) para mostrar nombre + cedula
   *  en la card. Viene del expediente padre — opcional para tolerar contextos
   *  donde aun no se cargo. */
  solicitante?: {
    nombre: string
    apellido: string
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
}

// Mapeo estado → label legible. Los estados internos del flujo (pago_pendiente,
// pagado, autorizado, formulario_*, documentos_*) se agrupan para no saturar
// la card; el tab Estudios tiene el detalle fino.
const ESTADO_LABEL: Record<EstadoEstudio, string> = {
  solicitado: 'Solicitado',
  pago_pendiente: 'Pago pendiente',
  pagado: 'Pagado, pendiente autorizacion',
  autorizado: 'Autorizado, pendiente formulario',
  formulario_enviado: 'Esperando datos del solicitante',
  formulario_completado: 'Formulario completado',
  documentos_cargados: 'Documentos cargados',
  en_proceso: 'Consultando buro de credito',
  completado: 'Completado',
  fallido: 'Fallido',
  cancelado: 'Cancelado',
}

const RESULTADO_LABEL: Record<ResultadoEstudio, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  condicionado: 'Condicionado',
}

/**
 * Texto que explica al observador (propietario/inmobiliaria/admin) que falta
 * para que el estudio avance. Cambia segun estado + resultado, y siempre va
 * por encima de los detalles tecnicos en la card.
 */
const BURO_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  datacredito: 'DataCrédito',
  sifin: 'SIFIN',
}

function getSiguientePaso(estudio: IEstudio): string {
  const buro = BURO_LABELS[estudio.proveedor] || 'el buró de crédito'
  if (estudio.estado === 'completado') {
    if (estudio.resultado === 'aprobado') return `Estudio aprobado por ${buro}. Siguiente paso: generar contrato.`
    if (estudio.resultado === 'condicionado') return 'Estudio condicionado. Revisa las observaciones y decide si proceder.'
    if (estudio.resultado === 'rechazado') return 'Estudio rechazado. El expediente no avanza al contrato.'
    return 'Estudio completado, esperando resultado.'
  }
  if (estudio.estado === 'fallido') {
    return `La consulta a ${buro} falló por un problema técnico (no es un rechazo de crédito). Vuelve a intentarla — puedes cambiar de buró en el reintento.`
  }
  if (estudio.estado === 'cancelado') {
    return 'Estudio cancelado.'
  }
  if (estudio.estado === 'en_proceso') {
    return 'Consultando con el buró de crédito. El resultado llega en minutos.'
  }
  if (estudio.estado === 'pago_pendiente' || estudio.estado === 'solicitado') {
    return 'Esperando que el solicitante realice el pago del estudio.'
  }
  if (estudio.estado === 'pagado') {
    return 'Pago recibido. Esperando que el solicitante autorice el tratamiento de datos.'
  }
  if (estudio.estado === 'autorizado') {
    return 'Autorizado. Esperando que el solicitante complete el formulario con sus datos.'
  }
  if (estudio.estado === 'formulario_enviado') {
    return 'Esperando que el solicitante termine de llenar el formulario.'
  }
  if (estudio.estado === 'formulario_completado') {
    return `Formulario listo. El solicitante puede ejecutar la consulta a ${buro} desde su panel.`
  }
  if (estudio.estado === 'documentos_cargados') {
    return 'Documentos cargados. Listo para ejecutar la consulta.'
  }
  return ''
}

// Tono de la card por bloque de progreso. Para 'completado' depende del
// resultado del estudio.
function getTone(estudio: IEstudio) {
  if (estudio.estado === 'completado') {
    if (estudio.resultado === 'aprobado') return 'success'
    if (estudio.resultado === 'condicionado') return 'warning'
    if (estudio.resultado === 'rechazado') return 'danger'
    return 'progress'
  }
  if (estudio.estado === 'fallido') return 'danger'
  if (estudio.estado === 'cancelado') return 'muted'
  if (estudio.estado === 'en_proceso') return 'progress'
  return 'pending'
}

const TONE_STYLES: Record<string, { card: string; icon: string; pill: string }> = {
  success: {
    card: 'bg-green-50 border-green-200',
    icon: 'bg-green-100 text-green-600',
    pill: 'bg-white text-green-700 border-green-200',
  },
  warning: {
    card: 'bg-amber-50 border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    pill: 'bg-white text-amber-700 border-amber-200',
  },
  danger: {
    card: 'bg-red-50 border-red-200',
    icon: 'bg-red-100 text-red-600',
    pill: 'bg-white text-red-700 border-red-200',
  },
  progress: {
    card: 'bg-blue-50 border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    pill: 'bg-white text-blue-700 border-blue-200',
  },
  pending: {
    card: 'bg-gray-50 border-gray-200',
    icon: 'bg-gray-100 text-gray-600',
    pill: 'bg-white text-gray-700 border-gray-200',
  },
  muted: {
    card: 'bg-gray-50 border-gray-200',
    icon: 'bg-gray-100 text-gray-500',
    pill: 'bg-white text-gray-600 border-gray-200',
  },
}

export function EstudioEstadoCard({ expedienteId, onVerEstudios, userRol, solicitante }: EstudioEstadoCardProps) {
  // Guardamos hasta 2 estudios: el del titular (tipo='individual') y el del
  // coarrendatario (tipo='con_coarrendatario'). Cuando existen los dos, los
  // mostramos en paneles separados para que cada uno muestre los datos y el
  // resultado de la persona correcta — antes el card pintaba la cedula del
  // titular sobre el score del coarrendatario y se confundian.
  const [estudioTitular, setEstudioTitular] = useState<IEstudio | null>(null)
  const [estudioCoa, setEstudioCoa] = useState<IEstudio | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEstudios = useCallback(async () => {
    try {
      const res = await estudioService.getEstudiosForExpediente(expedienteId, 1, 10)
      const activos = res.data.filter((e) => e.estado !== 'cancelado')
      const candidatos = activos.length > 0 ? activos : res.data

      const masReciente = (lista: IEstudio[]) =>
        lista
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          ?? null

      setEstudioTitular(masReciente(candidatos.filter((e) => e.tipo !== 'con_coarrendatario')))
      setEstudioCoa(masReciente(candidatos.filter((e) => e.tipo === 'con_coarrendatario')))
    } catch {
      setEstudioTitular(null)
      setEstudioCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchEstudios() }, [fetchEstudios])

  // Polling suave mientras alguno este en_proceso para que el propietario vea
  // el resultado en cuanto entre, sin recargar la pagina.
  useEffect(() => {
    const enProceso = estudioTitular?.estado === 'en_proceso' || estudioCoa?.estado === 'en_proceso'
    if (!enProceso) return
    const id = setInterval(fetchEstudios, 8000)
    return () => clearInterval(id)
  }, [estudioTitular?.estado, estudioCoa?.estado, fetchEstudios])

  if (loading) return null
  if (!estudioTitular && !estudioCoa) return null

  const titularSolicitante = solicitante ?? null
  const coaSolicitante = estudioCoa ? getCoarrendatarioFromEstudio(estudioCoa) : null

  return (
    <div className="space-y-3">
      {estudioTitular && (
        <EstudioPanel
          estudio={estudioTitular}
          etiqueta="Titular"
          persona={titularSolicitante}
          onVerEstudios={onVerEstudios}
          userRol={userRol}
          onRetried={fetchEstudios}
        />
      )}
      {estudioCoa && (
        <EstudioPanel
          estudio={estudioCoa}
          etiqueta="Co-arrendatario"
          persona={coaSolicitante}
          onVerEstudios={onVerEstudios}
          userRol={userRol}
          onRetried={fetchEstudios}
        />
      )}
    </div>
  )
}

// ── Panel individual (titular o coarrendatario) ────────────────────

interface EstudioPanelProps {
  estudio: IEstudio
  etiqueta: 'Titular' | 'Co-arrendatario'
  persona: {
    nombre: string
    apellido?: string
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
  onVerEstudios?: () => void
  userRol?: string
  onRetried?: () => void
}

function EstudioPanel({ estudio, etiqueta, persona, onVerEstudios, userRol, onRetried }: EstudioPanelProps) {
  const esGestor =
    userRol === 'inmobiliaria' ||
    userRol === 'propietario' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'
  const puedeReintentar = esGestor && estudio.estado === 'fallido'

  const tone = getTone(estudio)
  const styles = TONE_STYLES[tone]
  const estadoLabel = ESTADO_LABEL[estudio.estado] ?? estudio.estado
  const resultadoLabel =
    estudio.estado === 'completado' ? RESULTADO_LABEL[estudio.resultado] : null

  const iconNode = estudio.estado === 'en_proceso' || estudio.estado === 'pago_pendiente'
    ? <IconClock size={16} />
    : <IconCheck size={16} />

  const siguientePaso = getSiguientePaso(estudio)
  const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido ?? ''}`.trim() : ''

  return (
    <div className={`border rounded-lg p-4 ${styles.card}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Estudio crediticio
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
            etiqueta === 'Co-arrendatario'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-primary-50 text-primary-700 border-primary-200'
          }`}
        >
          {etiqueta}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.icon}`}>
          {iconNode}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles.pill}`}>
              {estadoLabel}
            </span>
            {resultadoLabel && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles.pill}`}>
                {resultadoLabel}
              </span>
            )}
          </div>

          {siguientePaso && (
            <p className="text-sm text-gray-800 font-medium mb-2">{siguientePaso}</p>
          )}

          {/* Motivo real del fallo. El texto de arriba es genérico para
              cualquier error; el backend guarda en `observaciones` la causa
              concreta (documento no encontrado, apellido que no coincide con
              Registraduría, buró caído…). Sin esto había que ir a la base de
              datos para saber qué corregir. */}
          {estudio.estado === 'fallido' && estudio.observaciones && (
            <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
              {estudio.observaciones}
            </p>
          )}

          <div className="space-y-0.5 text-sm">
            {persona && (
              <p className="text-xs text-gray-600">
                Evaluado: <span className="font-medium text-gray-800">{nombreCompleto}</span>
                {persona.numero_documento && (
                  <>
                    {' · '}
                    {persona.tipo_documento ? `${persona.tipo_documento} ` : ''}
                    <span className="font-medium text-gray-800">{persona.numero_documento}</span>
                  </>
                )}
              </p>
            )}
            <p className="text-xs text-gray-600">
              Proveedor: <span className="font-medium text-gray-800">{BURO_LABELS[estudio.proveedor] || estudio.proveedor}</span>
              {' · '}
              Tipo: <span className="font-medium text-gray-800">{estudio.tipo === 'con_coarrendatario' ? 'con coarrendatario' : 'individual'}</span>
            </p>
            <p className="text-xs text-gray-600">
              Solicitado: {formatDate(estudio.fecha_solicitud)}
              {estudio.fecha_completado ? ` · Completado: ${formatDate(estudio.fecha_completado)}` : ''}
            </p>
            {typeof estudio.score === 'number' && estudio.score > 0 && (
              <p className="text-xs text-gray-700">
                Score: <span className="font-semibold">{estudio.score}</span>
              </p>
            )}
            {estudio.motivo_rechazo && (
              <p className="text-xs text-red-700 mt-1" title={estudio.motivo_rechazo}>
                Motivo: <span className="font-medium">{estudio.motivo_rechazo}</span>
              </p>
            )}
            {estudio.condiciones && (
              <p className="text-xs text-amber-700 mt-1" title={estudio.condiciones}>
                Condiciones: <span className="font-medium">{estudio.condiciones}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {(puedeReintentar || onVerEstudios) && (
        <div className="mt-3 pt-3 border-t border-gray-200/60 space-y-3">
          {puedeReintentar && (
            <ReintentarEstudioForm
              // key: el form inicializa su estado de forma lazy, así que sin
              // esto la preselección de buró/documento quedaría del estudio
              // anterior al cambiar de estudio o de buró.
              key={`${estudio.id}:${estudio.proveedor}`}
              estudioId={estudio.id}
              proveedorActual={estudio.proveedor}
              persona={persona}
              esTitular={etiqueta === 'Titular'}
              onRetried={onRetried}
            />
          )}
          {onVerEstudios && (
            <button
              type="button"
              onClick={onVerEstudios}
              className="text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              Ver detalle del estudio →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Para estudios tipo='con_coarrendatario' los datos de la persona evaluada
 * viajan en `datos_formulario` (los escribe el backend al disparar el estudio
 * tras la aceptacion). Mismo patron que EstudiosSection.
 */
function getCoarrendatarioFromEstudio(
  estudio: IEstudio,
): { nombre: string; apellido?: string; tipo_documento?: string | null; numero_documento?: string | null } | null {
  const datos = (estudio.datos_formulario || {}) as {
    nombre_completo?: string
    tipo_documento?: string
    numero_documento?: string
  }
  const completo = (datos.nombre_completo || '').trim()
  if (!completo && !datos.numero_documento) return null
  const idx = completo.indexOf(' ')
  return {
    nombre: idx === -1 ? completo : completo.slice(0, idx),
    apellido: idx === -1 ? '' : completo.slice(idx + 1),
    tipo_documento: datos.tipo_documento ?? null,
    numero_documento: datos.numero_documento ?? null,
  }
}
