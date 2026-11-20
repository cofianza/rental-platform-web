'use client'

/**
 * «Ver biometría» en la revisión manual.
 *
 * El analista de Cofianza ve el resultado guardado del cotejo (similitud,
 * documento, cada intento) y, si el cotejo no confirmó la identidad, las fotos
 * que Cofianza conserva para esta revisión (selfie y documento de cada intento
 * fallido). Las fotos se guardan cifradas, solo de quien autorizó con el texto
 * que lo permite, y se eliminan al decidir el estudio o a los 30 días. Se piden
 * al abrir esta ventana, una por una, y al cerrarla se olvidan.
 *
 * Hoy la autorización le pide a la persona UNA foto del documento (el lado con
 * su foto): no hay reverso.
 *
 * Solo administrador y operador, nunca en «ver como» (la API también lo niega).
 */

import { useState, type ReactNode } from 'react'
import {
  IconAlertTriangle,
  IconCamera,
  IconExternalLink,
  IconId,
  IconInfo,
  IconRefresh,
  IconUser,
  IconUserCheck,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/Skeleton'
import { useVerComo } from '@/components/expedientes/VerComo'
import { usePermissions } from '@/hooks/usePermissions'
import { useEvidenciaBiometria, useFotoBiometria, useResumenBiometria } from '@/hooks/useBiometriaEvidencia'
import type {
  CualFotoBiometria,
  IIntentoConFotos,
  IIntentoGuardadoBiometria,
  IResumenBiometriaAnalista,
} from '@/types/autorizacion'

const VERDE = 'bg-primary-50 text-primary-800 ring-primary-200'
const ROJO = 'bg-red-50 text-red-800 ring-red-200'
const AMBAR = 'bg-amber-50 text-amber-900 ring-amber-200'
const GRIS = 'bg-gray-100 text-gray-700 ring-gray-200'

type ResultadoCotejo = Pick<IResumenBiometriaAnalista, 'estado' | 'documento_coincide'>

/** El estado guardado, dicho como lo lee el analista. «Verificada» en verde solo si el documento también cuadró. */
function estadoVisible(r: ResultadoCotejo): { texto: string; clase: string } {
  switch (r.estado) {
    case 'verificada':
      if (r.documento_coincide === true) return { texto: 'Verificada', clase: VERDE }
      return r.documento_coincide === false
        ? { texto: 'Rostro verificado, el documento no es del solicitante', clase: ROJO }
        : { texto: 'Rostro verificado, documento sin confirmar', clase: AMBAR }
    case 'no_coincide':
      return { texto: 'No coincide', clase: ROJO }
    case 'no_verificada':
      return { texto: 'No verificada', clase: AMBAR }
    case 'omitida':
      return { texto: 'No autorizada por el solicitante', clase: GRIS }
    case 'desactivada':
      return { texto: 'Desactivada', clase: GRIS }
    default:
      return { texto: String(r.estado), clase: GRIS }
  }
}

/** Por qué no quedó verificada, en claro. El texto guardado va aparte como detalle técnico. */
function motivoVisible(r: IResumenBiometriaAnalista): string | null {
  switch (r.estado) {
    case 'verificada':
      if (r.documento_coincide === false) return 'El rostro coincide, pero el documento fotografiado no es el del solicitante.'
      if (r.documento_coincide === null) return 'El rostro coincide, pero no se pudo leer el número del documento para compararlo.'
      return null
    case 'no_coincide':
      return r.similitud != null && r.similitud < r.umbral
        ? `La similitud quedó por debajo del mínimo (${pct(r.similitud)} frente a ${pct(r.umbral)}).`
        : 'Auco marcó el cotejo como fallido.'
    case 'no_verificada':
      return 'Auco no pudo hacer el cotejo.'
    default:
      return null
  }
}

const fechaHora = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

const fecha = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`)

export function VerBiometria({ expedienteId }: { expedienteId: string }) {
  const { hasRole } = usePermissions()
  const verComo = useVerComo()
  const habilitado = hasRole(['administrador', 'operador_analista']) && !verComo
  const { conEvidencia, resumen: resumenGuardado } = useResumenBiometria(expedienteId, habilitado)
  const { datos, cargando, error, consultar, limpiar, eliminarFotos } = useEvidenciaBiometria(expedienteId)
  const [abierto, setAbierto] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  if (!conEvidencia) return null

  const abrir = () => {
    setAbierto(true)
    void consultar()
  }
  const cerrar = () => {
    setAbierto(false)
    limpiar()
  }
  // El resultado guardado no depende de las fotos: se muestra siempre, también si fallan.
  const resumen = datos?.resumen ?? resumenGuardado
  const historial = resumen?.historial ?? []
  // Un solo intento (o un cotejo de antes, sin historial): la lista no agrega nada al resultado.
  const conHistorial = historial.length > 1
  // El resultado de arriba es el veredicto conservado, que no siempre es el último intento.
  const numeroDelResultado = conHistorial
    ? (historial.find((h) => h.verificado_en === resumen?.verificado_en)?.numero ?? null)
    : null
  const hayFotos = !!datos?.disponible && datos.intentos.length > 0
  const dias = datos?.dias_conservacion ?? 30
  // El mínimo con que se juzgó cada intento (el del panel pudo cambiar después).
  const umbralDe = (numero: number | null) => historial.find((h) => h.numero === numero)?.umbral ?? resumen?.umbral ?? null

  const eliminar = async () => {
    setEliminando(true)
    try {
      const r = await eliminarFotos()
      toast.success(r.eliminadas === 1 ? 'Se eliminó 1 intento con fotos.' : `Se eliminaron ${r.eliminadas} intentos con fotos.`)
      setConfirmarEliminar(false)
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'No pudimos eliminar las fotos. Intente de nuevo.')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <>
      <Button variante="secondary" onClick={abrir} className="min-h-10">
        <IconUserCheck size={16} />
        Ver biometría
      </Button>

      <Modal
        isOpen={abierto}
        onClose={cerrar}
        title="Verificación biométrica del solicitante"
        description="El resultado de comparar el rostro del solicitante con su documento y, si no se confirmó la identidad, las fotos que Cofianza conserva para esta revisión."
        size="xl"
        closeOnBackdrop
        footer={
          <ModalAcciones>
            {hayFotos && (
              <button type="button" onClick={() => setConfirmarEliminar(true)} className={botonModal('secondary')}>
                Eliminar fotos
              </button>
            )}
            <button type="button" onClick={cerrar} className={botonModal('primary')}>
              Cerrar
            </button>
          </ModalAcciones>
        }
      >
        <div className="space-y-4">
          {resumen && <ResumenCotejo resumen={resumen} />}
          {conHistorial && <IntentosGuardados historial={historial} numeroDelResultado={numeroDelResultado} />}

          <section aria-labelledby="bio-fotos" className="space-y-3">
            <h3 id="bio-fotos" className="text-sm font-semibold text-gray-900">
              Fotos de los intentos que no confirmaron la identidad
            </h3>
            {cargando ? (
              <div role="status" className="space-y-3">
                <span className="sr-only">Consultando las fotos guardadas…</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              </div>
            ) : error ? (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">No pudimos traer las fotos</p>
                  <p className="break-words">{error}</p>
                  <button
                    type="button"
                    onClick={() => void consultar()}
                    className="mt-2 inline-flex min-h-10 items-center gap-1.5 font-semibold underline"
                  >
                    <IconRefresh size={14} />
                    Reintentar
                  </button>
                </div>
              </div>
            ) : datos ? (
              !hayFotos ? (
                <Vacio texto={datos.motivo_no_disponible ?? 'Esta verificación no tiene fotos guardadas.'} />
              ) : (
                <>
                  <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <IconInfo size={16} className="mt-0.5 shrink-0 text-gray-500" />
                    <span>
                      Cofianza conserva estas fotos, cifradas, solo porque el cotejo no confirmó la identidad. Se eliminan
                      al decidir el estudio o a los {dias} días, y cada consulta queda registrada.
                    </span>
                  </p>
                  <ol className="space-y-4">
                    {datos.intentos.map((intento) => (
                      <IntentoConFotos
                        key={intento.id}
                        expedienteId={expedienteId}
                        intento={intento}
                        umbral={umbralDe(intento.numero)}
                      />
                    ))}
                  </ol>
                </>
              )
            ) : null}
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmarEliminar}
        onClose={() => setConfirmarEliminar(false)}
        onConfirm={eliminar}
        title="¿Eliminar las fotos guardadas?"
        message={
          <p>
            Úselo cuando la persona pida la supresión de sus fotos. Se eliminan todas las fotos guardadas de este estudio
            y no se pueden recuperar. El resultado del cotejo se conserva, y la eliminación queda en la bitácora.
          </p>
        }
        confirmLabel="Eliminar fotos"
        variant="danger"
        isLoading={eliminando}
      />
    </>
  )
}

function ResumenCotejo({ resumen }: { resumen: IResumenBiometriaAnalista }) {
  const estado = estadoVisible(resumen)
  const motivo = motivoVisible(resumen)
  const tecnico = resumen.estado !== 'omitida' && resumen.estado !== 'desactivada' ? resumen.motivo : null
  const documento =
    resumen.documento_coincide === true
      ? 'Coincide con el documento del solicitante'
      : resumen.documento_coincide === false
        ? 'No coincide con el documento del solicitante'
        : 'No se pudo comparar'
  return (
    <section aria-labelledby="bio-resultado" className="rounded-lg border border-gray-200 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="bio-resultado" className="font-semibold text-gray-900">
          Resultado del cotejo
        </h3>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${estado.clase}`}>
          {estado.texto}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">Similitud</dt>
          <dd className="font-medium text-gray-900">
            {pct(resumen.similitud)} <span className="font-normal text-gray-500">(mínimo {pct(resumen.umbral)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Fecha del cotejo</dt>
          <dd className="font-medium text-gray-900">{fechaHora(resumen.verificado_en)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Documento fotografiado</dt>
          <dd className="font-medium text-gray-900">
            {documento}
            {resumen.documento_ocr_masked && (
              <span className="ml-1 font-mono text-xs font-normal text-gray-500">{resumen.documento_ocr_masked}</span>
            )}
          </dd>
        </div>
        {resumen.nombre_ocr && (
          <div>
            <dt className="text-xs text-gray-500">Nombre leído del documento</dt>
            <dd className="break-words font-medium text-gray-900">{resumen.nombre_ocr}</dd>
          </div>
        )}
      </dl>
      {motivo && (
        <p className="mt-2 break-words text-gray-700">
          <span className="font-medium text-gray-900">Motivo: </span>
          {motivo}
        </p>
      )}
      {tecnico && <p className="mt-1 break-words text-xs text-gray-500">Detalle técnico registrado: {tecnico}</p>}
    </section>
  )
}

/** Por qué no quedó bien un intento guardado, en claro. La similitud ya se muestra aparte. */
function motivoIntento(h: IIntentoGuardadoBiometria): string | null {
  const base = (() => {
    switch (h.estado) {
      case 'verificada':
        if (h.documento_coincide === false) return 'El número leído del documento fotografiado no coincide con el del solicitante.'
        if (h.documento_coincide === null) return 'No se pudo leer el número del documento para compararlo.'
        return null
      case 'no_coincide':
        return h.similitud != null && h.similitud < h.umbral ? null : 'Auco marcó el cotejo como fallido.'
      case 'no_verificada':
        return 'No hubo cotejo: Auco no respondió o no pudo comparar las fotos, el documento no se podía consultar en Auco, o la persona siguió sin tomarlas.'
      case 'omitida':
        return 'La persona decidió continuar sin la verificación con foto.'
      case 'desactivada':
        return 'La verificación con foto estaba apagada en ese momento: no se hizo el cotejo.'
      default:
        return null
    }
  })()
  // El único código de Auco conocido: no distingue un documento falso de una foto mala de uno real.
  if (h.motivo_auco !== 'DOCUMENT_FAKE') return base
  const documento = 'Auco no pudo validar el documento fotografiado (puede ser una foto poco nítida).'
  return base ? `${base} Además, ${documento.charAt(0).toLowerCase()}${documento.slice(1)}` : documento
}

function IntentosGuardados({
  historial,
  numeroDelResultado,
}: {
  historial: IIntentoGuardadoBiometria[]
  numeroDelResultado: number | null
}) {
  const masReciente = historial[0]?.numero
  const guia =
    numeroDelResultado != null && numeroDelResultado !== masReciente
      ? ` El resultado de arriba es el del intento ${numeroDelResultado}: un intento posterior sin cotejo no reemplaza una alerta.`
      : ''
  return (
    <section aria-labelledby="bio-intentos" className="rounded-lg border border-gray-200 p-3 text-sm">
      <h3 id="bio-intentos" className="font-semibold text-gray-900">
        Intentos de la persona ({historial.length})
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Del más reciente al más antiguo.{guia}
        {historial.length >= 10 && ' Se guardan los 10 más recientes.'}
      </p>
      <ol className="mt-2 divide-y divide-gray-100">
        {historial.map((h) => {
          const estado = estadoVisible(h)
          const motivo = motivoIntento(h)
          const bajoMinimo = h.similitud != null && h.similitud < h.umbral
          return (
            <li key={h.numero} className="py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-gray-900">Intento {h.numero}</span>
                <span className="text-gray-600">{fechaHora(h.verificado_en)}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${estado.clase}`}>
                  {estado.texto}
                </span>
              </div>
              {h.similitud != null && (
                <p className="mt-0.5 text-gray-700">
                  Similitud <span className="font-semibold text-gray-900">{pct(h.similitud)}</span>{' '}
                  {bajoMinimo ? (
                    <span className="text-red-700">
                      (por debajo del <span className="whitespace-nowrap">mínimo de {pct(h.umbral)})</span>
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-gray-500">(mínimo {pct(h.umbral)})</span>
                  )}
                </p>
              )}
              {motivo && <p className="mt-0.5 break-words text-gray-700">{motivo}</p>}
              {h.motivo_auco && (
                <p className="mt-0.5 break-all text-xs text-gray-500">
                  Detalle técnico de Auco: <span className="font-mono">{h.motivo_auco}</span>
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function IntentoConFotos({
  expedienteId,
  intento,
  umbral,
}: {
  expedienteId: string
  intento: IIntentoConFotos
  umbral: number | null
}) {
  const estado = estadoVisible(intento)
  const titulo = intento.numero != null ? `Intento ${intento.numero}` : 'Intento'
  const bajoMinimo = intento.similitud != null && umbral != null && intento.similitud < umbral
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="font-semibold text-gray-900">{titulo}</p>
        <p className="text-gray-600">{fechaHora(intento.fecha)}</p>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${estado.clase}`}>
          {estado.texto}
        </span>
        {intento.similitud != null && (
          <p className="text-gray-700">
            Similitud <span className="font-semibold text-gray-900">{pct(intento.similitud)}</span>
            {bajoMinimo && (
              <span className="text-red-700">
                {' '}
                (por debajo del <span className="whitespace-nowrap">mínimo de {pct(umbral)})</span>
              </span>
            )}
          </p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Foto expedienteId={expedienteId} fotoId={intento.id} cual="selfie" titulo="Selfie" icono={<IconUser size={14} />} intento={titulo} />
        <Foto expedienteId={expedienteId} fotoId={intento.id} cual="documento" titulo="Documento" icono={<IconId size={14} />} intento={titulo} />
      </div>
      <p className="mt-2 text-xs text-gray-500">Se conservan como máximo hasta el {fecha(intento.borrar_antes_de)}.</p>
    </li>
  )
}

function Foto({
  expedienteId,
  fotoId,
  cual,
  titulo,
  icono,
  intento,
}: {
  expedienteId: string
  fotoId: string
  cual: CualFotoBiometria
  titulo: string
  icono: ReactNode
  intento: string
}) {
  const { url, error, reintentable, cargando, reintentar } = useFotoBiometria(expedienteId, fotoId, cual)
  const alt = `${titulo} del ${intento.toLowerCase()}`
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        {icono}
        {titulo}
      </figcaption>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`${alt}: ampliar en otra pestaña`}
        >
          {/* Imagen local (blob:) que se revoca al cerrar: <img> normal, sin next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt} className="h-48 w-full rounded-lg border border-gray-200 bg-gray-50 object-contain" />
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm"
          >
            <IconExternalLink size={12} />
            Ampliar
          </span>
        </a>
      ) : cargando ? (
        <div role="status">
          <span className="sr-only">Cargando {alt.toLowerCase()}…</span>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-center text-xs text-gray-600">
          <IconCamera size={18} />
          <span className="break-words">{error}</span>
          {reintentable && (
            <button type="button" onClick={reintentar} className="inline-flex min-h-10 items-center gap-1 font-semibold underline">
              <IconRefresh size={12} />
              Reintentar
            </button>
          )}
        </div>
      )}
    </figure>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
      <IconCamera size={22} className="text-gray-400" />
      <p>{texto}</p>
    </div>
  )
}
