'use client'

/**
 * /coarrendatario/[token] — vista pública del invitado.
 *
 * Gerencia (5-may-2026): el invitado abre el link que recibe por correo,
 * acepta T&C + política de tratamiento de datos, y ahí mismo se dispara
 * su evaluación crediticia. NO necesita crear cuenta.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { IconCheck, IconCheckCircle, IconRefresh } from '@/components/icons'
import {
  coarrendatarioService,
  type ICoarrendatarioPublicView,
} from '@/services/coarrendatarioService'
import { esErrorTransitorio, mensajeParaProspecto } from '@/lib/errorMessages'
import { ContactoCofianza } from '@/components/public/ContactoCofianza'
import { EsqueletoFlujo } from '@/components/public/EsqueletoFlujo'
import { CampoCorreoResultado } from '@/components/public/CampoCorreoResultado'
import { correoParaEnviar, correoResultadoValido } from '@/lib/correoResultado'

/** «CC ••••5678» (así lo manda la API) → «Cédula de ciudadanía» + «5678». */
const TIPO_DOCUMENTO_LARGO: Record<string, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PPT: 'Permiso por protección temporal',
  PEP: 'Permiso especial de permanencia',
  TI: 'Tarjeta de identidad',
  PASAPORTE: 'Pasaporte',
  NIT: 'NIT',
}

function documentoLegible(documento: string): { tipo: string; ultimos: string | null } {
  const m = /^(.+?)\s*[•*]+\s*(\S+)$/.exec(documento.trim())
  if (!m) return { tipo: documento, ultimos: null }
  return { tipo: TIPO_DOCUMENTO_LARGO[m[1].toUpperCase()] ?? m[1], ultimos: m[2] }
}

/** Se reenvió la invitación (p. ej. con el documento corregido): el token viejo ya no existe. */
const ENLACE_REEMPLAZADO =
  'Este enlace ya no sirve: le enviaron una invitación nueva. Ábrala desde el correo o el WhatsApp más reciente.'

function esEnlaceReemplazado(err: unknown): boolean {
  const e = err as { statusCode?: number; code?: string } | null
  return e?.statusCode === 404 && e?.code === 'COARRENDATARIO_NOT_FOUND'
}

type Phase = 'cargando' | 'lista' | 'aceptando' | 'aceptado' | 'rechazando' | 'rechazado' | 'reportando' | 'reportado' | 'no_soy_yo' | 'error'

