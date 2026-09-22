/**
 * Paso 5 del asistente de contratos V3: datos de notificación de cada parte y
 * ciudad de suscripción, más la vista previa del contrato (modo revisión, D6)
 * y el envío a firma (Entrega 5). En la Ruta B, aquí se carga el contrato de la
 * inmobiliaria y se genera el Anexo. Los PDF los sirve el API con URL firmada.
 */

'use client'

import { useCallback, useId, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { PhoneInput } from '@/components/ui/PhoneInput'
import {
  IconAlertTriangle,
  IconEye,
  IconFileText,
  IconLoader,
  IconRefresh,
  IconScrollText,
  IconUpload,
} from '@/components/icons'
import { formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { contratoService } from '@/services/contratoService'
import type { Borrador, ErroresPaso, useContratoV3 } from '@/hooks/useContratoV3'
import type { Contacto, EstadoAsistente, NumeroPaso, Paso5 } from '@/types/contratoV3'
import { AvisosContrato, BloqueosContrato } from './BloqueosContrato'
import { Aviso, Campo, EncabezadoPaso } from './campos'

const PdfViewer = dynamic(() => import('@/components/ui/PdfViewer').then((m) => ({ default: m.PdfViewer })), {
  ssr: false,
})

type Parte = keyof Paso5['contactos']

interface Props {
  value: Borrador<Paso5>
  onChange: (v: Borrador<Paso5>) => void
  errores: ErroresPaso
  conCoarrendatario: boolean
}

export function Paso5Notificaciones({ value, onChange, errores, conCoarrendatario }: Props) {
  const contactos = value.contactos ?? {}
  const partes: { clave: Parte; titulo: string }[] = [
    { clave: 'arrendador', titulo: 'Arrendador' },
    { clave: 'arrendatario', titulo: 'Arrendatario' },
    ...(conCoarrendatario ? [{ clave: 'coarrendatario' as const, titulo: 'Coarrendatario' }] : []),
  ]

  const poner = (parte: Parte, patch: Borrador<Contacto>) =>
    onChange({ ...value, contactos: { ...contactos, [parte]: { ...(contactos[parte] ?? {}), ...patch } } })

  return (
    <div className="space-y-6">
      <EncabezadoPaso titulo="Notificaciones y firma" subtitulo="Dónde recibe notificaciones cada parte del contrato." />

      {partes.map(({ clave, titulo }) => {
        const c = contactos[clave] ?? {}
        const err = (campo: keyof Contacto) => errores[`contactos.${clave}.${campo}`]
        return (
          <fieldset key={clave} className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-900">{titulo}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo
                label="Dirección física"
                requerido
                maxLength={300}
                autoComplete="off"
                value={c.direccion ?? ''}
                onChange={(e) => poner(clave, { direccion: e.target.value })}
                error={err('direccion')}
              />
              <Campo
                label="Municipio"
                requerido
                maxLength={120}
                autoComplete="off"
                value={c.municipio ?? ''}
                onChange={(e) => poner(clave, { municipio: e.target.value })}
                error={err('municipio')}
              />
              <Campo
                label="Correo electrónico"
                requerido
                type="email"
                maxLength={254}
                autoComplete="off"
                value={c.email ?? ''}
                onChange={(e) => poner(clave, { email: e.target.value })}
                error={err('email')}
              />
              <PhoneInput
                label="Celular"
                required
                value={c.telefono ?? ''}
                onChange={(telefono) => poner(clave, { telefono })}
                error={err('telefono')}
              />
            </div>
          </fieldset>
        )
      })}

      <div className="sm:max-w-sm">
        <Campo
          label="Ciudad de suscripción"
          requerido
          maxLength={120}
          value={value.ciudadFirma ?? ''}
          onChange={(e) => onChange({ ...value, ciudadFirma: e.target.value })}
          error={errores.ciudadFirma}
        />
      </div>

      <Aviso tono="aviso">
        Estas direcciones producen efectos legales de notificación. Cada parte debe mantenerlas actualizadas.
      </Aviso>
    </div>
  )
}

type Contrato = NonNullable<EstadoAsistente['contrato']>
type V3 = ReturnType<typeof useContratoV3>

/** Mismo tope que el API (PDF_PROPIO_INVALIDO 'peso'); las páginas las cuenta el API. */
const MAX_BYTES_PROPIO = 6 * 1024 * 1024

export const ROL_FIRMANTE: Record<string, string> = {
  arrendatario: 'Arrendatario',
  coarrendatario: 'Coarrendatario',
  arrendador: 'Arrendador (representante legal)',
}

const megas = (bytes: number) => `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`

interface VistaPreviaProps {
  contrato: Contrato
  /** Ruta guardada en el paso 1: el API decide con ella. */
  rutaB: boolean
  editable: boolean
  v3: V3
  /** Faltantes que se corrigen en otros pasos (cada uno con "Ir al paso N"). */
  pendientes: { paso: NumeroPaso; mensaje: string }[]
  onIrPaso: (paso: NumeroPaso) => void
  /** null = se puede generar; texto = por qué no. */
  motivoNoGenerar: string | null
  /** Abre la confirmación del envío (la arma la página: tiene el resumen y el paso 5). */
  onEnviar: () => void
}

/** Fuera del <fieldset disabled>: el de solo lectura también puede ver los PDF. */
export function VistaPreviaContrato({
  contrato,
  rutaB,
  editable,
  v3,
  pendientes,
  onIrPaso,
  motivoNoGenerar,
  onEnviar,
}: VistaPreviaProps) {
  const { documento, propio } = contrato
  const visor = useVisor()
  const archivoRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const motivoId = useId()
  const ocupado = v3.accion !== null

  const cargarDocumento = async () => (await contratoService.descargarContrato(contrato.id, { inline: true })).url
  const docs: DocVisor[] = [
    ...(rutaB && propio ? [{ clave: 'propio', etiqueta: 'Contrato de la inmobiliaria', cargar: v3.propioUrl }] : []),
    ...(documento
      ? [{ clave: 'documento', etiqueta: rutaB ? 'Anexo de condiciones' : 'Vista previa del contrato', cargar: cargarDocumento }]
      : []),
  ]

  const generar = async () => {
    if (!(await v3.generar())) return
    toast.success(rutaB ? 'Anexo generado' : 'Vista previa generada')
    void visor.abrir('documento', cargarDocumento)
  }

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return
    if (archivo.type !== 'application/pdf') {
      toast.error('El archivo no es un PDF.')
      return
    }
    if (archivo.size > MAX_BYTES_PROPIO) {
      toast.error('El PDF pesa más de 6 MB. Redúcelo (por ejemplo, imprimiéndolo de nuevo a PDF) y súbelo otra vez.')
      return
    }
    if (!(await v3.subirPropio(archivo))) return
    toast.success('Contrato de la inmobiliaria cargado')
    void visor.abrir('propio', v3.propioUrl)
  }

  // Lo que se firma es lo que se revisó: documento vigente, sin textos pendientes y, en B, con el PDF cargado.
  const motivoNoEnviar =
    motivoNoGenerar ??
    (!documento
      ? rutaB
        ? 'Genera el Anexo y revísalo antes de enviar a firma.'
        : 'Genera la vista previa y revísala antes de enviar a firma.'
      : documento.desactualizado
        ? 'Cambiaste datos después de generar el documento: vuelve a generarlo antes de enviar.'
        : documento.pendientes.length > 0
          ? 'El documento tiene textos pendientes de aprobación de Cofianza: todavía no se puede enviar a firma.'
          : rutaB && !propio
            ? 'Carga el contrato de la inmobiliaria en PDF para enviarlo a firma.'
            : null)

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">
            {rutaB ? 'Documentos del contrato' : 'Vista previa del contrato'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {rutaB
              ? 'Carga el contrato de la inmobiliaria y genera el Anexo de condiciones para revisarlos antes de enviarlos a firma.'
              : documento
                ? 'Documento de revisión: todavía no es el contrato para firmar.'
                : 'Genera el documento para revisarlo antes de enviarlo a firma.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variante="primary" onClick={generar} disabled={ocupado || motivoNoGenerar !== null}>
            {v3.accion === 'generar' ? <IconLoader size={16} className="animate-spin" /> : <IconFileText size={16} />}
            {v3.accion === 'generar' ? 'Generando…' : rutaB ? 'Generar Anexo' : 'Generar vista previa'}
          </Button>
          <Button
            variante="accent"
            onClick={onEnviar}
            disabled={ocupado || motivoNoEnviar !== null}
            aria-describedby={motivoNoEnviar ? motivoId : undefined}
          >
            {v3.accion === 'enviar' && <IconLoader size={16} className="animate-spin" />}
            {v3.accion === 'enviar' ? 'Enviando…' : 'Enviar a firma'}
          </Button>
        </div>
      </div>

      {motivoNoEnviar && (
        <p id={motivoId} className="text-xs text-gray-500">
          {motivoNoEnviar}
        </p>
      )}

      {v3.fallasEnvio.length > 0 && (
        <Aviso tono="error">
          <p className="font-medium">Auco no acepta estos datos de firma. Corrígelos y vuelve a intentarlo:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {v3.fallasEnvio.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{ROL_FIRMANTE[f.rol] ?? f.rol}:</span> {f.motivo}
              </li>
            ))}
          </ul>
        </Aviso>
      )}

      <BloqueosContrato bloqueos={[]} faltantes={pendientes} onIrPaso={onIrPaso} />

      {documento?.desactualizado && (
        <Aviso tono="aviso">
          {rutaB
            ? 'Cambiaste datos después de generar el Anexo. Vuelve a generarlo.'
            : 'Cambiaste datos después de generar la vista previa. Vuelve a generarla.'}
        </Aviso>
      )}

      {documento && <AvisosContrato avisos={documento.avisos} />}

      {rutaB && (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <IconScrollText size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">Contrato de la inmobiliaria (PDF)</h3>
          </div>
          {propio ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-all text-sm font-medium text-gray-900">{propio.nombre}</p>
                <p className="text-xs text-gray-500">
                  {propio.paginas} {propio.paginas === 1 ? 'página' : 'páginas'} · {megas(propio.bytes)} · cargado el{' '}
                  {formatDateTime(propio.subidoEn)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variante="secondary" tamano="sm" onClick={() => void visor.abrir('propio', v3.propioUrl)}>
                  <IconEye size={14} /> Ver
                </Button>
                {editable && (
                  <Button variante="secondary" tamano="sm" onClick={() => archivoRef.current?.click()} disabled={ocupado}>
                    {v3.accion === 'propio' ? <IconLoader size={14} className="animate-spin" /> : <IconUpload size={14} />}
                    {v3.accion === 'propio' ? 'Cargando…' : 'Reemplazar'}
                  </Button>
                )}
              </div>
            </div>
          ) : editable ? (
            <button
              type="button"
              onClick={() => archivoRef.current?.click()}
              disabled={ocupado}
              onDragOver={(e) => {
                e.preventDefault()
                setArrastrando(true)
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault()
                setArrastrando(false)
                void subir(e.dataTransfer.files[0])
              }}
              className={cn(
                'flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-60',
                arrastrando ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400',
              )}
            >
              {v3.accion === 'propio' ? (
                <IconLoader size={28} className="animate-spin text-gray-400" />
              ) : (
                <IconUpload size={28} className="text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {v3.accion === 'propio' ? 'Cargando…' : 'Arrastra el PDF aquí o haz clic para elegirlo'}
              </span>
              <span className="text-xs text-gray-500">
                Solo PDF, máximo 6 MB y 60 páginas. Se firma tal como lo cargues, sin modificaciones.
              </span>
            </button>
          ) : (
            <p className="text-sm text-gray-500">Todavía no se ha cargado el contrato de la inmobiliaria.</p>
          )}
          {editable && (
            // sr-only y no `hidden`: Safari de iOS no abre el selector de un input con display:none.
            // Se maneja con la zona de arrastre o "Reemplazar"; por eso queda fuera del tabulador.
            <input
              ref={archivoRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void subir(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          )}
        </div>
      )}

      <VisorDocumentos docs={docs} visor={visor} />
    </section>
  )
}

// ============================================
// Visor de documentos (vista previa y contrato enviado)
// ============================================

export interface DocVisor {
  clave: string
  etiqueta: string
  /** Una imagen (p. ej. la foto del acta firmada): se muestra tal cual, no con el visor de PDF. */
  imagen?: boolean
  /** Pide la URL (firmada, de vida corta) del PDF al abrirlo. */
  cargar: () => Promise<string>
}

/** Un documento abierto a la vez; su URL se pide al abrirlo (no al cargar la página). */
export function useVisor() {
  const [abierto, setAbierto] = useState<{ clave: string; url?: string; error?: string } | null>(null)
  // Una respuesta tardía de un pedido anterior no pisa la del actual.
  const pedido = useRef(0)
  const abrir = useCallback(async (clave: string, cargar: () => Promise<string>) => {
    const n = ++pedido.current
    setAbierto({ clave })
    try {
      const url = await cargar()
      if (n === pedido.current) setAbierto({ clave, url })
    } catch (err) {
      if (n === pedido.current) {
        setAbierto({ clave, error: err instanceof Error ? err.message : 'No pudimos abrir el documento.' })
      }
    }
  }, [])
  const cerrar = useCallback(() => {
    pedido.current++
    setAbierto(null)
  }, [])
  return { abierto, abrir, cerrar }
}

/** Botones de documento (con aria-pressed) y el visor del que esté abierto. */
export function VisorDocumentos({ docs, visor }: { docs: DocVisor[]; visor: ReturnType<typeof useVisor> }) {
  const { abierto, abrir, cerrar } = visor
  const doc = docs.find((d) => d.clave === abierto?.clave)
  if (docs.length === 0) return null

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Documentos" className="flex flex-wrap gap-2">
        {docs.map((d) => {
          const activo = d.clave === abierto?.clave
          return (
            <Button
              key={d.clave}
              variante={activo ? 'primary' : 'secondary'}
              tamano="sm"
              aria-pressed={activo}
              onClick={() => (activo ? cerrar() : void abrir(d.clave, d.cargar))}
            >
              <IconEye size={14} /> {d.etiqueta}
            </Button>
          )
        })}
      </div>
      {abierto && doc &&
        (abierto.url ? (
          doc.imagen ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de vida corta de Storage, sin dimensiones conocidas */}
              <img src={abierto.url} alt={doc.etiqueta} className="mx-auto max-h-[85vh] object-contain" />
            </div>
          ) : (
            <div className="h-[85vh] min-h-150 overflow-hidden rounded-lg border border-gray-200">
              <PdfViewer url={abierto.url} />
            </div>
          )
        ) : abierto.error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <IconAlertTriangle size={24} className="text-red-500" />
            <p className="text-sm text-red-800">{abierto.error}</p>
            <Button variante="secondary" tamano="sm" onClick={() => void abrir(doc.clave, doc.cargar)}>
              <IconRefresh size={14} /> Reintentar
            </Button>
          </div>
        ) : (
          <div role="status" className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500">
            <IconLoader size={18} className="animate-spin" /> Cargando documento…
          </div>
        ))}
    </div>
  )
}
