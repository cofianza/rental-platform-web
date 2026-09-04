/**
 * ReasignarEstudioModal — portabilidad del estudio (Flujo de Gerencia §4.3).
 *
 * "Un estudio ya pagado y ejecutado puede reutilizarse para una propiedad
 * distinta sin costo adicional, siempre que el canon de la nueva propiedad
 * este dentro de la tolerancia establecida en la Politica de Evaluacion (hasta
 * +15%, con recalculo de la relacion canon/ingreso menor o igual al 40%)."
 *
 * El caso natural es el candidato que perdio la propiedad porque otro fue
 * aprobado primero (§4.2, que ya deja el aviso en el timeline del expediente).
 *
 * ── QUIEN DECIDE ─────────────────────────────────────────────────────────
 *
 * La API, siempre. Esta pantalla NO reimplementa la regla: calcula el techo
 * del +15% solo para ORDENAR la lista y avisar antes de tiempo, pero el "si"
 * o el "no" lo da POST /estudios/:id/reasignar, que ademas aplica cosas que
 * el navegador no puede saber — el ingreso inferido de la corrida original
 * (para el recalculo del 40%), el tope de canon del §4.4, la reserva del
 * inmueble destino y que el estudio este realmente pagado.
 *
 * Por eso el boton NUNCA se deshabilita por la estimacion local: si el gestor
 * insiste con una propiedad que se ve fuera de tolerancia, la API contesta con
 * el mensaje exacto (que dice el numero y ofrece la salida) y se muestra tal
 * cual. Una pantalla que adivina y bloquea seria peor que una que pregunta.
 *
 * La UNICA excepcion es la CARTERA, y no es una adivinanza sino un hecho: el
 * traslado no cruza de agencia ni de propietario (mover el expediente a la
 * propiedad de otra cartera lo mudaria de dueño, con los datos del solicitante
 * y el resultado del buro dentro). Para admin y operador esta lista trae el
 * inventario COMPLETO sin decir de quien es cada propiedad, asi que elegir mal
 * era un clic indistinguible: esas filas se marcan y se deshabilitan.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconHome,
  IconLoader,
  IconMapPin,
} from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/constants'
import { inmuebleService } from '@/services/inmuebleService'
import { estudioService } from '@/services/estudioService'
import {
  TIPO_LABELS,
  esSeleccionable,
  motivoNoSeleccionable,
} from '@/components/inmuebles/constants'
import type { IInmueble } from '@/types/inmueble'
import { cn } from '@/lib/utils'

interface ReasignarEstudioModalProps {
  isOpen: boolean
  onClose: () => void
  estudioId: string
  /** Inmueble actual del expediente — se excluye de la lista. */
  inmuebleActualId?: string | null
  /**
   * `estudios.canon_evaluado`: el canon CONGELADO con el que se ejecuto el
   * estudio. null en los estudios anteriores al cambio; en ese caso no se
   * puede estimar nada aqui y se avisa antes de gastarle el clic al gestor.
   */
  canonEvaluado?: number | string | null
  /** Se llama tras una reasignacion exitosa, para refrescar el expediente. */
  onReasignado?: () => void
}

/** Tolerancia del §4.3. Solo para la ESTIMACION local — la API tiene la suya. */
const TOLERANCIA_PCT = 15
const INMUEBLES_LIMIT = 100

function aNumero(v: number | string | null | undefined): number | null {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null
}

