/**
 * Adenda 5 §7: el estudio quedó «aprobado sujeto a paz y salvo». Es un
 * subestado de la revisión manual (el expediente sigue en revisión), como la
 * condición de coarrendatario: espera al candidato, no al analista.
 *
 *  - Cofianza (administrador u operador) ve las obligaciones exigidas, los
 *    soportes 'paz_y_salvo' que cargó el candidato y «Acreditar paz y salvo»
 *    (con el documento, o declarando que una nueva consulta la muestra al día).
 *    Al acreditar se consuma la aprobación que quedó en espera.
 *  - La inmobiliaria y el propietario solo ven «Requisito pendiente a cargo del
 *    candidato · hasta dd/mm» y, ya cargado, «Requisito cargado: lo revisa
 *    Cofianza» (como la lista): el acreedor y el monto son reservados (§10).
 *
 * Mientras esté pendiente la API responde 409 a aprobar, a «Cambiar estado →
 * Aprobado» y a reasignar; no aprobarlo sigue siendo «Cambiar estado».
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { InfoTip } from '@/components/ui/InfoTip'
import { IconCheck, IconClock, IconLoader, IconShieldCheck } from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import type { SoporteListItem } from '@/services/expedienteSoportesService'
import type { IAcreditarPazYSalvoInput, IObligacionMoraA5, IPazYSalvo } from '@/types/estudio'
import { diaMes, obligacionesExigidas, pazYSalvoYaCargado, textoRequisitoPendiente } from '@/lib/pazYSalvo'
import { fechaCondicion } from './textoVisible'
import { ObligacionesEnMora } from './ObligacionesEnMora'
import { SoportesCondicionadoSection } from './SoportesCondicionadoSection'
import { useRefrescoExpediente } from './ExpedienteRefresco'

const MIN_NOTA = 10

interface Props {
  expedienteId: string
  pazYSalvo: IPazYSalvo
  esCofianza: boolean
  /** Las obligaciones en mora de la escalera (GET mora-vigente), para el detalle de las exigidas. */
  obligacionesEnMora?: IObligacionMoraA5[]
  /** Estudio sin propiedad: al acreditarlo, el contrato espera a que se vincule el inmueble. */
  sinInmueble?: boolean
  /** Acreditado: el estudio pasó a Aprobado; quien monta la tarjeta recarga. */
  onAcreditado?: () => void
}

