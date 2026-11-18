'use client'

/**
 * «Ver biometría» en la revisión manual (Opción 1 aprobada por Gerencia).
 *
 * El analista de Cofianza ve la selfie, el documento, la similitud y el motivo
 * del cotejo sin entrar al panel de Auco. Las fotos no se guardan en Cofianza:
 * la API se las pide a Auco cuando se abre esta ventana (nunca antes) y sus
 * enlaces vencen a los 5 minutos. Al cerrar se olvidan; al volver a abrir se
 * piden de nuevo.
 *
 * Hoy la autorización le pide a la persona UNA foto del documento (el lado con
 * su foto): el reverso solo se muestra si Auco lo trae.
 *
 * Solo administrador y operador, nunca en «ver como» (la API también lo niega),
 * y solo si el estudio tiene un cotejo con fotos que consultar.
 */

import { useState, type ReactNode } from 'react'
import {
  IconAlertTriangle,
  IconCamera,
  IconCheckCircle,
  IconExternalLink,
  IconId,
  IconInfo,
  IconLoader,
  IconRefresh,
  IconUser,
  IconUserCheck,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useVerComo } from '@/components/expedientes/VerComo'
import { usePermissions } from '@/hooks/usePermissions'
import { useEvidenciaBiometria, useResumenBiometria } from '@/hooks/useBiometriaEvidencia'
import type { IIntentoBiometria, IResumenBiometriaAnalista } from '@/types/autorizacion'

const VERDE = 'bg-primary-50 text-primary-800 ring-primary-200'
const ROJO = 'bg-red-50 text-red-800 ring-red-200'
const AMBAR = 'bg-amber-50 text-amber-900 ring-amber-200'
const GRIS = 'bg-gray-100 text-gray-700 ring-gray-200'