export function ReasignarEstudioModal({
  isOpen,
  onClose,
  estudioId,
  inmuebleActualId,
  canonEvaluado,
  onReasignado,
}: ReasignarEstudioModalProps) {
  const [inmuebles, setInmuebles] = useState<IInmueble[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [seleccionado, setSeleccionado] = useState<IInmueble | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cartera del inmueble ACTUAL. La API solo traslada dentro de la misma
  // cartera (mover el expediente a la propiedad de otra agencia lo mudaria de
  // dueño, con los datos del solicitante y el resultado del buro dentro), y
  // para los roles internos esta lista trae el inventario COMPLETO sin decir de
  // quien es cada propiedad. Sin esto, elegir mal era un clic indistinguible.
  const [carteraActual, setCarteraActual] = useState<{
    inmobiliariaId: string | null
    propietarioId: string | null
  } | null>(null)

  const canonOrigen = aNumero(canonEvaluado)
  // Mismo calculo que la API (canon * (100 + pct) / 100 y no * 1.15): con
  // enteros el borde del +15% es exacto, y asi la estimacion no contradice al
  // backend justo en la frontera.
  const canonMaximo = canonOrigen === null ? null : (canonOrigen * (100 + TOLERANCIA_PCT)) / 100

  const cargarInmuebles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // El backend scopea por rol: propietario/inmobiliaria solo reciben su
      // cartera. Para admin/operador, en cambio, llega TODO el inventario, y
      // por eso hace falta saber de que cartera es el inmueble actual: es el
      // unico dato con el que esta pantalla puede marcar los destinos que la
      // API va a negar (§4.3 no cruza carteras).
      const [res, actual] = await Promise.all([
        inmuebleService.getInmuebles({ limit: INMUEBLES_LIMIT }),
        inmuebleActualId
          ? inmuebleService.getInmuebleById(inmuebleActualId).catch(() => null)
          : Promise.resolve(null),
      ])
      setInmuebles(res.data.filter((i) => i.id !== inmuebleActualId))
      setCarteraActual(
        actual
          ? {
              inmobiliariaId: actual.inmobiliaria_id ?? null,
              propietarioId: actual.propietario_id ?? null,
            }
          : null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las propiedades')
    } finally {
      setIsLoading(false)
    }
  }, [inmuebleActualId])

  useEffect(() => {
    if (!isOpen) return
    setSeleccionado(null)
    setError(null)
    setCarteraActual(null)
    cargarInmuebles()
  }, [isOpen, cargarInmuebles])

  // Misma regla que el backend: misma organizacion, y cuando no hay
  // organizacion (cartera de un propietario individual), mismo propietario.
  // Si no se pudo resolver la cartera actual no se marca nada — la API sigue
  // siendo la que decide, y adivinar aqui esconderia propiedades validas.
  const esDeOtraCartera = useCallback(
    (inm: IInmueble): boolean => {
      if (!carteraActual) return false
      const org = inm.inmobiliaria_id ?? null
      if (org !== carteraActual.inmobiliariaId) return true
      return org === null && (inm.propietario_id ?? null) !== carteraActual.propietarioId
    },
    [carteraActual],
  )

  // Orden: primero las que caben en la tolerancia estimada, luego el resto por
  // canon ascendente. Sin canon congelado no hay estimacion, asi que se ordena
  // solo por canon.
  const ordenados = useMemo(() => {
    return [...inmuebles].sort((a, b) => {
      if (canonMaximo !== null) {
        const aCabe = a.valor_arriendo <= canonMaximo ? 0 : 1
        const bCabe = b.valor_arriendo <= canonMaximo ? 0 : 1
        if (aCabe !== bCabe) return aCabe - bCabe
      }
      return a.valor_arriendo - b.valor_arriendo
    })
  }, [inmuebles, canonMaximo])

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  const handleReasignar = async () => {
    if (!seleccionado) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await estudioService.reasignar(estudioId, seleccionado.id)
      // La vigencia va en el toast a proposito: es la promesa del §4.3 que mas
      // facil seria dar por hecha ("conserva su vigencia original"), y verla
      // sin cambiar es como el gestor comprueba que no se extendio.
      const vigencia = res.vigencia_hasta ? ` Vigencia hasta ${formatDate(res.vigencia_hasta)}.` : ''
      toast.success(
        `Estudio reasignado a ${seleccionado.codigo} sin costo adicional.${vigencia}`,
      )
      // El certificado emitido nombra la propiedad en el PDF, que es inmutable.
      // La API lo regenera con la propiedad nueva; si no pudo, el gestor tiene
      // que enterarse ANTES de entregarlo, porque el PDF seguiria describiendo
      // la propiedad anterior mientras el QR ya muestra la nueva.
      if (res.certificado === 'desactualizado') {
        toast.warning(
          'El certificado emitido quedo describiendo la propiedad anterior. Regeneralo desde el estudio antes de entregarlo.',
          { duration: 10000 },
        )
      } else if (res.certificado === 'regenerado') {
        toast.info('El certificado se regenero con la propiedad nueva, conservando su codigo y su vencimiento.')
      }
      onReasignado?.()
      onClose()
    } catch (err) {
      // El mensaje del backend es el bueno: dice el numero concreto (canon
      // maximo tolerado, relacion canon/ingreso, tope) y ofrece la salida.
      // Reescribirlo aqui solo lo empeoraria.
      const msg = err instanceof Error ? err.message : 'No se pudo reasignar el estudio'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reasignar estudio a otra propiedad" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          El estudio ya esta pagado y ejecutado: se puede reutilizar en otra propiedad{' '}
          <span className="font-medium text-gray-800">sin costo adicional</span>. Conserva su
          vigencia original — reasignarlo no la extiende. Solo se traslada dentro de la misma
          cartera, y no si el expediente ya genero contrato o tiene una visita agendada.
        </p>

        {canonOrigen !== null ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            Se evaluo con un canon de{' '}
            <span className="font-semibold">{formatCurrency(canonOrigen)}</span>. Sin una evaluacion
            nueva, la tolerancia llega hasta{' '}
            <span className="font-semibold">{formatCurrency(canonMaximo as number)}</span> (+
            {TOLERANCIA_PCT}%).
          </div>
        ) : (
          // Sin canon congelado no hay tolerancia que medir. NO se afirma por que
          // falta (puede ser un estudio anterior al cambio, o uno cuyo inmueble
          // no tenia canon legible al completarse): se dice lo que se sabe, igual
          // que el mensaje de la API.
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Este estudio no tiene registrado el canon con el que se evaluo, asi que no podemos
              verificar la tolerancia de portabilidad. Es muy probable que para otra propiedad se
              requiera una evaluacion nueva.
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-500">
              <IconLoader size={16} className="animate-spin" />
              Cargando propiedades...
            </div>
          )}

          {!isLoading && ordenados.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay otras propiedades disponibles para reasignar este estudio.
            </div>
          )}

          {!isLoading &&
            ordenados.map((inm) => {
              const otraCartera = esDeOtraCartera(inm)
              const seleccionable = esSeleccionable(inm) && !otraCartera
              const fueraDeTolerancia =
                canonMaximo !== null && inm.valor_arriendo > canonMaximo
              const activo = seleccionado?.id === inm.id
              return (
                <button
                  key={inm.id}
                  type="button"
                  disabled={!seleccionable || isSaving}
                  onClick={() => setSeleccionado(inm)}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
                    seleccionable ? 'hover:bg-gray-50' : 'cursor-not-allowed opacity-60',
                    activo && 'bg-primary-50',
                  )}
                >
                  <div className="mt-0.5 text-gray-400">
                    <IconHome size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {inm.codigo} · {formatCurrency(inm.valor_arriendo)}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-gray-600">
                      <IconMapPin size={12} />
                      {inm.direccion}, {inm.ciudad}
                      {' · '}
                      {TIPO_LABELS[inm.tipo] ?? inm.tipo}
                    </p>
                    {otraCartera && (
                      <p className="mt-1 text-xs text-gray-500">
                        Pertenece a otra cartera: el estudio solo se reutiliza dentro de la misma
                        agencia o del mismo propietario.
                      </p>
                    )}
                    {!seleccionable && !otraCartera && (
                      <p className="mt-1 text-xs text-gray-500">{motivoNoSeleccionable(inm)}</p>
                    )}
                    {seleccionable && fueraDeTolerancia && (
                      <p className="mt-1 text-xs text-amber-700">
                        Por encima de la tolerancia estimada — probablemente requiera una evaluacion
                        nueva.
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>

        {seleccionado && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-gray-800">
              <span className="font-medium">
                {canonOrigen !== null ? formatCurrency(canonOrigen) : 'Canon no registrado'}
              </span>
              <IconArrowRight size={14} className="text-gray-400" />
              <span className="font-medium">
                {seleccionado.codigo} · {formatCurrency(seleccionado.valor_arriendo)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              No se generara ningun cobro ni se descontara ningun credito, y el estudio conserva su
              vigencia original.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleReasignar}
            disabled={!seleccionado || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving && <IconLoader size={14} className="animate-spin" />}
            Reasignar sin costo
          </button>
        </div>
      </div>
    </Modal>
  )
}
