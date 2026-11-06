/**
 * ContratoEstadoCard — resumen del estado del contrato para propietario/
 * inmobiliaria/admin/operador en la pestaña Resumen del expediente.
 *
 * Auto-oculto cuando no hay contrato (en ese caso AccionContratoPendienteCard
 * cubre el "siguiente paso"). Cuando hay contrato muestra estado, version,
 * archivo y fechas clave + CTA para abrir la pestaña Contratos, con el mismo
 * marco que las demás tarjetas del Resumen (TarjetaSiguientePaso).
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconAlertTriangle, IconArrowRight, IconCheck, IconClock, IconHistory, IconRefresh } from '@/components/icons'
import { TarjetaSiguientePaso, SeccionPaso, type TonoPaso } from './TarjetaSiguientePaso'
import { cn } from '@/lib/utils'
import { contratoService } from '@/services/contratoService'
import { etiquetaContrato, formatDate } from '@/lib/constants'
import { useUsuarioVista } from '@/components/expedientes/VerComo'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type { IContrato } from '@/types/contrato'
import type { ICierreSinActa } from '@/types/expediente'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'

interface ContratoEstadoCardProps {
  expedienteId: string
  /** Callback para llevar al usuario a la pestaña Contratos. Si no se pasa,
   *  no se renderiza el CTA — la card queda informativa. */
  onVerContratos?: () => void
  /** Adenda 1 contratos (respuesta 21): un administrador cerró el estudio sin acta. */
  cierreSinActa?: ICierreSinActa | null
}

// Prioridad para escoger el contrato representativo si hay varios.
// Mismo orden que ContratoSolicitanteCard para que ambas vistas coincidan.
const PRIORIDAD: Record<string, number> = {
  vigente: 5,
  firmado: 4,
  pendiente_firma: 3,
  firma_incompleta: 3,
  aprobado: 2,
  en_revision: 1,
  borrador: 1,
  cancelado: 0,
  finalizado: 0,
}