/** El estado guardado, dicho como lo lee el analista. «Verificada» en verde solo si el documento también cuadró. */
function estadoVisible(r: IResumenBiometriaAnalista): { texto: string; clase: string } {
  switch (r.estado) {
    case 'verificada':
      return r.documento_coincide === true
        ? { texto: 'Verificada', clase: VERDE }
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

const hora = (ms: number) =>
  new Date(ms).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`)

export function VerBiometria({ expedienteId }: { expedienteId: string }) {
  const { hasRole } = usePermissions()
  const verComo = useVerComo()
  const habilitado = hasRole(['administrador', 'operador_analista']) && !verComo
  const { conEvidencia } = useResumenBiometria(expedienteId, habilitado)
  const { datos, cargando, error, reintentable, recibidoEn, vencido, consultar, limpiar } = useEvidenciaBiometria(expedienteId)
  const [abierto, setAbierto] = useState(false)

  if (!conEvidencia) return null

  const abrir = () => {
    setAbierto(true)
    void consultar()
  }
  const cerrar = () => {
    setAbierto(false)
    limpiar()
  }
  const venceA = datos?.vence_en_segundos && recibidoEn ? recibidoEn + datos.vence_en_segundos * 1000 : null
  const hayFotos = !!datos?.disponible && datos.intentos.length > 0
  // Volver a pedir solo sirve con fotos (vencen). Sin fotos no cambia nada; con error, «Reintentar».
  const puedeReconsultar = cargando || hayFotos

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
        description="Lo que Auco registró al comparar el rostro del solicitante con su documento de identidad."
        size="xl"
        closeOnBackdrop
        footer={
          <ModalAcciones>
            <button type="button" onClick={cerrar} className={botonModal(puedeReconsultar ? 'secondary' : 'primary')}>
              Cerrar
            </button>
            {puedeReconsultar && (
              <button
                type="button"
                onClick={() => void consultar()}
                disabled={cargando}
                aria-busy={cargando || undefined}
                className={botonModal('primary')}
              >
                {cargando ? <IconLoader size={16} className="animate-spin" /> : <IconRefresh size={16} />}
                {cargando ? 'Consultando…' : 'Volver a consultar las fotos'}
              </button>
            )}
          </ModalAcciones>
        }
      >
        <div className="space-y-4">
          {(cargando || hayFotos) && (
            <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <IconInfo size={16} className="mt-0.5 shrink-0 text-gray-500" />
              <span>
                Las imágenes vienen de Auco y no se guardan en Cofianza. Los enlaces vencen a los 5 minutos: si no
                cargan, vuelva a consultarlas.
              </span>
            </p>
          )}

          {cargando ? (
            <div role="status" className="space-y-3">
              <span className="sr-only">Consultando las fotos en Auco…</span>
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          ) : error ? (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">No pudimos traer la verificación</p>
                <p className="break-words">{error}</p>
                {reintentable && (
                  <button
                    type="button"
                    onClick={() => void consultar()}
                    className="mt-2 inline-flex min-h-10 items-center gap-1.5 font-semibold underline"
                  >
                    <IconRefresh size={14} />
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          ) : datos ? (
            <>
              {datos.resumen && <ResumenCotejo resumen={datos.resumen} />}

              {!datos.disponible ? (
                <Vacio texto={datos.motivo_no_disponible ?? 'Esta verificación no tiene fotos que consultar.'} />
              ) : datos.intentos.length === 0 ? (
                <Vacio texto="Auco no devolvió fotos para esta verificación." />
              ) : (
                <>
                  {vencido ? (
                    <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                      Los enlaces de estas fotos ya vencieron. Use «Volver a consultar las fotos» para verlas de nuevo.
                    </p>
                  ) : (
                    venceA && (
                      <p className="text-sm text-gray-600">
                        Consultadas a las {hora(recibidoEn!)}; los enlaces vencen a las {hora(venceA)}
                      </p>
                    )
                  )}
                  <p className="text-sm text-gray-600">
                    Se muestra el último cotejo que hizo la persona. Si repitió las fotos, los cotejos anteriores no
                    aparecen aquí.
                  </p>
                  <ol className="space-y-4">
                    {datos.intentos.map((intento) => (
                      <Intento key={intento.numero} intento={intento} umbral={datos.resumen?.umbral ?? null} />
                    ))}
                  </ol>
                </>
              )}
            </>
          ) : null}
        </div>
      </Modal>
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

function Intento({ intento, umbral }: { intento: IIntentoBiometria; umbral: number | null }) {
  const bajoMinimo = intento.similitud != null && umbral != null && intento.similitud < umbral
  // Hoy se toma una sola foto del documento: el reverso solo aparece si Auco lo trae.
  const conReverso = !!intento.cedula_reverso_url
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="font-semibold text-gray-900">Intento {intento.numero}</p>
        <p className="text-gray-600">{fechaHora(intento.fecha)}</p>
        {intento.exitoso != null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
              intento.exitoso ? VERDE : ROJO
            }`}
          >
            {intento.exitoso ? <IconCheckCircle size={12} /> : <IconAlertTriangle size={12} />}
            {intento.exitoso ? 'Según Auco: superado' : 'Según Auco: no superado'}
          </span>
        )}
        <p className="text-gray-700">
          Similitud <span className="font-semibold text-gray-900">{pct(intento.similitud)}</span>
          {bajoMinimo && <span className="text-red-700"> (por debajo del mínimo de {pct(umbral)})</span>}
        </p>
      </div>
      {/* Con «no superado» la insignia ya lo dice: el texto solo cuando Auco dejó observaciones. */}
      {intento.exitoso !== false && intento.motivo && <p className="mt-1 text-sm text-gray-700">{intento.motivo}</p>}
      {intento.codigos_error.length > 0 && (
        <p className="mt-1 break-all text-xs text-gray-500">
          Detalle técnico de Auco: <span className="font-mono">{intento.codigos_error.join(' · ')}</span>
        </p>
      )}
      <div className={`mt-3 grid grid-cols-1 gap-3 ${conReverso ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Foto url={intento.selfie_url} titulo="Selfie" icono={<IconUser size={14} />} numero={intento.numero} />
        <Foto
          url={intento.cedula_frente_url}
          titulo={conReverso ? 'Documento (frente)' : 'Documento'}
          icono={<IconId size={14} />}
          numero={intento.numero}
        />
        {conReverso && (
          <Foto url={intento.cedula_reverso_url} titulo="Documento (reverso)" icono={<IconId size={14} />} numero={intento.numero} />
        )}
      </div>
    </li>
  )
}

function Foto({ url, titulo, icono, numero }: { url: string | null; titulo: string; icono: ReactNode; numero: number }) {
  const [fallo, setFallo] = useState(false)
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        {icono}
        {titulo}
      </figcaption>
      {url && !fallo ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="relative block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={`${titulo} del intento ${numero}: ampliar en otra pestaña`}
        >
          {/* URL firmada de Auco que vence en 5 minutos: <img> normal (sin next/image) y sin carga diferida. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${titulo} del intento ${numero}`}
            referrerPolicy="no-referrer"
            onError={() => setFallo(true)}
            className="h-48 w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm"
          >
            <IconExternalLink size={12} />
            Ampliar
          </span>
        </a>
      ) : (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-center text-xs text-gray-500">
          <IconCamera size={18} />
          {url ? 'No cargó. Puede que el enlace haya vencido: vuelva a consultar las fotos.' : 'Esta foto no está disponible en Auco.'}
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
