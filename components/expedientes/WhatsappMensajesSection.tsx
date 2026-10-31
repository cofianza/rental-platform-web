/**
 * WhatsappMensajesSection — qué pasó con cada WhatsApp del estudio: enviado,
 * entregado, leído o no entregado. El estado lo actualiza el aviso de Meta.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { IconAlertTriangle, IconCheck, IconClock, IconLoader, IconRefresh, IconWhatsapp } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { expedienteService, type IWhatsappMensaje } from '@/services/expedienteService'

const ETIQUETA: Record<string, string> = {
  AUTORIZACION_LINK: 'Enlace de autorización',
  COARRENDATARIO_INVITACION: 'Invitación al coarrendatario',
  COARRENDATARIO_INVITACION_V3: 'Invitación al coarrendatario',
  ESTUDIO_APROBADO: 'Estudio aprobado',
  ESTUDIO_APROBADO_DUENO: 'Estudio aprobado (al dueño)',
  ESTUDIO_RECHAZADO: 'Estudio no aprobado',
  ESTUDIO_CONDICIONADO_DUENO: 'Estudio en revisión (al dueño)',
  ESTUDIO_ESTA_CERCA: 'Está cerca',
  ESTUDIO_ESTA_CERCA_INGRESO: 'Está cerca',
  ESTUDIO_COARRENDATARIO_OBLIGATORIO: 'Necesita un coarrendatario',
  ESTUDIO_BLOQUEADO_DOCUMENTO: 'Estudio detenido por documento',
  PAGO_ESTUDIO_LINK: 'Enlace de pago',
  PAGO_CONFIRMADO: 'Pago confirmado',
  CITA_CONFIRMADA: 'Visita confirmada',
  CITA_REPROGRAMADA: 'Visita reprogramada',
  CITA_CANCELADA: 'Visita cancelada',
  CITA_NOTA_VISITA: 'Nota sobre la visita',
  CITA_SOLICITADA_DUENO: 'Visita solicitada (al dueño)',
  CITA_REPROGRAMADA_DUENO: 'Visita reprogramada (al dueño)',
  CITA_ASISTENCIA_CONFIRMADA_DUENO: 'Asistencia confirmada (al dueño)',
  RESPONSABLE_EXPEDIENTE: 'Responsable asignado',
  NUEVA_SOLICITUD_VITRINA: 'Nueva solicitud',
}

/** El error de Meta llega en inglés: la frase útil va primero y el detalle aparte. */
function motivoFallo(codigo: number | null): string {
  if (codigo === 131026) return 'El número no pudo recibir el mensaje; puede no tener WhatsApp.'
  if (codigo === 131049) return 'Meta limitó la entrega a este número. Use otro canal.'
  if (codigo === 131042) return 'Hay un problema de pago en la cuenta de WhatsApp.'
  if (codigo && codigo >= 132000 && codigo < 133000) return 'La plantilla no está disponible.'
  return 'No se pudo entregar. Contacte a la persona por otro canal.'
}

const ESTADO: Record<IWhatsappMensaje['estado'], { texto: string; clase: string }> = {
  aceptado: { texto: 'En camino', clase: 'text-gray-600' },
  enviado: { texto: 'Enviado', clase: 'text-gray-600' },
  entregado: { texto: 'Entregado', clase: 'text-primary-700' },
  leido: { texto: 'Leído', clase: 'text-primary-700' },
  fallido: { texto: 'No entregado', clase: 'text-red-700' },
}

export function WhatsappMensajesSection({ expedienteId }: { expedienteId: string }) {
  const [mensajes, setMensajes] = useState<IWhatsappMensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setMensajes(await expedienteService.getWhatsappMensajes(expedienteId))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <section className="mb-6 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <IconWhatsapp size={16} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Mensajes de WhatsApp</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <IconLoader size={20} className="animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="p-4 text-center">
          <p className="text-sm text-red-700">No pudimos cargar los mensajes.</p>
          <button
            onClick={cargar}
            className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            <IconRefresh size={14} />
            Reintentar
          </button>
        </div>
      ) : mensajes.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No hay mensajes registrados. Los anteriores a este registro no aparecen aquí.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {mensajes.map((m) => {
            const estado = ESTADO[m.estado]
            const hora = m.fallido_en ?? m.leido_en ?? m.entregado_en ?? m.enviado_en
            return (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                {m.estado === 'fallido' ? (
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
                ) : m.estado === 'leido' || m.estado === 'entregado' ? (
                  <IconCheck size={16} className="mt-0.5 shrink-0 text-primary-600" />
                ) : (
                  <IconClock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{ETIQUETA[m.plantilla ?? ''] ?? 'Mensaje de WhatsApp'}</p>
                  <p className="text-xs text-gray-500">
                    {m.telefono_mascara ? `${m.telefono_mascara} · ` : ''}
                    {formatDateTime(hora)}
                  </p>
                  {m.estado === 'fallido' && (
                    <>
                      <p className="mt-0.5 text-xs text-red-700">{motivoFallo(m.error_codigo)}</p>
                      {(m.error_titulo || m.error_codigo) && (
                        <p className="break-words text-xs text-gray-500">
                          Detalle técnico: {m.error_titulo}
                          {m.error_codigo ? ` (código ${m.error_codigo})` : ''}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