export default function CoarrendatarioPublicPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token as string | undefined

  const [view, setView] = useState<ICoarrendatarioPublicView | null>(null)
  const [phase, setPhase] = useState<Phase>('cargando')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Sin conexión / 5xx / 429: el enlace está bien, lo que falló fue el camino.
  const [reintentable, setReintentable] = useState(false)
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false)
  const [confirmandoNoSoyYo, setConfirmandoNoSoyYo] = useState(false)
  // Reportar el documento es deliberado: pasa por un diálogo que dice qué pasa.
  const [confirmandoDocumento, setConfirmandoDocumento] = useState(false)
  // «Sí, es mi documento»: el camino principal; sin él no se autoriza.
  const [documentoConfirmado, setDocumentoConfirmado] = useState(false)
  // Intentó autorizar sin confirmar: el error trae «Ir a confirmar mi documento».
  const [faltaConfirmarDocumento, setFaltaConfirmarDocumento] = useState(false)
  // Errores del reporte y de «No soy…»: se pintan debajo de esos enlaces, no al fondo.
  const [docErrorMsg, setDocErrorMsg] = useState<string | null>(null)
  // Volvió con «Me equivoqué»: el aviso ya salió.
  const [yaReportado, setYaReportado] = useState(false)
  const documentoRef = useRef<HTMLElement>(null)
  const confirmarDocumentoRef = useRef<HTMLButtonElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (errorMsg) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [errorMsg])

  // Checkboxes T&C
  // §8.4: "la casilla de aceptación no puede venir marcada por defecto".
  // Estos `false` son normativos — no los cambies ni los derives de nada.
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptData, setAcceptData] = useState(false)
  // Sus datos de notificación: el contrato los imprime (cláusula de notificaciones).
  const [direccion, setDireccion] = useState('')
  const [municipio, setMunicipio] = useState('')
  // El correo para el resultado de su evaluación: solo si la API lo pide (prellenado con el de la invitación).
  const [correoResultado, setCorreoResultado] = useState('')
  const [errorCorreo, setErrorCorreo] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const fetchView = useCallback(async () => {
    if (!token) return
    setPhase('cargando')
    try {
      const data = await coarrendatarioService.getPublicByToken(token)
      setView(data)
      if (data.contacto_resultado?.requerido) setCorreoResultado((actual) => actual || data.email || '')
      // Si ya respondió antes, saltamos a la pantalla correspondiente.
      if (data.estado === 'aceptado') {
        setPhase('aceptado')
        // Puede reabrirlo días después: «estamos procesando» no siempre es cierto.
        setResultMsg(`Ya aceptó esta invitación. Le escribimos a ${data.email} cuando su evaluación termine.`)
      } else if (data.estado === 'estudio_completado') {
        setPhase('aceptado')
        setResultMsg('Ya había aceptado esta invitación y su evaluación terminó.')
      } else if (data.estado === 'rechazado_invitacion') {
        setPhase('rechazado')
      } else {
        setPhase('lista')
      }
    } catch (err) {
      // El invitado no tiene cuenta ni a quien preguntarle: un 'Too many
      // requests' del limitador por IP (CGNAT de las operadoras) o un 5xx en
      // crudo lo dejaban sin saber si fue culpa suya ni que hacer.
      setErrorMsg(mensajeParaProspecto(err, 'No se pudo cargar la invitación.'))
      setReintentable(esErrorTransitorio(err))
      setPhase('error')
    }
  }, [token])

  useEffect(() => { fetchView() }, [fetchView])

  const handleAceptar = async () => {
    if (!token) return
    // No va en `disabled`: con el botón apagado no sabría qué le falta.
    if (view?.documento && !documentoConfirmado) {
      setErrorMsg('Antes de autorizar, confirme arriba que el documento es el suyo («Sí, es mi documento»).')
      setFaltaConfirmarDocumento(true)
      return
    }
    setFaltaConfirmarDocumento(false)
    if (direccion.trim().length < 5 || municipio.trim().length < 2) {
      setErrorMsg('Escriba su dirección de residencia y su municipio.')
      return
    }
    const pideCorreo = !!view?.contacto_resultado?.requerido
    if (pideCorreo && !correoResultadoValido(correoResultado)) {
      setErrorCorreo(true)
      setErrorMsg('Revise el correo donde quiere recibir el resultado de su evaluación.')
      return
    }
    if (!acceptTerms || !acceptData) {
      setErrorMsg('Debe aceptar los términos y la política de tratamiento de datos.')
      return
    }
    setErrorMsg(null)
    setPhase('aceptando')
    try {
      const r = await coarrendatarioService.aceptar(
        token,
        { direccion: direccion.trim(), municipio: municipio.trim() },
        correoParaEnviar(view?.contacto_resultado?.requerido, correoResultado),
      )
      setResultMsg(r.mensaje)
      setPhase('aceptado')
    } catch (err) {
      setErrorMsg(esEnlaceReemplazado(err) ? ENLACE_REEMPLAZADO : mensajeParaProspecto(err, 'No se pudo registrar su aceptación.'))
      setPhase('lista')
    }
  }

  const handleRechazar = async () => {
    if (!token) return
    setConfirmandoRechazo(false)
    setPhase('rechazando')
    try {
      await coarrendatarioService.rechazar(token)
      setPhase('rechazado')
    } catch (err) {
      setErrorMsg(mensajeParaProspecto(err, 'No pudimos registrar su respuesta. Intente de nuevo.'))
      setPhase('lista')
    }
  }

  // «Mi documento está mal»: no cierra la invitación, avisa para que la corrijan y reenvíen.
  const handleDocumentoIncorrecto = async () => {
    if (!token) return
    setConfirmandoDocumento(false)
    setDocErrorMsg(null)
    setPhase('reportando')
    try {
      await coarrendatarioService.reportarDocumentoIncorrecto(token)
      setPhase('reportado')
    } catch (err) {
      // 404 = el enlace ya se reemplazó (declinar también daría 404): que use el nuevo.
      setDocErrorMsg(esEnlaceReemplazado(err) ? ENLACE_REEMPLAZADO : mensajeParaProspecto(err, 'No pudimos enviar su aviso. Intente de nuevo.'))
      setPhase('lista')
    }
  }

  // Adenda 3 V2 §9: «No soy esa persona». Cierra esta invitación sin consultar a nadie.
  const handleNoSoyYo = async () => {
    if (!token) return
    setConfirmandoNoSoyYo(false)
    setDocErrorMsg(null)
    setPhase('reportando')
    try {
      await coarrendatarioService.reportarNoSoyEsaPersona(token)
      setPhase('no_soy_yo')
    } catch (err) {
      setDocErrorMsg(esEnlaceReemplazado(err) ? ENLACE_REEMPLAZADO : mensajeParaProspecto(err, 'No pudimos registrar su respuesta. Intente de nuevo.'))
      setPhase('lista')
    }
  }

  // ── Renders ──────────────────────────────────────────────────────

  if (phase === 'cargando') {
    return (
      <EsqueletoFlujo bloques={1} campos={1} etiqueta="Cargando la solicitud…" />
    )
  }

  if (phase === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 sm:p-8">
        <h1 className="text-xl font-bold text-red-700 mb-2">No pudimos abrir su invitación</h1>
        <p className="text-sm text-gray-600">{errorMsg}</p>
        {reintentable && (
          <button
            type="button"
            onClick={fetchView}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
          >
            <IconRefresh size={16} /> Reintentar
          </button>
        )}
        <ContactoCofianza />
      </div>
    )
  }

  if (phase === 'rechazado') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invitación declinada</h1>
        <p className="text-sm text-gray-600 mb-4">
          Le avisamos a {view?.expediente.titular_nombre} que no continuará como coarrendatario.
        </p>
        <p className="text-xs text-gray-500">Puede cerrar esta página.</p>
        <ContactoCofianza />
      </div>
    )
  }

  if (phase === 'no_soy_yo') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Gracias por avisarnos</h1>
        <p className="text-sm text-gray-600 mb-4">
          Cerramos esta invitación. No consultamos ninguna central de riesgo con estos datos y le avisamos a quien tramita
          el arriendo para que invite a la persona correcta.
        </p>
        <p className="text-xs text-gray-500">Puede cerrar esta página.</p>
        <ContactoCofianza />
      </div>
    )
  }

  if (phase === 'reportado') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Gracias por avisarnos</h1>
        <p className="text-sm text-gray-600 mb-4">
          Le pedimos a quien tramita el arriendo que corrija su número de documento. Cuando lo corrija, le llegará una
          invitación nueva y este enlace dejará de funcionar.
        </p>
        <p className="text-xs text-gray-500">Puede cerrar esta página.</p>
        {/* Se equivocó: la invitación sigue abierta y puede aceptar con este enlace. */}
        <button
          type="button"
          onClick={() => { setYaReportado(true); setPhase('lista') }}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
        >
          Me equivoqué: el documento sí es el mío
        </button>
        <ContactoCofianza />
      </div>
    )
  }

  if (phase === 'aceptado') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-primary-200 p-5 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
          <IconCheck size={28} className="text-primary-700" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">¡Listo, {view?.nombre}!</h1>
        <p className="text-sm text-gray-700">
          {resultMsg || 'Aceptación registrada. Estamos procesando su evaluación.'}
        </p>
        <p className="text-sm text-gray-700 mt-2">
          Si el arriendo se aprueba, le enviaremos el contrato para firmarlo junto con{' '}
          {view?.expediente.titular_nombre || 'quien lo invitó'}. No tiene que hacer nada más por ahora.
        </p>
        {/* Al reabrir con 'aceptado' el mensaje de arriba ya nombra el correo. */}
        {view?.estado !== 'aceptado' && (
          <p className="text-xs text-gray-500 mt-4 break-words">
            {view?.estado === 'estudio_completado'
              ? `Le enviamos el resultado a ${view.email}.`
              : `Le enviaremos a ${view?.email} el resultado de su evaluación cuando esté listo.`}
          </p>
        )}
        <ContactoCofianza />
      </div>
    )
  }

  // phase === 'lista' o 'aceptando' o 'rechazando'
  const titular = view?.expediente.titular_nombre || 'El solicitante'
  const inmueble = `${view?.expediente.inmueble_direccion}${view?.expediente.inmueble_ciudad ? `, ${view.expediente.inmueble_ciudad}` : ''}`
  const procesando = phase === 'aceptando' || phase === 'rechazando' || phase === 'reportando'
  // «3 de noviembre», en hora de Bogotá: hasta cuándo sirve el enlace.
  const respondeHasta = view?.expira_en
    ? new Date(view.expira_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' })
    : null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white p-5 sm:p-6">
          <h1 className="text-xl font-bold mb-1">{titular} lo invita a ser su coarrendatario</h1>
          <p className="text-primary-100 text-sm break-words">
            {inmueble}
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Hola, {view?.nombre} {view?.apellido}</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {titular} lo invita a ser su coarrendatario: a tomar el arriendo juntos, con el respaldo de Cofianza.
            </p>
          </div>

          {/* P4: que no autorice una consulta con un documento ajeno.
              Arriba y como pregunta: el invitado confirma su documento antes de
              leer lo demás. Confirmar es el camino principal; reportar que está
              mal es un enlace secundario con diálogo (dos de dos lo pulsaban por
              error cuando era un botón de ancho completo junto a las casillas, con
              el número a medias y sin confirmación). */}
          {view?.documento && (() => {
            const doc = documentoLegible(view.documento)
            return (
              <section
                ref={documentoRef}
                tabIndex={-1}
                aria-labelledby="coa-documento"
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <h3 id="coa-documento" className="text-sm font-semibold text-gray-900">¿Este es su documento?</h3>
                <p className="mt-2 text-sm text-gray-700">{doc.tipo}</p>
                {doc.ultimos ? (
                  <p className="text-lg font-semibold text-gray-900 tabular-nums">
                    Número terminado en <span className="tracking-wider">{doc.ultimos}</span>
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">{view.documento}</p>
                )}
                <p className="mt-1 text-xs text-gray-700">
                  A nombre de <span className="font-medium">{view.nombre} {view.apellido}</span>. Por seguridad solo mostramos
                  los últimos dígitos.
                </p>

                {yaReportado && (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Ya avisamos que el número estaba mal. Si es el suyo, autorice ahora: el aviso quedará resuelto. Si le
                    reenvían la invitación, use el enlace nuevo.
                  </p>
                )}

                {documentoConfirmado ? (
                  <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-primary-800">
                    <IconCheckCircle size={18} className="shrink-0 text-primary-700" />
                    Confirmó que es su documento.
                  </p>
                ) : (
                  <button
                    ref={confirmarDocumentoRef}
                    type="button"
                    onClick={() => {
                      setDocumentoConfirmado(true)
                      if (faltaConfirmarDocumento) { setErrorMsg(null); setFaltaConfirmarDocumento(false) }
                    }}
                    disabled={procesando}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary-600 bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50 sm:w-auto"
                  >
                    <IconCheck size={16} /> Sí, es mi documento
                  </button>
                )}

                <div className="mt-3 flex flex-col items-start gap-1 text-xs text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <button
                    type="button"
                    onClick={() => setConfirmandoDocumento(true)}
                    disabled={procesando}
                    className="min-h-11 text-left underline underline-offset-2 hover:text-gray-900 disabled:opacity-50 sm:min-h-0"
                  >
                    {phase === 'reportando' ? 'Enviando…' : 'Esos dígitos no son los de mi documento'}
                  </button>
                  {view.permite_no_soy_yo && (
                    <button
                      type="button"
                      onClick={() => setConfirmandoNoSoyYo(true)}
                      disabled={procesando}
                      className="min-h-11 text-left underline underline-offset-2 hover:text-gray-900 disabled:opacity-50 sm:min-h-0"
                    >
                      No soy {view.nombre}
                    </button>
                  )}
                </div>
                {docErrorMsg && (
                  <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {docErrorMsg}
                  </div>
                )}
              </section>
            )
          })()}

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-primary-900 leading-relaxed">
            <p className="font-semibold mb-1">Qué significa aceptar</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Consultamos su historial en las centrales de riesgo para evaluarlo junto con {titular}. Para usted no tiene costo.</li>
              <li>
                Si el arriendo se aprueba, usted firma el contrato como arrendatario, junto con {titular}, y los dos responden
                por el pago completo del canon.
              </li>
              <li>No es fiador ni necesita tener finca raíz.</li>
              <li>Su información se trata conforme a la <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">política de tratamiento de datos</Link>.</li>
              <li>No tiene que crear cuenta.</li>
              {respondeHasta && <li>Puede responder hasta el {respondeHasta}.</li>}
            </ul>
          </div>

          {/*
            Autorizacion de tratamiento de datos, INTEGRA y visible.
            Flujo del modulo de estudios §8.4: el texto debe estar visible en
            la pantalla, no oculto tras un enlace, y la casilla no puede venir
            marcada por defecto. El invitado es otro titular de datos: su
            consulta al buro exige SU propia autorizacion, y esta pantalla es
            donde se presenta. El backend congela este mismo texto y su version
            en autorizaciones_habeas_data al aceptar.
          */}
          {view?.texto_legal && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Autorización de tratamiento de datos</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Este es el texto íntegro que está aceptando. Versión {view.version_terminos}.
                </p>
              </div>
              <div className="whitespace-pre-wrap break-words bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                {view.texto_legal}
              </div>
            </div>
          )}

          {/* Datos de notificación: el contrato los imprime en la cláusula de
              notificaciones y producen efectos legales. */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Sus datos de contacto para el contrato</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="coa-direccion" className="mb-1 block text-xs font-medium text-gray-700">
                  Dirección de residencia
                </label>
                <input
                  id="coa-direccion"
                  type="text"
                  autoComplete="street-address"
                  value={direccion}
                  maxLength={300}
                  onChange={(e) => setDireccion(e.target.value)}
                  disabled={procesando}
                  placeholder="Calle 10 # 20-30, apartamento 501"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="coa-municipio" className="mb-1 block text-xs font-medium text-gray-700">
                  Municipio
                </label>
                <input
                  id="coa-municipio"
                  type="text"
                  autoComplete="address-level2"
                  value={municipio}
                  maxLength={120}
                  onChange={(e) => setMunicipio(e.target.value)}
                  disabled={procesando}
                  placeholder="Medellín"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {view?.contacto_resultado?.requerido
                ? 'A esta dirección, al correo de esta invitación y a su celular llegarán las notificaciones del contrato.'
                : 'A esta dirección, a su correo y a su celular llegarán las notificaciones del contrato.'}
            </p>
          </div>

          {view?.contacto_resultado?.requerido && (
            <CampoCorreoResultado
              valor={correoResultado}
              onCambio={(v) => {
                setCorreoResultado(v)
                if (errorCorreo && correoResultadoValido(v)) setErrorCorreo(false)
              }}
              mostrarError={errorCorreo}
              disabled={procesando}
            />
          )}

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg py-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={procesando}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                Acepto los <Link href="/terminos" target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">términos y condiciones</Link> de Cofianza.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg py-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptData}
                onChange={(e) => setAcceptData(e.target.checked)}
                disabled={procesando}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <strong>He leído, comprendido y acepto</strong> la autorización de tratamiento de datos que aparece arriba, y autorizo la consulta y el reporte en centrales de información (Ley 1266/2008 y Ley 1581/2012).
              </span>
            </label>
          </div>

          {/* El error va pegado al boton: antes quedaba varias pantallas arriba,
              detras del texto legal, y el usuario volvia a tocar sin verlo. */}
          {errorMsg && (
            <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3" role="alert">
              {errorMsg}
              {faltaConfirmarDocumento && (
                <button
                  type="button"
                  onClick={() => {
                    const destino = confirmarDocumentoRef.current ?? documentoRef.current
                    documentoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    destino?.focus({ preventScroll: true })
                  }}
                  className="mt-2 block min-h-11 font-semibold text-red-800 underline underline-offset-2 hover:text-red-900"
                >
                  Ir a confirmar mi documento
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleAceptar}
              disabled={procesando || !acceptTerms || !acceptData}
              className="flex-1 min-h-11 px-5 py-3 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {phase === 'aceptando' ? 'Procesando…' : 'Aceptar y autorizar la evaluación'}
            </button>
            <button
              onClick={() => setConfirmandoRechazo(true)}
              disabled={procesando}
              className="min-h-11 px-5 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {phase === 'rechazando' ? 'Procesando…' : 'Declinar'}
            </button>
          </div>
        </div>

        <ConfirmDialog
          isOpen={confirmandoNoSoyYo}
          onClose={() => setConfirmandoNoSoyYo(false)}
          onConfirm={handleNoSoyYo}
          title={`¿No es ${view?.nombre ?? 'esa persona'}?`}
          message="Cerraremos esta invitación sin consultar ninguna central de riesgo, y le avisaremos a quien tramita el arriendo para que invite a la persona correcta."
          confirmLabel="Sí, no soy esa persona"
          isLoading={phase === 'reportando'}
        />
        <ConfirmDialog
          isOpen={confirmandoDocumento}
          onClose={() => setConfirmandoDocumento(false)}
          onConfirm={handleDocumentoIncorrecto}
          title="¿Los dígitos no son los de su documento?"
          message={
            <>
              <p>
                Si los últimos dígitos del número que mostramos no son los de su documento, le avisaremos a quien tramita el
                arriendo para que lo corrija y le envíe una invitación nueva; cuando corrija el número, este enlace dejará de funcionar.
              </p>
              <p className="mt-2">Si los dígitos sí coinciden, no avise: pulse «Volver» y continúe con la autorización.</p>
            </>
          }
          confirmLabel="Sí, avisar que está mal"
          cancelLabel="Volver"
          isLoading={phase === 'reportando'}
        />
        <ConfirmDialog
          isOpen={confirmandoRechazo}
          onClose={() => setConfirmandoRechazo(false)}
          onConfirm={handleRechazar}
          title="¿Declinar la invitación?"
          message="Si declina, el estudio sigue sin usted y quien lo invitó tendrá que enviarle una invitación nueva. No puede deshacerlo desde aquí."
          confirmLabel="Sí, declinar"
          cancelLabel="Volver"
          variant="danger"
          isLoading={phase === 'rechazando'}
        />
      </div>
  )
}
