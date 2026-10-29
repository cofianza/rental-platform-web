/**
 * Carga pública de documentos del solicitante — accesible sin login vía token.
 * La inmobiliaria envía este enlace cuando el estudio quedó condicionado para
 * que el solicitante suba su documentación adicional; también llega en el
 * correo del condicionado. Desde aquí el prospecto, sin cuenta, invita a su
 * coarrendatario (P18); desde la Decisión 2 (2026-09-25), también con el
 * estudio aprobado y antes del contrato, para bajar la prima al 10 % (el enlace
 * llega en el correo del aprobado). El API decide si se puede (Decisión 4: no en
 * el canal del propietario directo).
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { IconLoader, IconCheckCircle, IconFileText, IconRefresh, IconUsers } from '@/components/icons'
import { CoarrendatarioInviteForm } from '@/components/expedientes/CoarrendatarioInviteForm'
import { fechaCondicion } from '@/components/expedientes/textoVisible'
import { esErrorTransitorio, mensajeParaProspecto } from '@/lib/errorMessages'
import { ContactoCofianza } from '@/components/public/ContactoCofianza'
import {
  cargarDocumentosService,
  type ContextoCargaDocumentos,
  type PropositoSoporte,
} from '@/services/cargarDocumentosService'

// Lo que el prospecto ve de su invitado: en qué va, nunca su resultado. Con el
// estudio ya resuelto no se promete una revisión que no va a ocurrir, y al
// cerrarlo no se le escribe (solo al decidirlo). `vigente`: la invitación sigue
// en pie (en revisión, o aprobado antes del contrato).
function textoInvitado(
  invitado: NonNullable<NonNullable<ContextoCargaDocumentos['coarrendatario']>['invitado']>,
  estadoEstudio: string,
  vigente: boolean,
  /** Adenda 3 §6: con condición no decide un analista y el plazo corre. */
  conCondicion: boolean,
  /** El plazo de la condición, si sigue corriendo. */
  plazo: string | null,
  /** Qué pasa si vence sin coarrendatario (API); null = no lo sabemos. */
  siVence: ContextoCargaDocumentos['condicion_si_vence'],
): string {
  if (estadoEstudio === 'cerrado') {
    return invitado.estado === 'pendiente_aceptacion'
      ? 'Su estudio se cerró, así que esta invitación quedó sin efecto.'
      : 'Su estudio se cerró, así que su coarrendatario ya no sigue en el proceso.'
  }
  if (!vigente) {
    return invitado.estado === 'pendiente_aceptacion'
      ? 'Su estudio ya se resolvió, así que esta invitación quedó sin efecto.'
      : 'Su estudio ya se resolvió; le escribimos por correo con la decisión.'
  }
  if (invitado.estado === 'pendiente_aceptacion') {
    return invitado.vencida
      ? 'La invitación venció sin respuesta. Pídale a quien le pidió el estudio (su inmobiliaria o el propietario) que la reenvíe.'
      : conCondicion
        ? `Le enviamos la invitación. Debe aceptarla ${plazo ? `antes del ${fechaCondicion(plazo)}` : 'dentro del plazo de la condición'}; ${
            siVence === 'rechazo'
              ? 'si no, su estudio no podrá aprobarse.'
              : siVence === 'revision'
                ? 'si no, una persona de nuestro equipo revisará su caso.'
                : 'hágalo cuanto antes.'
          }`
        : 'Le enviamos la invitación. Cuando la acepte, hacemos su evaluación crediticia.'
  }
  if (invitado.estado === 'aceptado') return 'Aceptó la invitación. Estamos haciendo su evaluación crediticia.'
  return estadoEstudio === 'aprobado'
    ? 'La evaluación de su coarrendatario terminó y su estudio sigue aprobado. Le contamos por correo si quedó vinculado y qué prima paga.'
    : conCondicion
      ? 'La evaluación de su coarrendatario terminó. Le avisamos el resultado por correo.'
      : 'La evaluación de su coarrendatario terminó. Un analista de Cofianza decide su caso con los resultados de los dos y le avisamos por correo.'
}

