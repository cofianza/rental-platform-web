'use client'

/**
 * Adenda 6 §2 (bloque 5) y Adenda 6.1 §4 (bloque C): el contrato que se firma con firma autenticada en notaría.
 *
 * Alguna persona arrendataria no tiene el cotejo de identidad aprobado, así que no hay firma digital: quien tramita
 * descarga el contrato, lo hace autenticar en notaría (a costo del arrendatario) y lo REGISTRA aquí con la fecha de
 * autenticación (la del sello), dentro del rango que manda la API (los días del resultado del estudio). El PDF
 * autenticado es opcional: lo custodia quien registra y lo puede cargar después. Antes de registrar acepta el aviso
 * literal; el registro activa la fianza y Cofianza no revisa el contenido. Ya registrado, la tarjeta muestra la
 * constancia y, si falta el documento, «Cargar el contrato autenticado».
 */
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconDownload,
  IconFileText,
  IconInfo,
  IconLoader,
  IconPaperclip,
  IconUpload,
  IconX,
} from '@/components/icons'
import { formatDate, formatDateTime } from '@/lib/constants'

/** El mismo tope que la API (20 MB). */
const MAX_BYTES = 20 * 1024 * 1024

/** El rango permitido de la fecha de autenticación (AAAA-MM-DD; `maximo` = hasta o hoy, el menor). Lo calcula la API. */
export interface RangoAutenticacion {
  desde: string
  hasta: string
  dias: number
  maximo: string
}

/** La constancia del registro en notaría. */
export interface RegistroNotaria {
  fechaAutenticacion: string
  en: string
  avisoVersion: string
  documento: null | { nombre: string; en: string | null }
}

interface Props {
  /** Por qué va a notaría (lo dice la API; sin nombrar personas ni resultados). */
  motivo: string
  /** El aviso literal que se acepta al registrar (6.1 §4), o el que se aceptó; lo manda la API. */
  aviso: string
  /** Hasta cuándo se puede registrar (ISO). */
  vence?: string | null
  /**
   * Lo que hoy impide registrarlo (las mismas puertas del envío a firma). Se muestra antes de la descarga: nadie lleva
   * a la notaría un contrato que después no se puede registrar.
   */
  freno?: string | null
  /** El rango permitido de la fecha de autenticación; null = la API no lo pudo calcular. */
  rango?: RangoAutenticacion | null
  /** Ya registrado: la constancia (y el documento, si se cargó). */
  registro?: RegistroNotaria | null
  /**
   * Ya registrado: en qué quedó la fianza (lo dice el estado del contrato). 'activa' no agrega nada (la pantalla ya lo
   * dice); 'pendiente' = la activación está en curso; 'terminada' = el contrato terminó.
   */
  estadoFianza?: 'activa' | 'pendiente' | 'terminada'
  /** Quien mira puede registrarlo y cargar el documento (inmobiliaria o propietario directo, no solo lectura). */
  puedeRegistrar: boolean
  /** Quién lo registra, cuando quien mira no puede. */
  quienRegistra?: string
  /** Quién carga el documento después, cuando quien mira no puede. */
  quienCarga?: string
  registrando?: boolean
  cargandoDocumento?: boolean
  descargando?: boolean
  /** Descarga el contrato para llevarlo a la notaría. */
  onDescargar?: () => void
  /** Registra el contrato (fecha del sello y, opcional, el PDF); true si quedó registrado. Sin él, no se ofrece. */
  onRegistrar?: (datos: { fechaAutenticacion: string; archivo: File | null }) => Promise<boolean>
  /** Carga el contrato autenticado después del registro; true si quedó cargado. */
  onCargarDocumento?: (archivo: File) => Promise<boolean>
}

/** Revisa el PDF antes de pedir nada: la API exige el tipo application/pdf (no basta la extensión) y 20 MB. */
function pdfValido(f: File | undefined): f is File {
  if (!f) return false
  if (f.type !== 'application/pdf') {
    toast.error('El contrato autenticado debe ser un PDF: escanéelo completo, con los sellos de la notaría, en un solo archivo PDF.')
    return false
  }
  if (f.size > MAX_BYTES) {
    toast.error('El archivo supera los 20 MB. Escanéelo con menor resolución e intente de nuevo.')
    return false
  }
  return true
}

/** Un input de archivo oculto con sr-only (Safari de iOS no abre el selector de un input con display:none). */
function SelectorPdf({ inputRef, onElegir }: { inputRef: React.RefObject<HTMLInputElement | null>; onElegir: (f: File) => void }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(ev) => {
        const f = ev.target.files?.[0]
        if (pdfValido(f)) onElegir(f)
        ev.target.value = ''
      }}
    />
  )
}