export function PazYSalvoPendiente({ expedienteId, pazYSalvo, esCofianza, obligacionesEnMora = [], sinInmueble, onAcreditado }: Props) {
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [acreditarAbierto, setAcreditarAbierto] = useState(false)
  // null = leyendo (o sin leer todavía); con errorSoportes, la lectura falló: no es «no cargó nada».
  const [soportes, setSoportes] = useState<SoporteListItem[] | null>(null)
  const [errorSoportes, setErrorSoportes] = useState(false)
  const [versionSoportes, setVersionSoportes] = useState(0)
  // Relee la lista con cada recarga del detalle («Actualizar», avisos): el documento pudo llegar con la página abierta.
  const cargas = useRefrescoExpediente()
  // Hora fijada al montar: Date.now() en render es impuro (cambia en cada render).
  const [ahora] = useState(() => Date.now())
  const fecha = fechaCondicion(pazYSalvo.vence_en)
  const vencida = !!pazYSalvo.vencida || new Date(pazYSalvo.vence_en).getTime() <= ahora
  const exigidas = esCofianza ? obligacionesExigidas(pazYSalvo, obligacionesEnMora) : []
  // Ya lo cargó (cargado_en para Cofianza, cargado para la inmobiliaria y el propietario):
  // falta que Cofianza lo revise y lo acredite, como dicen la lista y «Qué sigue».
  const cargado = pazYSalvoYaCargado(pazYSalvo)

  const handleEnviarEnlace = async () => {
    setEnviandoEnlace(true)
    try {
      const res = await expedienteService.enviarEnlaceDocumentos(expedienteId)
      toast.success(`Enlace enviado al candidato (${res.email_destino}). El anterior ya no sirve.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setEnviandoEnlace(false)
    }
  }

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50/60 p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <IconClock size={20} className="text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-0.5 inline-flex flex-wrap items-center gap-1 text-base font-semibold text-gray-900">
            {esCofianza
              ? 'Aprobado sujeto a paz y salvo: qué sigue'
              : cargado
                ? 'Requisito cargado: lo revisa Cofianza'
                : 'Requisito pendiente del candidato'}
            <InfoTip
              texto="Un analista de Cofianza aprobó el estudio con un requisito que debe cumplir el candidato. Mientras no lo acredite, no se puede crear el contrato ni se expide la fianza."
              lado="derecha"
            />
          </h3>

          {esCofianza ? (
            <>
              <p className="text-sm text-gray-700">
                {vencida
                  ? `Venció el plazo para acreditar el paz y salvo (${fecha}). La plataforma lo resuelve en breve: si el candidato cargó el documento y nadie lo ha revisado, vuelve a su revisión; si no, el estudio se cierra como no aprobado.`
                  : pazYSalvo.cargado_en
                    ? `El candidato cargó el paz y salvo el ${fechaCondicion(pazYSalvo.cargado_en)}. Revíselo abajo y acredítelo si muestra ${
                        exigidas.length === 1 ? 'la obligación pagada o al día' : 'las obligaciones pagadas o al día'
                      }; el plazo del candidato vence el ${fecha}.`
                    : `El candidato tiene hasta el ${fecha} para acreditar el paz y salvo de ${exigidas.length === 1 ? 'esta obligación' : 'estas obligaciones'}. Le escribimos con el detalle y el enlace para cargarlo.`}
              </p>
              {exigidas.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold text-gray-700">Obligaciones exigidas</p>
                  <ObligacionesEnMora obligaciones={exigidas} />
                </div>
              )}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-gray-700">Paz y salvo que cargó el candidato</p>
                <SoportesCondicionadoSection
                  expedienteId={expedienteId}
                  permitirSubir={false}
                  soloProposito="paz_y_salvo"
                  onSoportes={(lista, error) => {
                    setSoportes(lista)
                    setErrorSoportes(!!error)
                  }}
                  version={versionSoportes + cargas}
                />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    // Lo último que cargó el candidato, no lo que había al abrir la página.
                    setVersionSoportes((n) => n + 1)
                    setAcreditarAbierto(true)
                  }}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-800"
                >
                  <IconShieldCheck size={16} />
                  Acreditar paz y salvo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleEnviarEnlace()
                  }}
                  disabled={enviandoEnlace}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {enviandoEnlace ? 'Enviando…' : 'Reenviar el enlace al candidato'}
                </button>
              </div>
              <p className="mt-4 text-xs text-gray-600">
                Mientras el requisito esté pendiente no se puede aprobar a mano, crear el contrato ni reasignar el estudio a
                otra propiedad. Para no aprobarlo, use «Cambiar estado», arriba.
              </p>
            </>
          ) : (
            <>
              {!cargado && <p className="text-sm font-medium text-amber-900">{textoRequisitoPendiente(pazYSalvo.vence_en)}</p>}
              <p className={cargado ? 'text-sm text-gray-700' : 'mt-1 text-sm text-gray-700'}>
                {vencida
                  ? 'Venció el plazo para cumplir el requisito. Cofianza lo resuelve en breve y le avisamos por notificación y correo.'
                  : cargado
                    ? 'El candidato cargó el requisito pendiente y Cofianza lo revisa. Usted no tiene que hacer nada; le avisamos por notificación y correo cuando se resuelva. Por reserva, Cofianza no comparte el detalle con la inmobiliaria ni con el propietario; mientras tanto no se puede crear el contrato.'
                    : `Un analista de Cofianza aprobó el estudio sujeto a un requisito que debe cumplir el candidato a más tardar el ${fecha}. Por reserva, Cofianza no comparte el detalle con la inmobiliaria ni con el propietario. Mientras tanto no se puede crear el contrato.`}
              </p>
              {!vencida && !cargado && (
                // Al vencer con el documento cargado y sin revisar, el caso vuelve a un analista (no se cierra).
                <p className="mt-2 text-sm text-gray-700">
                  No tiene que hacer nada: cuando Cofianza confirme el requisito, el estudio pasa a Aprobado; si el candidato no lo
                  cumple dentro del plazo, se cierra como no aprobado. Le avisamos por notificación y correo.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {esCofianza && acreditarAbierto && (
        <AcreditarPazYSalvoModal
          expedienteId={expedienteId}
          venceEn={pazYSalvo.vence_en}
          soportes={soportes}
          errorSoportes={errorSoportes}
          onReintentarSoportes={() => setVersionSoportes((n) => n + 1)}
          sinInmueble={sinInmueble}
          onClose={() => setAcreditarAbierto(false)}
          onAcreditado={() => {
            setAcreditarAbierto(false)
            setVersionSoportes((n) => n + 1)
            onAcreditado?.()
          }}
        />
      )}
    </div>
  )
}

/**
 * «Acreditar paz y salvo»: con el documento que cargó el candidato o con una
 * nueva consulta a la central (el analista declara que la muestra al día; la
 * plataforma no la lanza sola: cuesta una consulta y la central se actualiza
 * cada mes). Al confirmar, la aprobación que quedó en espera se consuma.
 */
function AcreditarPazYSalvoModal({
  expedienteId,
  venceEn,
  soportes,
  errorSoportes,
  onReintentarSoportes,
  sinInmueble,
  onClose,
  onAcreditado,
}: {
  expedienteId: string
  venceEn: string
  /** null = todavía leyendo (o la lectura falló, con errorSoportes). */
  soportes: SoporteListItem[] | null
  errorSoportes: boolean
  onReintentarSoportes: () => void
  sinInmueble?: boolean
  onClose: () => void
  onAcreditado: () => void
}) {
  // Nada se fija al abrir: mientras la lista llega, la vía y el documento salen de lo último leído.
  const [viaElegida, setVia] = useState<'documento' | 'consulta' | null>(null)
  const via = viaElegida ?? (soportes === null || soportes.length > 0 ? 'documento' : 'consulta')
  const [soporteElegido, setSoporteId] = useState('')
  const soporteId =
    soporteElegido && soportes?.some((s) => s.id === soporteElegido)
      ? soporteElegido
      : soportes?.length === 1
        ? soportes[0].id
        : ''
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)

  const faltantes: string[] = []
  if (via === 'documento' && !soporteId) {
    faltantes.push(
      errorSoportes
        ? 'No se pudieron leer los documentos del candidato: reintente la lectura o elija «Verificado en una nueva consulta a la central».'
        : soportes === null
          ? 'Espere a que carguen los documentos del candidato.'
          : soportes.length === 0
            ? 'El candidato todavía no ha cargado el paz y salvo: elija «Verificado en una nueva consulta a la central» o espere el documento.'
            : 'Elija el documento que revisó.',
    )
  }
  if (via === 'consulta' && nota.trim().length < MIN_NOTA) faltantes.push(`Escriba qué mostró la nueva consulta (mínimo ${MIN_NOTA} caracteres).`)

  const acreditar = async () => {
    if (enviando || faltantes.length > 0) return
    setEnviando(true)
    try {
      const body: IAcreditarPazYSalvoInput =
        via === 'documento'
          ? { via: 'documento', soporte_id: soporteId, ...(nota.trim() ? { nota: nota.trim() } : {}) }
          : { via: 'consulta', nota: nota.trim() }
      await expedienteService.acreditarPazYSalvo(expedienteId, body)
      toast.success(
        sinInmueble
          ? 'Paz y salvo acreditado: el estudio quedó aprobado. Para crear el contrato, primero vincule el inmueble.'
          : 'Paz y salvo acreditado: el estudio quedó aprobado y ya se puede crear el contrato.',
      )
      onAcreditado()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo acreditar el paz y salvo.')
    } finally {
      setEnviando(false)
    }
  }

  const opcion = (valor: 'documento' | 'consulta', titulo: string, ayuda: string) => (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
        via === valor ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
      }`}
    >
      <input
        type="radio"
        name="via-paz-y-salvo"
        checked={via === valor}
        onChange={() => setVia(valor)}
        disabled={enviando}
        className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="min-w-0">
        <span className="block font-medium text-gray-900">{titulo}</span>
        <span className="block text-xs text-gray-600">{ayuda}</span>
      </span>
    </label>
  )

  return (
    <Modal
      isOpen
      onClose={enviando ? () => {} : onClose}
      title="Acreditar paz y salvo"
      description={`Plazo del candidato: hasta el ${fechaCondicion(venceEn)}. Acredítelo solo si lo que revisó muestra la obligación pagada o al día.`}
      size="lg"
      footer={
        <div className="space-y-2 text-sm">
          {/* Pie fijo, como en «Aprobar estudio»: en el celular el botón no queda debajo del pliegue. */}
          {faltantes.length > 0 ? (
            <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              <p className="font-semibold">Para acreditar falta:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {faltantes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p role="status" className="flex items-center gap-1.5 font-medium text-primary-800">
              <IconCheck size={16} className="shrink-0" />
              Todo completo: revise «Al acreditar» y confirme.
            </p>
          )}
          <ModalAcciones>
            <button type="button" onClick={onClose} disabled={enviando} className={botonModal('secondary')}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void acreditar()
              }}
              disabled={enviando || faltantes.length > 0}
              aria-busy={enviando || undefined}
              className={botonModal('primary')}
            >
              {enviando ? <IconLoader size={16} className="animate-spin" /> : <IconShieldCheck size={16} />}
              {enviando ? 'Acreditando…' : 'Acreditar y aprobar'}
            </button>
          </ModalAcciones>
        </div>
      }
    >
      <div className="space-y-4 text-sm">

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-gray-700">Cómo lo verificó <span className="text-red-600" aria-hidden="true">*</span></legend>
          {opcion('documento', 'Con el paz y salvo que cargó el candidato', 'El documento de la entidad acreedora que certifica que la obligación está paga.')}
          {opcion(
            'consulta',
            'Verificado en una nueva consulta a la central',
            'Una consulta posterior muestra la obligación al día o cerrada. La plataforma no la lanza sola: escriba qué consultó y qué mostró.',
          )}
        </fieldset>

        {via === 'documento' &&
          (errorSoportes ? (
            <p role="status" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              No se pudieron leer los documentos que cargó el candidato.{' '}
              <button type="button" onClick={onReintentarSoportes} className="font-medium underline">
                Reintentar
              </button>
            </p>
          ) : soportes === null ? (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
              <IconLoader size={14} className="shrink-0 animate-spin" />
              Leyendo los documentos que cargó el candidato…
            </p>
          ) : soportes.length === 0 ? (
            <p className="rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
              El candidato todavía no ha cargado el paz y salvo. Puede reenviarle el enlace desde la tarjeta.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-gray-700">Documento revisado <span className="text-red-600" aria-hidden="true">*</span></legend>
              {soportes.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
                  <input
                    type="radio"
                    name="soporte-paz-y-salvo"
                    checked={soporteId === s.id}
                    onChange={() => setSoporteId(s.id)}
                    disabled={enviando}
                    className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900">{s.nombre_original}</span>
                    <span className="block text-xs text-gray-500">Cargado el {diaMes(s.created_at)}</span>
                  </span>
                  {s.archivo_url && (
                    <a
                      href={s.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="-my-2 -mr-1 inline-flex min-h-10 shrink-0 items-center px-2 text-xs font-medium text-primary-700 hover:underline"
                    >
                      Ver
                    </a>
                  )}
                </label>
              ))}
            </fieldset>
          ))}

        <label className="block text-sm font-medium text-gray-700">
          {via === 'consulta' ? (
            <>
              Qué consultó y qué mostró <span className="text-red-600" aria-hidden="true">*</span>
            </>
          ) : (
            <>
              Nota <span className="font-normal text-gray-500">(opcional)</span>
            </>
          )}
          <span className="mt-0.5 block text-xs font-normal text-gray-600">Queda en el registro interno.</span>
          <textarea
            required={via === 'consulta'}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={enviando}
            placeholder={
              via === 'consulta'
                ? 'Por ejemplo: consulta del 18/11 en la central; la obligación aparece al día (mínimo 10 caracteres)'
                : 'Por ejemplo: certificado de la entidad con fecha y firma; coincide con la cuenta'
            }
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
        </label>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
          <p className="font-semibold text-gray-900">Al acreditar</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              {sinInmueble
                ? 'El estudio pasa a Aprobado con la decisión que se tomó al exigir el paz y salvo. Para crear el contrato, primero vincule el inmueble.'
                : 'El estudio pasa a Aprobado con la decisión que se tomó al exigir el paz y salvo, y se puede crear el contrato.'}
            </li>
            <li>Se cobra la tarifa de aprobación no automática.</li>
            <li>{sinInmueble ? 'Se le avisa al candidato y al responsable del estudio.' : 'Se le avisa al candidato y a la inmobiliaria o al propietario.'}</li>
          </ul>
        </div>

      </div>
    </Modal>
  )
}