const PROPOSITOS: { value: PropositoSoporte; label: string }[] = [
  { value: 'certificacion_laboral', label: 'Certificación laboral' },
  { value: 'extractos_bancarios', label: 'Extractos bancarios' },
  { value: 'declaracion_renta', label: 'Declaración de renta' },
  { value: 'carta_referencia', label: 'Carta de referencia' },
  { value: 'codeudor', label: 'Documentos de respaldo de un tercero' },
  { value: 'poliza', label: 'Póliza' },
  { value: 'otros_soportes', label: 'Otros soportes' },
]
const PROPOSITO_LABEL = Object.fromEntries(PROPOSITOS.map((p) => [p.value, p.label]))
// Al arrendatario no se le ofrecen codeudor ni póliza: Cofianza es justamente
// lo que reemplaza a ambos. Siguen en el mapa de arriba para nombrar lo ya subido.
const OPCIONES_PROPOSITO = PROPOSITOS.filter((p) => p.value !== 'codeudor' && p.value !== 'poliza')

const MIME_OK = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024

export default function CargarDocumentosPage() {
  const token = useParams().token as string
  const [ctx, setCtx] = useState<ContextoCargaDocumentos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reintentable, setReintentable] = useState(false)
  const [proposito, setProposito] = useState<PropositoSoporte>('certificacion_laboral')
  const [file, setFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setCtx(await cargarDocumentosService.getContexto(token))
      setError(null)
    } catch (err: unknown) {
      // Sin conexión no es "enlace no válido": se ofrece reintentar.
      setReintentable(esErrorTransitorio(err))
      setError(mensajeParaProspecto(err, 'Enlace no válido o expirado.'))
    } finally {
      setLoading(false)
    }
  }, [token])

  const reintentar = () => {
    setLoading(true)
    setError(null)
    cargar()
  }

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleSubir = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!file) {
      toast.error('Seleccione un archivo')
      return
    }
    if (!MIME_OK.includes(file.type)) {
      toast.error('Formato no permitido. Use PDF, JPG o PNG.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('El archivo supera los 10MB.')
      return
    }
    setSubiendo(true)
    try {
      const pre = await cargarDocumentosService.presignedUrl(token, {
        nombre_original: file.name,
        tipo_mime: file.type,
        tamano_bytes: file.size,
        proposito,
      })
      await cargarDocumentosService.uploadToSignedUrl(pre.signed_url, file)
      await cargarDocumentosService.confirmar(token, {
        storage_key: pre.storage_key,
        nombre_original: file.name,
        tipo_mime: file.type,
        tamano_bytes: file.size,
        proposito,
      })
      toast.success('Documento cargado correctamente')
      setFile(null)
      form.reset()
      await cargar()
    } catch (err: unknown) {
      toast.error(mensajeParaProspecto(err, 'No se pudo cargar el documento'))
    } finally {
      setSubiendo(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconLoader size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {reintentable ? 'No pudimos cargar la página' : 'Enlace no disponible'}
          </h1>
          {/* Lo pudo enviar una inmobiliaria o un propietario directo: no se nombra a ninguno. */}
          <p className="text-sm text-gray-600">{error || 'El enlace no es válido o expiró. Pídale uno nuevo a quien tramita su arriendo.'}</p>
          {reintentable && (
            <button
              type="button"
              onClick={reintentar}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800"
            >
              <IconRefresh size={16} /> Reintentar
            </button>
          )}
          <ContactoCofianza />
        </div>
      </div>
    )
  }

  // Decisión 2: aprobado antes del contrato, el enlace sirve para sumar al coarrendatario (no para soportes).
  const aprobado = ctx.estado === 'aprobado'
  const vigente = ctx.coarrendatario?.vigente ?? ctx.estado === 'condicionado'
  // Adenda 3 §6: aprobado con condición de coarrendatario (campo explícito: un
  // error de lectura llega como null y se muestra la revisión de hoy). La API
  // cierra la carga de soportes y solo falta invitar al coarrendatario.
  const conCondicion = ctx.estado === 'condicionado' && ctx.condicion_coarrendatario === true
  // El plazo, solo si sigue corriendo (vencido, el barrido cierra el estudio).
  const plazo =
    conCondicion && ctx.condicion_vence_en && new Date(ctx.condicion_vence_en) > new Date() ? ctx.condicion_vence_en : null
  const soloCoarrendatario =
    conCondicion || (aprobado && vigente && !!(ctx.coarrendatario?.puede_invitar || ctx.coarrendatario?.invitado))

  return (
    <div>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {conCondicion ? (ctx.condicion_obligatoria ? 'Necesita un coarrendatario' : 'Está cerca') : soloCoarrendatario ? 'Su coarrendatario' : 'Carga de documentos'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {conCondicion ? (
              // El literal del §6.9, el plazo y la cifra (§6.7) van una sola vez, en el formulario.
              <>
                Hola {ctx.solicitante}: así va su estudio de arriendo
                {ctx.inmueble.direccion ? ` del inmueble en ${ctx.inmueble.direccion}` : ''}.
              </>
            ) : soloCoarrendatario ? (
              <>
                Hola {ctx.solicitante}, su estudio de arriendo
                {ctx.inmueble.direccion ? ` del inmueble en ${ctx.inmueble.direccion}` : ''} fue aprobado.
              </>
            ) : (
              <>
                Hola {ctx.solicitante}, suba los documentos para su estudio de arriendo
                {ctx.inmueble.direccion ? ` del inmueble en ${ctx.inmueble.direccion}` : ''}
                {ctx.coarrendatario?.puede_invitar ? ' o invite a su coarrendatario' : ''}.
              </>
            )}
          </p>
        </div>

        {ctx.coarrendatario?.puede_invitar && (
          <CoarrendatarioInviteForm
            audience="solicitante"
            aprobado={aprobado}
            condicion={
              conCondicion
                ? {
                    vence_en: plazo ?? undefined,
                    // Sin plazo vivo ya venció: no se dice «si no lo agrega a tiempo».
                    vencida: !plazo,
                    ingreso_adicional_requerido: ctx.condicion_ingreso_adicional_requerido,
                    siVence: ctx.condicion_si_vence,
                    obligatoria: ctx.condicion_obligatoria,
                  }
                : null
            }
            initial={ctx.coarrendatario.sugerido}
            invitar={(input) => cargarDocumentosService.invitarCoarrendatario(token, input)}
            onInvited={cargar}
          />
        )}

        {ctx.coarrendatario?.invitado && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <IconUsers size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-gray-900">Usted invitó a {ctx.coarrendatario.invitado.nombre} como coarrendatario</p>
              <p className="mt-1 text-gray-700">{textoInvitado(ctx.coarrendatario.invitado, ctx.estado, vigente, conCondicion, plazo, ctx.condicion_si_vence)}</p>
            </div>
          </div>
        )}

        {ctx.puede_subir && (
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-900">
            <p className="font-semibold">¿Qué subir?</p>
            <p className="mt-1 text-primary-800">
              Lo que respalde sus ingresos: certificación laboral si es empleado; extractos bancarios o
              declaración de renta si es independiente. Si le pidieron algo puntual, súbalo como
              «Otros soportes». Suba un archivo a la vez.
            </p>
            <p className="mt-2 text-primary-800">
              Cada documento le llega a quien gestiona su arriendo. Cuando termine no tiene que hacer nada
              más: lo contactarán si falta algo.
            </p>
          </div>
        )}

        {soloCoarrendatario ? null : ctx.puede_subir ? (
          <form onSubmit={handleSubir} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label htmlFor="cargar-proposito" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de documento
              </label>
              <select
                id="cargar-proposito"
                value={proposito}
                onChange={(e) => setProposito(e.target.value as PropositoSoporte)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {OPCIONES_PROPOSITO.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cargar-file" className="block text-sm font-medium text-gray-700 mb-1">
                Archivo (PDF, JPG o PNG · máx. 10MB)
              </label>
              <input
                id="cargar-file"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            <button
              type="submit"
              disabled={subiendo}
              className="w-full px-5 py-2.5 text-sm font-medium text-ink-900 bg-coral-500 rounded-lg hover:bg-coral-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {subiendo ? <IconLoader size={16} className="animate-spin" /> : null}
              {subiendo ? 'Subiendo…' : 'Subir documento'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-sm text-gray-600">
            Este enlace ya no admite cargar documentos (el estudio cambió de estado). Si tiene dudas, escríbale a quien
            tramita su arriendo.
            <ContactoCofianza />
          </div>
        )}

        {!(soloCoarrendatario && ctx.soportes.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Documentos cargados ({ctx.soportes.length})</h2>
            </div>
            {ctx.soportes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500 text-center">Aún no ha subido documentos.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {ctx.soportes.map((s) => (
                  <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                    <IconCheckCircle size={18} className="text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{PROPOSITO_LABEL[s.proposito] || s.proposito}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <IconFileText size={11} /> {s.nombre_original}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