export function CargaContratoNotaria({
  motivo,
  aviso,
  vence,
  freno,
  rango,
  registro,
  estadoFianza = 'activa',
  puedeRegistrar,
  quienRegistra = 'Lo registra un miembro de su inmobiliaria con permiso de edición.',
  quienCarga = 'Lo carga un miembro de su inmobiliaria con permiso de edición.',
  registrando = false,
  cargandoDocumento = false,
  descargando = false,
  onDescargar,
  onRegistrar,
  onCargarDocumento,
}: Props) {
  const tituloId = useId()
  const fechaId = useId()
  const ayudaFechaId = useId()
  const errorFechaId = useId()
  const ayudaPdfId = useId()
  const fechaRef = useRef<HTMLInputElement>(null)
  const inputRegistroRef = useRef<HTMLInputElement>(null)
  const inputDocumentoRef = useRef<HTMLInputElement>(null)
  const [fecha, setFecha] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [tocado, setTocado] = useState(false)
  const [documento, setDocumento] = useState<File | null>(null)

  // ── Ya registrado: la constancia ──
  if (registro) {
    return (
      <section aria-labelledby={tituloId} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-2">
          <IconCheckCircle size={18} className="mt-0.5 shrink-0 text-primary-700" />
          <div className="min-w-0 space-y-1 text-sm text-gray-800">
            <h3 id={tituloId} className="font-semibold text-gray-900">
              Contrato registrado con firma en notaría
            </h3>
            <p>
              Fecha de autenticación: <span className="font-medium">{formatDate(registro.fechaAutenticacion)}</span>.
              Registrado el {formatDateTime(registro.en)} (hora de Colombia).
              {estadoFianza === 'pendiente'
                ? ' La activación de la fianza está en curso.'
                : estadoFianza === 'terminada'
                  ? ' El contrato ya terminó.'
                  : ''}
            </p>
            <p className="text-gray-600">Aviso aceptado: «{aviso}»</p>
          </div>
        </div>
        {registro.documento ? (
          <p className="flex items-start gap-2 text-sm text-gray-700">
            <IconFileText size={16} className="mt-0.5 shrink-0 text-gray-500" />
            <span className="min-w-0 break-words">
              Contrato autenticado cargado{registro.documento.en ? ` el ${formatDateTime(registro.documento.en)}` : ''}: {registro.documento.nombre}.
            </span>
          </p>
        ) : (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-start gap-2">
              <IconInfo size={16} className="mt-0.5 shrink-0" />
              <span>
                El contrato autenticado no está cargado en la plataforma. Se debe presentar al reportar una mora: sin él,
                Cofianza no paga. Puede cargarlo aquí cuando quiera.
              </span>
            </p>
            {puedeRegistrar && onCargarDocumento ? (
              <>
                <Button
                  variante="secondary"
                  className="min-h-10"
                  onClick={() => inputDocumentoRef.current?.click()}
                  disabled={cargandoDocumento}
                  aria-describedby={ayudaPdfId}
                >
                  {cargandoDocumento ? <IconLoader size={16} className="animate-spin" /> : <IconUpload size={16} />}
                  Cargar el contrato autenticado
                </Button>
                <span id={ayudaPdfId} className="block text-xs text-amber-800">
                  PDF con los sellos de la notaría, máximo 20 MB.
                </span>
                <SelectorPdf inputRef={inputDocumentoRef} onElegir={setDocumento} />
              </>
            ) : (
              <p>{quienCarga}</p>
            )}
          </div>
        )}
        <ConfirmDialog
          isOpen={documento !== null}
          onClose={() => setDocumento(null)}
          onConfirm={async () => {
            if (!documento || !onCargarDocumento) return
            if (await onCargarDocumento(documento)) setDocumento(null)
          }}
          title="Cargar el contrato autenticado"
          message={
            <div className="space-y-2 text-sm">
              {documento && <p className="break-words text-gray-900">Archivo: {documento.name}</p>}
              <p className="text-gray-600">
                Revise que sea el contrato completo, con los sellos de la notaría: una vez cargado no se reemplaza desde la
                plataforma. Quedan registrados la fecha, la hora y quién lo cargó. La fecha de activación de la fianza no
                cambia: es la del registro.
              </p>
            </div>
          }
          confirmLabel="Cargar el contrato"
          isLoading={cargandoDocumento}
        />
      </section>
    )
  }

  // ── Antes del registro ──
  const vencido = !!vence && Date.parse(vence) <= Date.now()
  const sinRango = !rango
  const bloqueado = registrando || vencido || !!freno || sinRango
  const errorFecha = !fecha
    ? 'Indique la fecha de autenticación que aparece en el sello de la notaría.'
    : rango && (fecha < rango.desde || fecha > rango.maximo)
      ? `La fecha debe estar entre el ${formatDate(rango.desde)} y el ${formatDate(rango.maximo)}.`
      : null

  return (
    <section aria-labelledby={tituloId} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <IconInfo size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-1 text-sm text-amber-900">
          <h3 id={tituloId} className="font-semibold">
            Firma en notaría
          </h3>
          <p>{motivo}</p>
          {vence && !vencido && <p>Plazo para registrarlo: hasta el {formatDateTime(vence)} (hora de Colombia).</p>}
        </div>
      </div>

      {vencido ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-white p-3 text-sm text-amber-900">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          Venció el plazo para registrar el contrato firmado en notaría, que llegaba hasta el fin de la vigencia del
          resultado del estudio. Para seguir, cancele el contrato y cree un estudio nuevo (con su propio cobro).
        </p>
      ) : freno ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-white p-3 text-sm text-red-800">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          {freno}
        </p>
      ) : (
        <ol className="ml-6 list-decimal space-y-1 text-sm text-amber-900">
          <li>Descargue el contrato.</li>
          <li>Hágalo firmar con firma autenticada en notaría.</li>
          <li>
            Regístrelo aquí con la fecha de autenticación que aparece en el sello de la notaría. Con el registro, la fianza
            queda activa. El PDF escaneado es opcional: puede cargarlo ahora o después.
          </li>
        </ol>
      )}

      {!vencido && onDescargar && !freno && (
        <Button variante="secondary" className="min-h-10" onClick={onDescargar} disabled={registrando || descargando}>
          {descargando ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
          {descargando ? 'Abriendo…' : 'Descargar contrato'}
        </Button>
      )}

      {!vencido && !freno && (puedeRegistrar && onRegistrar ? (
        <form
          className="space-y-3 rounded-lg border border-amber-200 bg-white p-3"
          onSubmit={(ev) => {
            ev.preventDefault()
            setTocado(true)
            // Con la fecha vacía o fuera del rango, el foco va al campo (el error se anuncia con él).
            if (errorFecha) fechaRef.current?.focus()
            else if (!bloqueado) setConfirmando(true)
          }}
          noValidate
        >
          <div className="space-y-1">
            <label htmlFor={fechaId} className="block text-sm font-medium text-gray-800">
              Fecha de autenticación en notaría <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              ref={fechaRef}
              id={fechaId}
              type="date"
              value={fecha}
              min={rango?.desde}
              max={rango?.maximo}
              onChange={(e) => setFecha(e.target.value)}
              onBlur={() => setTocado(true)}
              required
              aria-invalid={tocado && !!errorFecha}
              aria-describedby={`${ayudaFechaId}${tocado && errorFecha ? ` ${errorFechaId}` : ''}`}
              disabled={bloqueado}
              className="min-h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:w-60"
            />
            <p id={ayudaFechaId} className="text-xs text-gray-600">
              {rango
                ? `La del sello de la notaría, no la que escribieron las partes. Debe estar entre el ${formatDate(rango.desde)} y el ${formatDate(rango.maximo)} (dentro de los ${rango.dias} días siguientes al resultado del estudio).`
                : 'No pudimos calcular el rango permitido de la fecha. Recargue la página en unos minutos.'}
            </p>
            {tocado && errorFecha && (
              <p id={errorFechaId} role="alert" className="text-xs text-red-700">
                {errorFecha}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="block text-sm font-medium text-gray-800">
              Contrato autenticado en PDF <span className="font-normal text-gray-500">(opcional)</span>
            </span>
            {archivo ? (
              <div className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
                <IconPaperclip size={16} className="shrink-0 text-gray-500" />
                <span className="min-w-0 flex-1 break-words">{archivo.name}</span>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label={`Quitar el archivo ${archivo.name}`}
                  disabled={registrando}
                >
                  <IconX size={16} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variante="secondary"
                className="min-h-10"
                onClick={() => inputRegistroRef.current?.click()}
                disabled={bloqueado}
                aria-describedby={ayudaPdfId}
              >
                <IconUpload size={16} />
                Adjuntar PDF
              </Button>
            )}
            <p id={ayudaPdfId} className="text-xs text-gray-600">
              Con los sellos de la notaría, máximo 20 MB. Si no lo adjunta ahora, puede cargarlo después.
            </p>
            <SelectorPdf inputRef={inputRegistroRef} onElegir={setArchivo} />
          </div>

          <Button type="submit" variante="primary" className="min-h-10" disabled={bloqueado}>
            {registrando ? <IconLoader size={16} className="animate-spin" /> : <IconCheckCircle size={16} />}
            Registrar el contrato
          </Button>
        </form>
      ) : (
        <p className="text-sm text-amber-900">{quienRegistra}</p>
      ))}

      <ConfirmDialog
        isOpen={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={async () => {
          if (onRegistrar && (await onRegistrar({ fechaAutenticacion: fecha, archivo }))) {
            setConfirmando(false)
            setArchivo(null)
          }
        }}
        title="Antes de registrar el contrato"
        message={
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{aviso}</p>
            <p className="text-gray-700">
              Fecha de autenticación: {fecha ? formatDate(fecha) : '—'}.{' '}
              {archivo ? <span className="break-words">Archivo: {archivo.name}.</span> : 'Sin PDF por ahora (puede cargarlo después).'}
            </p>
            {archivo && (
              <p className="text-gray-600">
                Revise que sea el contrato completo, con los sellos de la notaría: una vez registrado no se reemplaza desde la
                plataforma.
              </p>
            )}
            <p className="text-gray-600">Quedan registrados la fecha, la hora y quién aceptó el aviso. Con el registro, la fianza queda activa.</p>
          </div>
        }
        confirmLabel="Acepto y registro el contrato"
        isLoading={registrando}
        focoEnCancelar
      />
    </section>
  )
}
