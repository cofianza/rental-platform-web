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
 * y el resultado del buro dentro). Por eso la lista se pide filtrada por la
 * cartera del inmueble actual (admin y operador recibian el inventario de toda
 * la plataforma) y con buscador; las filas de otra cartera que aun lleguen se
 * marcan y se deshabilitan.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconHome,
  IconLoader,
  IconMapPin,
  IconCheck,
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
import { ApiClientError } from '@/lib/api'
import { EvaluarEnEstudioNuevo } from './EvaluarEnEstudioNuevo'
import { SkeletonText } from '@/components/ui/Skeleton'

/** Misma regla que la API (inmuebles/destinacion.ts): mixto o desconocido no tiene destinación. */
function destinacionDeUso(uso: string | null | undefined): 'vivienda' | 'comercial' | null {
  if (uso === 'vivienda') return 'vivienda'
  if (uso === 'comercial' || uso === 'local_comercial') return 'comercial'
  return null
}

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
  /**
   * Estudio sin propiedad: el «canon aprobado» que calculó la API (el máximo
   * amparado del CRC). Con él, el modal VINCULA el primer inmueble.
   */
  canonAprobado?: number | null
  /**
   * Hasta qué canon sirve el estudio sin evaluarlo de nuevo, cuando la API lo
   * envía con el resultado del estudio (null = lo envía sin cifra). Con él, el
   * aviso y la lista usan esa cifra en lugar de la estimación local, y una
   * propiedad de canon mayor se evalúa de nuevo al reasignar. Sin él
   * (undefined), todo sigue como siempre.
   */
  canonHabilitado?: number | null
  /** La API indica que el resultado ya tiene un canon límite: un canon mayor no se evalúa de nuevo desde aquí. */
  sinReevaluacion?: boolean
  /** Estudio sin propiedad: destinación evaluada (solo se vinculan inmuebles del mismo tipo). */
  destinacion?: string | null
  /** Para ofrecer la evaluación nueva cuando el inmueble no cabe. */
  expedienteId?: string
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
  canonAprobado,
  canonHabilitado,
  sinReevaluacion = false,
  destinacion,
  expedienteId,
  onReasignado,
}: ReasignarEstudioModalProps) {
  const vincular = !inmuebleActualId
  // La API envió el resultado del estudio con su regla de canon: no se estima nada aquí.
  const conCanonHabilitado = canonHabilitado !== undefined
  // El inmueble elegido no cupo (409 ESTUDIO_NO_PORTABLE): se ofrece evaluar de nuevo.
  const [noCabe, setNoCabe] = useState(false)
  const [inmuebles, setInmuebles] = useState<IInmueble[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [seleccionado, setSeleccionado] = useState<IInmueble | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Buscador: `busqueda` es lo que se escribe; `search`, lo que se pide (con
  // pausa, para no disparar una consulta por tecla).
  const [busqueda, setBusqueda] = useState('')
  const [search, setSearch] = useState('')
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
  const canonMaximo = conCanonHabilitado
    ? (canonAprobado ?? canonHabilitado ?? null)
    : (canonAprobado ?? (canonOrigen === null ? null : (canonOrigen * (100 + TOLERANCIA_PCT)) / 100))
  // Con la cifra de la API, una propiedad de canon mayor no se descarta: se evalúa de nuevo al reasignar.
  const evaluaDeNuevo = conCanonHabilitado && !sinReevaluacion && !vincular && !!seleccionado && canonMaximo !== null && seleccionado.valor_arriendo > canonMaximo

  const cargarInmuebles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // El backend scopea por rol: propietario/inmobiliaria solo reciben su
      // cartera. Para admin/operador llegaba TODO el inventario (los 100 mas
      // recientes de la plataforma), asi que se pide solo la cartera del
      // inmueble actual: la organizacion, o el propietario si no hay
      // organizacion (§4.3 no cruza carteras).
      const actual = inmuebleActualId
        ? await inmuebleService.getInmuebleById(inmuebleActualId).catch(() => null)
        : null
      const cartera = actual
        ? { inmobiliariaId: actual.inmobiliaria_id ?? null, propietarioId: actual.propietario_id ?? null }
        : null
      const res = await inmuebleService.getInmuebles({
        limit: INMUEBLES_LIMIT,
        ...(search ? { search } : {}),
        ...(cartera?.inmobiliariaId
          ? { inmobiliaria_id: cartera.inmobiliariaId }
          : cartera?.propietarioId
            ? { propietario_id: cartera.propietarioId }
            : {}),
      })
      setInmuebles(res.data.filter((i) => i.id !== inmuebleActualId))
      setCarteraActual(cartera)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las propiedades')
    } finally {
      setIsLoading(false)
    }
  }, [inmuebleActualId, search])

  useEffect(() => {
    if (!isOpen) return
    setSeleccionado(null)
    setError(null)
    setNoCabe(false)
    setCarteraActual(null)
    cargarInmuebles()
  }, [isOpen, cargarInmuebles])

  useEffect(() => {
    const t = setTimeout(() => setSearch(busqueda.trim()), 300)
    return () => clearTimeout(t)
  }, [busqueda])

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
    if (!seleccionado || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await estudioService.reasignar(estudioId, seleccionado.id)
      // La vigencia va en el toast a proposito: es la promesa del §4.3 que mas
      // facil seria dar por hecha ("conserva su vigencia original"), y verla
      // sin cambiar es como el gestor comprueba que no se extendio.
      const vigencia = res.vigencia_hasta ? ` Vigencia hasta ${formatDate(res.vigencia_hasta)}.` : ''
      toast.success(
        vincular
          ? `Inmueble ${seleccionado.codigo} vinculado al estudio.${vigencia}`
          : res.reevaluado
            ? `El estudio se evaluó de nuevo con el canon de ${seleccionado.codigo} y se reasignó sin costo.${res.desenlace_texto ? ` Resultado: ${res.desenlace_texto}.` : ''}${vigencia}`
            : `Estudio reasignado a ${seleccionado.codigo} sin costo adicional.${vigencia}`,
      )
      // El certificado emitido nombra la propiedad en el PDF, que es inmutable.
      // La API lo regenera con la propiedad nueva; si no pudo, el gestor tiene
      // que enterarse ANTES de entregarlo, porque el PDF seguiria describiendo
      // la propiedad anterior mientras el QR ya muestra la nueva.
      if (res.certificado === 'desactualizado') {
        toast.warning(
          'El certificado emitido quedó describiendo la propiedad anterior. Regenérelo desde el estudio antes de entregarlo.',
          { duration: 10000 },
        )
      } else if (res.certificado === 'regenerado') {
        toast.info('El certificado se regeneró con la propiedad nueva, conservando su código y su vencimiento.')
      }
      onReasignado?.()
      onClose()
    } catch (err) {
      // El mensaje del backend es el bueno: dice el numero concreto (canon
      // maximo tolerado, relacion canon/ingreso, tope) y ofrece la salida.
      // Reescribirlo aqui solo lo empeoraria.
      const msg = err instanceof Error ? err.message : 'No se pudo reasignar el estudio'
      setNoCabe(err instanceof ApiClientError && err.code === 'ESTUDIO_NO_PORTABLE')
      setError(msg)
      // La API avisó un valor antes de cobrar nada: es información, no una falla.
      if (err instanceof ApiClientError && err.code === 'REQUIERE_CONSULTA_ADICIONAL') toast.warning(msg, { duration: 10000 })
      else toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={vincular ? 'Vincular inmueble al estudio' : 'Reasignar estudio a otra propiedad'}
      description={
        vincular
          ? 'El estudio se creó sin propiedad. Elija el inmueble que la persona va a arrendar.'
          : conCanonHabilitado
            ? 'El estudio ya está pagado y ejecutado: se puede reutilizar en otra propiedad de canon igual o menor al aprobado sin costo adicional.'
            : 'El estudio ya está pagado y ejecutado: se puede reutilizar en otra propiedad sin costo adicional.'
      }
      size="lg"
      footer={
        <div className="space-y-2">
          {seleccionado ? (
            <div className="text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-gray-900">
                <span className="font-medium">
                  {vincular && canonAprobado
                    ? `Aprobado hasta ${formatCurrency(canonAprobado)}`
                    : canonOrigen !== null
                      ? formatCurrency(canonOrigen)
                      : 'Canon no registrado'}
                </span>
                <IconArrowRight size={14} className="text-gray-500" aria-hidden="true" />
                <span className="font-medium">
                  {seleccionado.codigo} · {formatCurrency(seleccionado.valor_arriendo)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {evaluaDeNuevo
                  ? 'El canon es mayor al aprobado: el estudio se evalúa de nuevo con este canon antes de trasladarlo, sin costo mientras el reporte de la evaluación esté vigente. Si ya venció, no se traslada ni se cobra nada.'
                  : 'No se generará ningún cobro ni se descontará ningún crédito, y el estudio conserva su vigencia original.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Elija una propiedad de la lista.</p>
          )}
          <ModalAcciones>
            <button type="button" onClick={handleClose} disabled={isSaving} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReasignar}
              disabled={!seleccionado || isSaving}
              aria-busy={isSaving || undefined}
              className={botonModal('primary')}
            >
              {isSaving && <IconLoader size={16} className="animate-spin" />}
              {vincular ? 'Vincular inmueble' : evaluaDeNuevo ? 'Evaluar de nuevo y reasignar' : 'Reasignar sin costo'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          {vincular ? (
            <>
              <li>Su canon debe caber en el canon aprobado.</li>
              <li>Debe ser de la misma destinación (vivienda o comercial).</li>
              <li>Desde ese momento el estudio pasa a la cartera del dueño del inmueble. Conserva su vigencia original.</li>
            </>
          ) : (
            <>
              <li>Conserva su vigencia original: reasignarlo no la extiende.</li>
              <li>Solo se traslada dentro de la misma cartera, y no si el estudio ya generó contrato o tiene una visita agendada.</li>
            </>
          )}
        </ul>

        {vincular && canonAprobado ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            Aprobado hasta un canon de <span className="font-semibold">{formatCurrency(canonAprobado)}</span>. Si el
            inmueble cuesta más, se requiere una evaluación nueva.
          </div>
        ) : conCanonHabilitado ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            {canonMaximo !== null ? (
              <>
                El estudio sirve, sin evaluarlo de nuevo, para un canon de hasta{' '}
                <span className="font-semibold">{formatCurrency(canonMaximo)}</span>.{' '}
                {sinReevaluacion ? 'Elija una propiedad dentro de ese valor.' : 'Con un canon mayor se evalúa de nuevo antes de trasladarlo.'}
              </>
            ) : (
              'Elija la propiedad: al reasignar se verifica su canon frente al aprobado en el estudio.'
            )}
          </div>
        ) : canonOrigen !== null ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            Se evaluó con un canon de{' '}
            <span className="font-semibold">{formatCurrency(canonOrigen)}</span>. Sin una evaluación
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
              Este estudio no tiene registrado el canon con el que se evaluó, así que no podemos
              verificar la tolerancia de portabilidad. Es muy probable que para otra propiedad se
              requiera una evaluación nueva.
            </span>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
            {noCabe && vincular && expedienteId && seleccionado && (
              <div className="mt-3">
                <EvaluarEnEstudioNuevo expedienteId={expedienteId} inmuebleDestinoId={seleccionado.id} />
              </div>
            )}
          </div>
        )}

        <div>
          <p id="reasignar-estudio-propiedad" className="mb-1 block text-sm font-medium text-gray-700">
            Propiedad <span className="text-red-600" aria-hidden="true">*</span>
          </p>
          <label htmlFor="reasignar-estudio-busqueda" className="sr-only">
            Buscar propiedad
          </label>
          <input
            id="reasignar-estudio-busqueda"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, dirección o ciudad"
            disabled={isSaving}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>

        <div role="group" aria-labelledby="reasignar-estudio-propiedad" className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {isLoading && (
            <div role="status" className="space-y-3 p-3">
              <span className="sr-only">Cargando propiedades…</span>
              {[0, 1, 2].map((i) => (
                <SkeletonText key={i} lineas={2} />
              ))}
            </div>
          )}

          {!isLoading && ordenados.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              {search
                ? 'Ninguna propiedad de esta cartera coincide con la búsqueda.'
                : vincular
                  ? 'No hay propiedades disponibles para vincular.'
                  : 'No hay otras propiedades disponibles para reasignar este estudio.'}
            </div>
          )}

          {!isLoading &&
            ordenados.map((inm) => {
              const otraCartera = esDeOtraCartera(inm)
              const otraDestinacion = vincular && !!destinacion && destinacionDeUso(inm.uso) !== destinacion
              const seleccionable = esSeleccionable(inm) && !otraCartera && !otraDestinacion
              const fueraDeTolerancia =
                canonMaximo !== null && inm.valor_arriendo > canonMaximo
              const activo = seleccionado?.id === inm.id
              return (
                <button
                  key={inm.id}
                  type="button"
                  
                  aria-pressed={activo}
                  disabled={!seleccionable || isSaving}
                  onClick={() => {
                    setSeleccionado(inm)
                    setError(null)
                    setNoCabe(false)
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                    seleccionable ? 'hover:bg-gray-50' : 'cursor-not-allowed opacity-60',
                    activo && 'bg-primary-50',
                  )}
                >
                  <div className={cn('mt-0.5', activo ? 'text-primary-700' : 'text-gray-500')}>
                    {activo ? <IconCheck size={16} /> : <IconHome size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', activo ? 'text-primary-800' : 'text-gray-900')}>
                      {inm.codigo} · {formatCurrency(inm.valor_arriendo)}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-gray-600">
                      <IconMapPin size={12} />
                      {inm.direccion}, {inm.ciudad}
                      {' · '}
                      {inm.tipo ? TIPO_LABELS[inm.tipo] ?? inm.tipo : '—'}
                    </p>
                    {otraCartera && (
                      <p className="mt-1 text-xs text-gray-500">
                        Pertenece a otra cartera: el estudio solo se reutiliza dentro de la misma
                        agencia o del mismo propietario.
                      </p>
                    )}
                    {otraDestinacion && (
                      <p className="mt-1 text-xs text-gray-500">
                        No es {destinacion === 'comercial' ? 'comercial' : 'de vivienda'}: para otro tipo de inmueble se
                        requiere una evaluación nueva.
                      </p>
                    )}
                    {!seleccionable && !otraCartera && !otraDestinacion && (
                      <p className="mt-1 text-xs text-gray-500">{motivoNoSeleccionable(inm)}</p>
                    )}
                    {seleccionable && fueraDeTolerancia && (
                      <p className="mt-1 text-xs text-amber-800">
                        {conCanonHabilitado && !vincular
                          ? sinReevaluacion
                            ? 'Canon mayor al aprobado en el estudio.'
                            : 'Canon mayor al aprobado: el estudio se evalúa de nuevo con este canon antes de trasladarlo.'
                          : 'Por encima de la tolerancia estimada — probablemente requiera una evaluación nueva.'}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>

      </div>
    </Modal>
  )
}
