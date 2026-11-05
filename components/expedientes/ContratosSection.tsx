'use client'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDownload,
  IconEye,
  IconFileText,
  IconHistory,
  IconLoader,
  IconMail,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconX,
} from '@/components/icons'
import { GenerarContratoModal } from './GenerarContratoModal'
import { ContratoTransicionModal } from './ContratoTransicionModal'
import { FirmaSolicitudesSection } from './FirmaSolicitudesSection'
import { FirmantesContratoSection } from './FirmantesContratoSection'
import { EnviarFirmaPreviewModal } from './EnviarFirmaPreviewModal'
import { RegenerarContratoModal } from '@/components/contratos/RegenerarContratoModal'
import { BloqueosContrato, bloqueoDeEvaluacion } from '@/components/contratos/v3/BloqueosContrato'
import { contratoService } from '@/services/contratoService'
import { buttonClasses } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { etiquetaContrato, formatDate, formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { IContrato, EstadoContrato } from '@/types/contrato'
import type { IFirmantesPreview } from '@/types/firma'
import type { Bloqueo } from '@/types/contratoV3'
import { SkeletonTable } from '@/components/ui/Skeleton'

const TERMINAL_STATES: EstadoContrato[] = ['finalizado', 'cancelado']

// Estados anteriores al envío a firma. A nivel de módulo (antes se redeclaraba
// dentro del componente) porque también decide qué acciones ve el dueño.
const ESTADOS_PRE_FIRMA: EstadoContrato[] = ['borrador', 'en_revision', 'aprobado']

// Marca de cada estado: círculo + pastilla, con la misma paleta corta que
// Documentos (gris, ámbar, azul, verde, rojo). Antes eran nueve colores.
const MARCA_CONTRATO: Record<EstadoContrato, { circulo: string; chip: string; icono: React.ReactNode }> = {
  borrador: { circulo: 'bg-gray-100 text-gray-600', chip: 'bg-gray-100 text-gray-700', icono: <IconFileText size={16} /> },
  en_revision: { circulo: 'bg-amber-100 text-amber-800', chip: 'bg-amber-100 text-amber-900', icono: <IconClock size={16} /> },
  aprobado: { circulo: 'bg-amber-100 text-amber-800', chip: 'bg-amber-100 text-amber-900', icono: <IconCheck size={16} /> },
  pendiente_firma: { circulo: 'bg-blue-100 text-blue-700', chip: 'bg-blue-100 text-blue-800', icono: <IconPencil size={16} /> },
  firma_incompleta: { circulo: 'bg-red-100 text-red-700', chip: 'bg-red-100 text-red-800', icono: <IconAlertTriangle size={16} /> },
  firmado: { circulo: 'bg-green-100 text-green-700', chip: 'bg-green-100 text-green-800', icono: <IconCheck size={16} /> },
  vigente: { circulo: 'bg-green-100 text-green-700', chip: 'bg-green-100 text-green-800', icono: <IconShieldCheck size={16} /> },
  finalizado: { circulo: 'bg-gray-100 text-gray-600', chip: 'bg-gray-100 text-gray-700', icono: <IconHistory size={16} /> },
  cancelado: { circulo: 'bg-gray-100 text-gray-500', chip: 'bg-gray-100 text-gray-700', icono: <IconX size={16} /> },
}

// El mismo botón de fila que Documentos: 40 px de alto, con texto.
const BOTON_FILA =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const BOTON_SECUNDARIO = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
const BOTON_PRINCIPAL = 'bg-primary-700 text-white hover:bg-primary-800'

interface ContratosSectionProps {
  expedienteId: string
  /** Estado del expediente — el contrato solo se genera tras la aprobación. */
  expedienteEstado?: string
  /** Se dispara cuando un contrato cambia (se genera, se regenera, se envía a
   *  firma, cambia de estado o firman todas las partes), para que el padre
   *  re-consulte el EXPEDIENTE: el Resumen (montado aunque esté oculto) y el
   *  stepper leen los contratos, y el estado puede pasar a 'cerrado'. */
  onContratoActualizado?: () => void
  /** Contratos V3: el contrato se crea y edita en el asistente
   *  (/expedientes/:id/contrato), no con GenerarContratoModal. */
  contratosV3?: boolean
  /** Estudio sin propiedad: no hay contrato hasta vincular el inmueble. */
  sinInmueble?: boolean
  /** El contrato de otro estudio reservó el inmueble: no se ofrece "Crear contrato". */
  inmuebleReservadoPorOtro?: boolean
  /** Inmueble de una inmobiliaria: el modal pide su comisión (P12). */
  conComision?: boolean
}

export function ContratosSection({
  expedienteId,
  expedienteEstado,
  onContratoActualizado,
  contratosV3,
  sinInmueble = false,
  inmuebleReservadoPorOtro,
  conComision,
}: ContratosSectionProps) {
  const { user } = useAuth()

  const [contratos, setContratos] = useState<IContrato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [generarOpen, setGenerarOpen] = useState(false)
  const [transicionContrato, setTransicionContrato] = useState<IContrato | null>(null)
  const [transicionesDisponibles, setTransicionesDisponibles] = useState<Array<{ estado: EstadoContrato; label: string }>>([])
  const [morasActivasTransicion, setMorasActivasTransicion] = useState(0)
  const [transicionLoading, setTransicionLoading] = useState(false)

  // Action loading
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  // 4.1e: contrato abierto en el editor controlado (fecha/plazo/canon/servicios).
  const [regenerarTarget, setRegenerarTarget] = useState<IContrato | null>(null)
  const [firmaContratoId, setFirmaContratoId] = useState<string | null>(null)
  // null = aún sin saber; true/false lo reporta FirmantesContratoSection. Si hay
  // firmantes multi-parte, ocultamos la sección legacy "Solicitudes de Firma".
  const [tieneMultiparte, setTieneMultiparte] = useState<boolean | null>(null)
  const [enviandoFirmaId, setEnviandoFirmaId] = useState<string | null>(null)
  const [confirmFirma, setConfirmFirma] = useState<IContrato | null>(null)
  // 4.3: pre-chequeo de firmantes antes de enviar (modal con los números + bloqueo si hay repetido).
  const [firmaPreview, setFirmaPreview] = useState<{ contrato: IContrato; data: IFirmantesPreview } | null>(null)
  const [confirmandoFirma, setConfirmandoFirma] = useState(false)
  // Flujo anterior: un borrador enviado a firma sin CRC suficiente (días 57-60 de
  // la evaluación o después) no tiene arreglo aquí; la salida es un estudio nuevo.
  const [evaluacionVencida, setEvaluacionVencida] = useState<Bloqueo | null>(null)

  // Permissions
  // El contrato se genera automaticamente al aprobar el estudio (orchestrator).
  // Admin/operador/inmobiliaria pueden generar manualmente como fallback
  // (la inmobiliaria es el arrendador y necesita poder disparar la generacion
  // si el orchestrator fallo). Propietario individual solo puede regenerar.
  const puedeEditar = usePuedeEditar()
  // Mismo defecto que en contratos/[id]: el miembro 'solo_lectura' entra con
  // rol 'inmobiliaria'. Esta es ademas la ruta por la que la inmobiliaria llega
  // de verdad al contrato.
  const canCreate =
    puedeEditar && (
      user?.rol === 'administrador' ||
      user?.rol === 'operador_analista' ||
      user?.rol === 'inmobiliaria'
    )
  const canRegenerate = canCreate || (puedeEditar && user?.rol === 'propietario')
  // Dueño del inmueble (propietario o inmobiliaria): su único paso siguiente en
  // un borrador es "Enviar a firma"; el resto de iconos solo le añaden ruido.
  const esDuenio = user?.rol === 'propietario' || user?.rol === 'inmobiliaria'
  // El contrato (paso 5) solo se genera cuando el expediente está APROBADO.
  // En 'condicionado' hay que aprobar explícito primero (card "Aprobar y generar
  // contrato", que transiciona a 'aprobado') o invitar a un coarrendatario.
  // Mismo gate que el backend (generarContrato).
  const expedienteAprobado = expedienteEstado === 'aprobado'
  // Contratos V3: las filas con destinacion son del asistente. Ahí viven (y se
  // retoman); las acciones del flujo anterior no aplican y el API las rechaza.
  const rutaAsistente = `/expedientes/${expedienteId}/contrato`
  // Un V3 terminado también cuenta: ese estudio ya tuvo su contrato (se cierra con el acta).
  const hayV3Vivo = contratos.some((c) => c.destinacion && c.estado !== 'cancelado')
  // Mismo roleGuard que el GET del asistente: ahí se sigue la firma de un V3 (también en solo lectura).
  const veAsistente =
    user?.rol === 'administrador' ||
    user?.rol === 'operador_analista' ||
    user?.rol === 'gerencia_consulta' ||
    user?.rol === 'inmobiliaria'

  const fetchContratos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await contratoService.getContratosForExpediente(expedienteId, { limit: 50 })
      setContratos(result.data)
    } catch {
      setError('Error al cargar los contratos')
    } finally {
      setIsLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchContratos()
  }, [fetchContratos])

  // Auto-abrir el panel de firma cuando hay un contrato en firma, para que el
  // progreso de firmantes quede visible sin tener que buscar el botón. Solo una
  // vez: si el usuario lo cierra, no lo reabrimos en cada refetch. Un V3 no: su
  // firma se sigue en el asistente (el panel es del flujo anterior).
  const autoOpenedFirmaRef = useRef(false)
  useEffect(() => {
    if (autoOpenedFirmaRef.current) return
    const enFirma = contratos.find((c) => c.estado === 'pendiente_firma' && !c.destinacion)
    if (enFirma) {
      setFirmaContratoId(enFirma.id)
      autoOpenedFirmaRef.current = true
    }
  }, [contratos])

  async function handleDownload(contrato: IContrato) {
    setDownloadingId(contrato.id)
    try {
      const result = await contratoService.descargarContrato(contrato.id)
      const a = document.createElement('a')
      a.href = result.url
      a.download = result.nombre_archivo || 'contrato.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Error al descargar el contrato')
    } finally {
      setDownloadingId(null)
    }
  }


  function handleGenerated() {
    setGenerarOpen(false)
    fetchContratos()
    onContratoActualizado?.()
  }

  // Envío efectivo a firma (Auco). Propaga errores; los callers muestran el toast.
  async function doEnviarAFirma(contrato: IContrato) {
    const res = await contratoService.enviarAFirma(contrato.id)
    toast.success(res.message || 'Contrato enviado a firma')
    await fetchContratos()
    onContratoActualizado?.()
    setFirmaContratoId(contrato.id) // mostrar el progreso de firmas
  }

  // "Enviar a firma": ANTES de enviar, pre-chequeo de firmantes (4.3). Si es
  // multi-parte, mostramos un modal con a qué número va el OTP de cada firmante
  // y bloqueamos si hay número repetido/faltante. Si no aplica (flujo de un
  // firmante), enviamos directo.
  async function handleEnviarAFirma(contrato: IContrato) {
    setEnviandoFirmaId(contrato.id)
    try {
      const preview = await contratoService.previewFirmantes(contrato.id)
      if (!preview.aplica || preview.firmantes.length === 0) {
        setConfirmFirma(contrato)
      } else {
        setFirmaPreview({ contrato, data: preview })
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar a firma')
    } finally {
      setEnviandoFirmaId(null)
    }
  }

  // onConfirm del preview multi-parte y del ConfirmDialog de un firmante.
  async function handleConfirmarFirma(contrato: IContrato) {
    setConfirmandoFirma(true)
    try {
      await doEnviarAFirma(contrato)
      setFirmaPreview(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar a firma'
      const bloqueo = bloqueoDeEvaluacion(err)
      if (bloqueo) {
        setFirmaPreview(null)
        setEvaluacionVencida(bloqueo)
      } else if ((err as { code?: string }).code === 'CONTRATO_YA_FIRMADO') {
        // Todas las partes ya habían firmado el envío anterior: quedó firmado.
        toast.info(message)
        setFirmaPreview(null)
        fetchContratos()
        onContratoActualizado?.()
      } else {
        toast.error(message)
      }
    } finally {
      setConfirmandoFirma(false)
    }
  }


  // Mientras se piden las transiciones, el botón no se puede volver a pulsar.
  const [abriendoTransicionId, setAbriendoTransicionId] = useState<string | null>(null)
  async function handleOpenTransicion(contrato: IContrato) {
    setAbriendoTransicionId(contrato.id)
    try {
      const data = await contratoService.getTransicionesDisponibles(contrato.id)
      setTransicionesDisponibles(data.transiciones_disponibles)
      setMorasActivasTransicion(data.moras_activas ?? 0)
      setTransicionContrato(contrato)
    } catch {
      toast.error('Error al obtener las transiciones disponibles')
    } finally {
      setAbriendoTransicionId(null)
    }
  }

  async function handleConfirmarTransicion(estadoDestino: EstadoContrato, comentario: string, motivo?: string): Promise<boolean> {
    if (!transicionContrato) return false
    setTransicionLoading(true)
    try {
      await contratoService.transicionar(transicionContrato.id, {
        nuevo_estado: estadoDestino,
        comentario,
        motivo,
      })
      toast.success('Estado del contrato actualizado')
      setTransicionContrato(null)
      fetchContratos()
      // Avisar al padre en TODA transición exitosa (no solo al completarse la
      // firma): una transición cambia el expediente/inmueble en el server
      // (p. ej. 'vigente' cierra el expediente; finalizar/cancelar libera el
      // inmueble) y sin esto el resto de la página quedaba stale.
      onContratoActualizado?.()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      // Llevarlo a 'pendiente_firma' es el mismo envío a firma.
      const bloqueo = bloqueoDeEvaluacion(err)
      if (bloqueo) {
        setTransicionContrato(null)
        setEvaluacionVencida(bloqueo)
      } else if ((err as { code?: string }).code === 'CONTRATO_YA_FIRMADO') {
        // Todas las partes ya habían firmado (el aviso de Auco se perdió): quedó firmado.
        toast.info(message)
        setTransicionContrato(null)
        fetchContratos()
        onContratoActualizado?.()
      } else {
        toast.error(message)
      }
      return false
    } finally {
      setTransicionLoading(false)
    }
  }

  // Acciones de una fila: las secundarias primero y la principal (verde) al final,
  // como en Documentos. Botones de 40 px con texto: antes eran iconos de 28 px.
  const accionesContrato = (c: IContrato, esV3: boolean) => {
    const nombre = esV3 ? `contrato ${c.numero ?? ''}`.trim() : `contrato versión ${c.version}`
    const firmasAbiertas = firmaContratoId === c.id
    return (
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => handleDownload(c)}
          disabled={downloadingId === c.id || !c.storage_key}
          aria-label={`Descargar el PDF del ${nombre}`}
          title={c.storage_key ? undefined : 'El PDF todavía no está disponible'}
          className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
        >
          {downloadingId === c.id ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
          PDF
        </button>
        {/* Con la fila enlazada al detalle, «Ver detalle» queda solo para los
            roles internos: al dueño solo le añadía ruido. */}
        {!esV3 && !esDuenio && (
          <Link href={`/contratos/${c.id}`} className={cn(BOTON_FILA, BOTON_SECUNDARIO)} aria-label={`Ver detalle del ${nombre}`}>
            <IconEye size={16} />
            Ver detalle
          </Link>
        )}
        {!esV3 && canRegenerate && c.estado === 'borrador' && (
          <button
            type="button"
            onClick={() => setRegenerarTarget(c)}
            className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            title="Fecha de inicio, plazo, canon y servicios"
          >
            <IconRefresh size={16} />
            Editar y regenerar
          </button>
        )}
        {/* Antes de la firma, "Cambiar estado" solo le ofrece "Cancelar" al
            dueño: lo escondemos ahí y se lo dejamos en pendiente_firma /
            vigente, donde sí sirve para terminar o cancelar el contrato. */}
        {!esV3 &&
          canRegenerate &&
          !TERMINAL_STATES.includes(c.estado) &&
          !(esDuenio && ESTADOS_PRE_FIRMA.includes(c.estado)) && (
            <button
              type="button"
              onClick={() => handleOpenTransicion(c)}
              disabled={abriendoTransicionId === c.id}
              className={cn(BOTON_FILA, BOTON_SECUNDARIO)}
            >
              {abriendoTransicionId === c.id ? <IconLoader size={16} className="animate-spin" /> : <IconArrowRight size={16} />}
              Cambiar estado
            </button>
          )}
        {!esV3 && canRegenerate && c.estado === 'pendiente_firma' && (
          <button
            type="button"
            onClick={() => { setTieneMultiparte(null); setFirmaContratoId(firmasAbiertas ? null : c.id) }}
            aria-expanded={firmasAbiertas}
            aria-controls="contrato-firmas"
            className={cn(BOTON_FILA, firmasAbiertas ? 'border border-primary-300 bg-primary-50 text-primary-800' : BOTON_SECUNDARIO)}
            title="Ver y gestionar las firmas de este contrato"
          >
            <IconMail size={16} />
            {firmasAbiertas ? 'Ocultar firmas' : 'Ver firmas'}
          </button>
        )}
        {/* En firma, firma incompleta, fianza activa o terminado: se sigue en el asistente (ahí va el acta
            de entrega), también con el flag apagado: el API sigue mostrando los contratos ya enviados. */}
        {esV3 && veAsistente && c.estado !== 'borrador' && c.estado !== 'cancelado' && (
          <Link href={rutaAsistente} className={cn(BOTON_FILA, BOTON_SECUNDARIO)} title="Ver el estado de la firma en el asistente">
            <IconArrowRight size={16} />
            Abrir
          </Link>
        )}
        {esV3 && contratosV3 && canCreate && c.estado === 'borrador' && (
          <Link href={rutaAsistente} className={cn(BOTON_FILA, BOTON_PRINCIPAL)} title="Continuar el contrato en el asistente">
            <IconArrowRight size={16} />
            Continuar
          </Link>
        )}
        {!esV3 && canRegenerate && ESTADOS_PRE_FIRMA.includes(c.estado) && (
          <button
            type="button"
            onClick={() => handleEnviarAFirma(c)}
            disabled={enviandoFirmaId === c.id || confirmandoFirma}
            className={cn(BOTON_FILA, BOTON_PRINCIPAL)}
            title="Llevar a firma y enviar al/los firmante(s)"
          >
            {enviandoFirmaId === c.id ? <IconLoader size={16} className="animate-spin" /> : <IconMail size={16} />}
            {enviandoFirmaId === c.id ? 'Enviando…' : 'Enviar a firma'}
          </button>
        )}
      </div>
    )
  }

  // Loading state
  // Solo la primera carga: al refrescar se sigue viendo lo que ya estaba.
  if (isLoading && contratos.length === 0) {
    return <SkeletonTable filas={2} columnas={4} etiqueta="Cargando contratos…" />
  }

  // Error state
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">No pudimos cargar los contratos de este estudio.</p>
        <button
          type="button"
          onClick={fetchContratos}
          className={cn(BOTON_FILA, 'border border-red-300 bg-white text-red-800 hover:bg-red-100')}
        >
          <IconRefresh size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  const enFirma = contratos.filter((c) => c.estado === 'pendiente_firma').length
  const contratoFirmas = contratos.find((c) => c.id === firmaContratoId)

  return (
    <div className="space-y-4">
      {/* Encabezado: cuántos hay y la acción para crear el primero */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Contratos del estudio</h3>
          {contratos.length > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              <span className="tabular-nums">{contratos.length}</span> {contratos.length === 1 ? 'contrato' : 'contratos'}
              {enFirma > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-blue-800">
                    <span className="tabular-nums">{enFirma}</span> en firma
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        {canCreate && expedienteAprobado && !sinInmueble && contratosV3 && !hayV3Vivo && !inmuebleReservadoPorOtro && (
          <Link href={rutaAsistente} className={buttonClasses('primary', 'md', 'min-h-10 shrink-0')}>
            <IconPlus size={16} />
            Crear contrato
          </Link>
        )}
        {canCreate && expedienteAprobado && !sinInmueble && !contratosV3 && (
          <button type="button" onClick={() => setGenerarOpen(true)} className={buttonClasses('primary', 'md', 'min-h-10 shrink-0')}>
            <IconPlus size={16} />
            Generar contrato
          </button>
        )}
      </div>

      {evaluacionVencida && (
        <BloqueosContrato
          bloqueos={[evaluacionVencida]}
          para="enviar el contrato a firma"
          expedienteId={expedienteId}
          puedeEditar={puedeEditar}
          conBorrador
        />
      )}

      {contratos.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <IconFileText size={20} />
          </span>
          <p className="mt-3 text-sm font-semibold text-gray-900">Este estudio todavía no tiene contrato</p>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            {!expedienteAprobado
              ? 'El contrato se podrá generar cuando el estudio del arrendatario esté aprobado.'
              : sinInmueble
                ? 'El estudio está aprobado sin propiedad. Vincule el inmueble antes de generar el contrato.'
                : canCreate && contratosV3
                  ? 'Pulse «Crear contrato» para abrir el asistente.'
                  : canCreate
                    ? 'Pulse «Generar contrato» para crear uno con la plantilla activa.'
                    : 'El contrato se generará cuando el propietario lo emita, ahora que el estudio fue aprobado.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {contratos.map((c) => {
            // /contratos/:id de una fila V3 redirige al asistente: vamos directo.
            const esV3 = !!c.destinacion
            const marca = MARCA_CONTRATO[c.estado] ?? MARCA_CONTRATO.borrador
            const titulo = esV3 ? `Contrato ${c.numero ?? ''}`.trim() : `Contrato · versión ${c.version}`
            const generado = c.fecha_generacion ?? c.created_at
            return (
              <li key={c.id} className={cn('flex gap-3 px-4 py-4 sm:px-5', firmaContratoId === c.id && 'bg-primary-50/40')}>
                <span
                  aria-hidden="true"
                  className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', marca.circulo)}
                >
                  {marca.icono}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  {/* Qué contrato es y en qué estado está */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="text-sm font-semibold text-gray-900">
                        <Link
                          href={esV3 ? rutaAsistente : `/contratos/${c.id}`}
                          className="rounded-sm hover:text-primary-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {titulo}
                        </Link>
                      </h4>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', marca.chip)}>
                        {etiquetaContrato(c.estado, esV3)}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-600">
                      {c.fecha_inicio && (
                        <span>
                          Inicio {formatDate(c.fecha_inicio)} · {c.duracion_meses || 12} meses
                        </span>
                      )}
                      {c.fecha_firma ? (
                        <span>Firmado el {formatDate(c.fecha_firma)}</span>
                      ) : (
                        <span>Generado el {formatDateTime(generado)}</span>
                      )}
                    </p>
                    {!esV3 && c.nombre_archivo && (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                        <IconFileText size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate" title={c.nombre_archivo}>{c.nombre_archivo}</span>
                      </p>
                    )}
                    {c.motivo_cancelacion && (
                      <p className="mt-1 text-xs text-gray-700">
                        <span className="font-medium">Motivo:</span> {c.motivo_cancelacion}
                      </p>
                    )}
                  </div>
                  {accionesContrato(c, esV3)}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Firmas del contrato en firma (flujo anterior): se abre solo y se cierra con «Ocultar firmas». */}
      {firmaContratoId && (
        <section id="contrato-firmas" aria-label="Firmas del contrato" className="space-y-4">
          {/* Progreso multi-parte (solo si el contrato tiene firmantes). El
              recordatorio a las partes pendientes vive aquí. */}
          {/* canRegenerate y no canCreate: reenviar/cancelar la firma también
              lo permite la API al propietario (roleGuard de /firma). */}
          <FirmantesContratoSection
            contratoId={firmaContratoId}
            canManage={canRegenerate}
            enFirma={contratoFirmas?.estado === 'pendiente_firma'}
            onAllSigned={() => { fetchContratos(); onContratoActualizado?.() }}
            onFirmantesLoaded={(total) => setTieneMultiparte(total > 0)}
          />
          {/* "Solicitudes de Firma" = flujo de un solo firmante (legacy). Se
              oculta cuando el contrato ya usa firma multi-parte: el panel de
              arriba es la fuente de verdad y el recordatorio ya está ahí. */}
          {tieneMultiparte === false && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <FirmaSolicitudesSection
                contratoId={firmaContratoId}
                estadoContrato={contratoFirmas?.estado || ''}
                canManage={canRegenerate}
                onEvaluacionVencida={setEvaluacionVencida}
              />
            </div>
          )}
        </section>
      )}

      {/* Generar Modal */}
      <GenerarContratoModal
        isOpen={generarOpen}
        expedienteId={expedienteId}
        conComision={conComision}
        onClose={() => setGenerarOpen(false)}
        onGenerated={handleGenerated}
      />

      {/* Transicion Modal */}
      {transicionContrato && (
        <ContratoTransicionModal
          isOpen={true}
          onClose={() => setTransicionContrato(null)}
          estadoActual={transicionContrato.estado}
          transicionesDisponibles={transicionesDisponibles}
          onConfirmar={handleConfirmarTransicion}
          isLoading={transicionLoading}
          morasActivas={morasActivasTransicion}
        />
      )}

      {/* Editor controlado + regeneracion (4.1e) */}
      <RegenerarContratoModal
        isOpen={!!regenerarTarget}
        onClose={() => setRegenerarTarget(null)}
        contrato={regenerarTarget ? {
          id: regenerarTarget.id,
          fecha_inicio: regenerarTarget.fecha_inicio,
          duracion_meses: regenerarTarget.duracion_meses,
          valor_arriendo: regenerarTarget.valor_arriendo,
        } : null}
        onRegenerated={() => { setRegenerarTarget(null); fetchContratos(); onContratoActualizado?.() }}
      />

      {/* Pre-chequeo de firmantes antes de enviar a firma (4.3) */}
      <ConfirmDialog
        isOpen={confirmFirma !== null}
        onClose={() => setConfirmFirma(null)}
        onConfirm={async () => {
          const c = confirmFirma
          setConfirmFirma(null)
          if (c) await handleConfirmarFirma(c)
        }}
        title="Enviar el contrato a firma"
        message="Se crea el sobre en Auco y al arrendatario le llega el enlace de firma por WhatsApp. Cada envío consume créditos de firma."
        confirmLabel="Enviar a firma"
      />
      <EnviarFirmaPreviewModal
        isOpen={!!firmaPreview}
        firmantes={firmaPreview?.data.firmantes ?? []}
        puedeEnviar={firmaPreview?.data.puede_enviar ?? false}
        biometria={firmaPreview?.data.biometria}
        submitting={confirmandoFirma}
        onConfirm={() => { if (firmaPreview) void handleConfirmarFirma(firmaPreview.contrato) }}
        onClose={() => !confirmandoFirma && setFirmaPreview(null)}
        onFirmanteUpdated={async () => {
          // Tras corregir un teléfono en línea, re-pedimos el preview para
          // re-validar repetidos/faltantes sin cerrar el modal.
          if (!firmaPreview) return
          try {
            const p = await contratoService.previewFirmantes(firmaPreview.contrato.id)
            setFirmaPreview({ contrato: firmaPreview.contrato, data: p })
          } catch {
            /* si falla, el usuario puede reintentar */
          }
        }}
      />
    </div>
  )
}