export function ContratoEstadoCard({ expedienteId, onVerContratos, cierreSinActa }: ContratoEstadoCardProps) {
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const rol = useUsuarioVista()?.rol
  // Solo lectura (y Gerencia) ven el contrato, pero no cargan el acta ni reenvían la firma.
  const puedeEditar = usePuedeEditar()
  const cargaActa = rol === 'inmobiliaria' && puedeEditar
  const [contrato, setContrato] = useState<IContrato | null>(null)
  // V3 §12.1: fianza activa o terminada sin acta de entrega e inventario cargada.
  const [actaPendiente, setActaPendiente] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const cargadoRef = useRef(false)

  const fetchContrato = useCallback(async () => {
    try {
      // Los mismos parámetros que ExpedienteProgressBar: al montar, las dos comparten una petición.
      const res = await contratoService.getContratosForExpediente(expedienteId, { limit: 20 })
      const ordered = [...res.data].sort((a, b) => {
        const p = (PRIORIDAD[b.estado] ?? 0) - (PRIORIDAD[a.estado] ?? 0)
        if (p !== 0) return p
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      const elegido = ordered[0] ?? null
      setContrato(elegido)
      cargadoRef.current = true
      setErrorCarga(false)
      if (elegido?.destinacion && (elegido.estado === 'vigente' || elegido.estado === 'finalizado')) {
        const archivos = await contratoService.listarArchivos(elegido.id).catch(() => null)
        setActaPendiente(!!archivos && !archivos.some((a) => a.tipo_archivo === 'acta_entrega'))
      } else {
        setActaPendiente(false)
      }
    } catch {
      // Un refresco que falla no borra la tarjeta; sin ninguna carga, se avisa.
      if (!cargadoRef.current) {
        setContrato(null)
        setErrorCarga(true)
      }
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchContrato() }, [fetchContrato, version])

  if (loading) return null
  if (!contrato && errorCarga) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos cargar el contrato de este estudio.</p>
        <button
          type="button"
          onClick={() => void fetchContrato()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }
  if (!contrato) return null

  const isFinal = contrato.estado === 'vigente' || contrato.estado === 'firmado'
  const isInactivo = contrato.estado === 'cancelado' || contrato.estado === 'finalizado'
  // V3: la firma venció o la rechazaron; la fianza no opera hasta reenviarla.
  const isIncompleta = contrato.estado === 'firma_incompleta'
  // V3 (asistente): se identifica por su número y se abre en el asistente; versión y archivo son del flujo anterior.
  const esV3 = !!contrato.destinacion
  const etiqueta = etiquetaContrato(contrato.estado, esV3)

  // Mismo marco que las demás tarjetas del Resumen: el color dice en qué está.
  const tono: TonoPaso = isFinal ? 'accion' : isInactivo ? 'neutro' : isIncompleta ? 'alerta' : 'revision'
  const icono = isIncompleta ? <IconAlertTriangle size={18} /> : isInactivo ? <IconHistory size={18} /> : isFinal ? <IconCheck size={18} /> : <IconClock size={18} />

  // Firma incompleta: resolverla es lo que toca a quien gestiona (botón principal). En firma,
  // el botón dice a qué se entra: el estado de cada firmante está en el contrato.
  const claseAccion = isIncompleta && puedeEditar ? BOTON_PRINCIPAL : BOTON
  const textoAccion =
    contrato.estado === 'borrador'
      ? 'Continuar el contrato'
      : isIncompleta && puedeEditar
        ? 'Abrir el contrato para resolverlo'
        : contrato.estado === 'pendiente_firma'
          ? 'Ver quién falta por firmar'
          : esV3
            ? 'Ver el contrato'
            : 'Ver detalle del contrato'
  const accion = esV3 ? (
    <Link href={`/expedientes/${expedienteId}/contrato`} className={claseAccion}>
      {textoAccion}
      <IconArrowRight size={16} />
    </Link>
  ) : onVerContratos ? (
    <button type="button" onClick={onVerContratos} className={claseAccion}>
      {textoAccion}
      <IconArrowRight size={16} />
    </button>
  ) : null

  return (
    <TarjetaSiguientePaso
      tono={tono}
      icono={icono}
      titulo={
        <span className="inline-flex flex-wrap items-center gap-x-1">
          Contrato: {etiqueta}
          <InfoTip texto={AYUDA.contrato} lado="derecha" />
        </span>
      }
    >
      <div className="px-4 py-4 sm:px-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {esV3 ? (
            contrato.numero && <Dato etiqueta="Número">{contrato.numero}</Dato>
          ) : (
            <Dato etiqueta="Versión">{contrato.version}</Dato>
          )}
          {!esV3 && contrato.nombre_archivo && (
            <Dato etiqueta="Archivo">
              <span className="block truncate" title={contrato.nombre_archivo}>{contrato.nombre_archivo}</span>
            </Dato>
          )}
          {contrato.fecha_inicio && (
            <Dato etiqueta="Inicio">
              {formatDate(contrato.fecha_inicio)}
              {contrato.duracion_meses ? ` · ${contrato.duracion_meses} meses` : ''}
            </Dato>
          )}
          {contrato.fecha_firma && <Dato etiqueta="Firmado">{formatDate(contrato.fecha_firma)}</Dato>}
          {contrato.motivo_cancelacion && (
            <Dato etiqueta="Motivo" className="sm:col-span-2">{contrato.motivo_cancelacion}</Dato>
          )}
        </dl>
        {accion && <div className="mt-4">{accion}</div>}
      </div>
      {cierreSinActa ? (
        <SeccionPaso titulo="Cerrado sin acta de entrega">
          <p>
            Lo cerró {cierreSinActa.porNombre ?? 'un administrador de Cofianza'} el {formatDate(cierreSinActa.en)}. Motivo:{' '}
            {cierreSinActa.motivo}
          </p>
        </SeccionPaso>
      ) : (
        actaPendiente && (
          // Adenda 1 contratos (respuesta 21): el acta la carga la inmobiliaria, nunca Cofianza.
          <SeccionPaso
            titulo="Falta el acta de entrega e inventario"
            propio={cargaActa}
            icono={cargaActa ? <IconArrowRight size={16} /> : <IconAlertTriangle size={16} className="text-amber-700" />}
          >
            {cargaActa ? (
              <>
                <p>Sin ella no se puede cerrar el estudio.</p>
                <Link href={`/expedientes/${expedienteId}/contrato`} className={BOTON}>
                  Cargarla
                  <IconArrowRight size={16} />
                </Link>
              </>
            ) : (
              <p>
                {rol === 'inmobiliaria' ? 'La carga alguien de su equipo con permiso de edición.' : 'La carga la inmobiliaria.'}
                {rol === 'administrador'
                  ? ' Si no la va a cargar, puede cerrar el estudio sin acta desde «Cambiar estado».'
                  : ' Sin ella no se puede cerrar el estudio.'}
              </p>
            )}
          </SeccionPaso>
        )
      )}
    </TarjetaSiguientePaso>
  )
}

const BOTON =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1'

const BOTON_PRINCIPAL =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1'

function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-gray-600">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{children}</dd>
    </div>
  )
}
