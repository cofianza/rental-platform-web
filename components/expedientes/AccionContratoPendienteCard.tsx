/**
 * AccionContratoPendienteCard — señaliza al propietario/inmobiliaria/admin/operador
 * cuando un expediente está aprobado pero aún no tiene contrato generado.
 *
 * El propietario captura aquí la duración del contrato y la fecha de inicio.
 * Al hacer clic, el backend genera el contrato y queda en 'borrador' listo
 * para enviar a firma desde la pestaña Contratos.
 *
 * Flujo: estudio aprobado por el buró → expediente queda en 'aprobado'
 * SIN contrato (el orchestrator ya no lo auto-genera, decisión Mario
 * 5-may-2026) → este card pide los datos y dispara la generación.
 *
 * Contratos V3 (Entrega 3): con `contratosV3` (flag del API + inmueble de una
 * inmobiliaria) el card no abre el modal: lleva al asistente
 * /expedientes/:id/contrato, y si ya hay un borrador V3 ofrece "Continuar"
 * en vez de ocultarse. Sin el flag, todo queda como antes.
 */

'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { contratoService } from '@/services/contratoService'
import { buttonClasses } from '@/components/ui/Button'
import { IconAlertTriangle, IconArrowRight, IconFileText, IconLoader } from '@/components/icons'
import type { IContrato } from '@/types/contrato'
import { GenerarContratoModal } from './GenerarContratoModal'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'

interface AccionContratoPendienteCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /** El contrato se crea con el asistente V3 (viene del detalle del expediente). */
  contratosV3?: boolean
  /** El contrato de otro estudio reservó el inmueble: no hay contrato que crear aquí por ahora. */
  inmuebleReservadoPorOtro?: boolean
  /** Inmueble de una inmobiliaria: el modal pide su comisión (P12). */
  conComision?: boolean
  onGenerated?: () => void
}

export function AccionContratoPendienteCard({
  expedienteId,
  expedienteEstado,
  userRol,
  contratosV3,
  inmuebleReservadoPorOtro,
  conComision,
  onGenerated,
}: AccionContratoPendienteCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [loading, setLoading] = useState(true)
  // Contrato vivo más reciente (null = ninguno). Antes bastaba un booleano; V3
  // necesita saber si es su borrador para ofrecer "Continuar".
  const [activo, setActivo] = useState<IContrato | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchContratos = useCallback(async () => {
    try {
      const res = await contratoService.getContratosForExpediente(expedienteId, { page: 1, limit: 1 })
      const activos = (res.data || []).filter((c) => c.estado !== 'cancelado')
      setActivo(activos[0] ?? null)
    } catch {
      setActivo(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContratos() }, [fetchContratos, version])

  // Solo relevante cuando el expediente está APROBADO y no hay contrato aún.
  // En 'condicionado' se muestra AprobarCondicionadoCard, no este card.
  if (loading) return null
  if (expedienteEstado !== 'aprobado') return null

  // V3: el asistente es de admin/operador/inmobiliaria (el API no deja entrar
  // al propietario); el propietario ve el card informativo de abajo.
  const puedeCrearV3 =
    contratosV3 &&
    (userRol === 'administrador' || userRol === 'operador_analista' || userRol === 'inmobiliaria')
  // El borrador V3 no oculta el card: es la puerta para retomarlo.
  const borradorV3 = contratosV3 && activo?.destinacion && activo.estado === 'borrador' ? activo : null
  if (activo && !(puedeCrearV3 && borradorV3)) return null

  if (puedeCrearV3 && inmuebleReservadoPorOtro && !borradorV3) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="mb-0.5 text-sm font-semibold text-amber-900">El inmueble está reservado para otro estudio</p>
            <p className="text-sm text-amber-800">
              Otro estudio ya inició el contrato de este inmueble. Si ese contrato se cancela, el inmueble vuelve a quedar
              disponible y podrás crear el de este estudio.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (puedeCrearV3) {
    return (
      <CardAccion
        titulo={borradorV3 ? `Contrato ${borradorV3.numero ?? ''} en borrador` : 'Acción requerida: crear el contrato'}
        texto={
          borradorV3
            ? 'Continúa el asistente para completar los datos y generar la vista previa del contrato.'
            : 'El estudio está aprobado. Crea el contrato de vivienda con el asistente.'
        }
      >
        <Link href={`/expedientes/${expedienteId}/contrato`} className={buttonClasses('primary', 'md', 'shadow-sm')}>
          {borradorV3 ? 'Continuar' : 'Crear contrato'}
          <IconArrowRight size={16} />
        </Link>
      </CardAccion>
    )
  }

  const puedeGenerar =
    !contratosV3 && (
      userRol === 'administrador' ||
      userRol === 'operador_analista' ||
      userRol === 'inmobiliaria' ||
      userRol === 'propietario'
    )

  if (puedeGenerar) {
    return (
      <>
        <CardAccion
          titulo="Acción requerida: generar contrato"
          texto="El estudio está aprobado. Genera el contrato definiendo la fecha de inicio, la duración, la modalidad de fianza y quién paga los servicios públicos."
        >
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            Generar contrato
            <IconArrowRight size={16} />
          </button>
        </CardAccion>
        <GenerarContratoModal
          isOpen={modalOpen}
          expedienteId={expedienteId}
          conComision={conComision}
          onClose={() => setModalOpen(false)}
          onGenerated={() => {
            setModalOpen(false)
            fetchContratos()
            onGenerated?.()
          }}
        />
      </>
    )
  }

  // Otros roles (solicitante, gerencia_consulta) — informativo.
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <IconLoader size={20} className="text-blue-700 shrink-0 mt-0.5 animate-spin" />
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-0.5">Esperando generación del contrato</p>
          <p className="text-sm text-blue-800">
            El estudio del solicitante fue aprobado. La inmobiliaria o el operador de Cofianza están preparando el contrato — recibirás una notificación cuando esté listo.
          </p>
        </div>
      </div>
    </div>
  )
}

function CardAccion({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="border-2 border-primary-300 bg-primary-50/50 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <IconFileText size={20} className="text-primary-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">{titulo}</h3>
          <p className="text-sm text-gray-600 mb-3">{texto}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
