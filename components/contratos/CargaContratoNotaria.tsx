'use client'

/**
 * Adenda 6 §2 (bloque 5): el contrato que se firma con firma autenticada en notaría.
 *
 * Alguna persona arrendataria no tiene el cotejo de identidad aprobado, así que no hay firma digital: quien tramita
 * descarga el contrato, lo hace firmar en notaría (a costo del arrendatario) y lo carga aquí. Antes de cargarlo acepta
 * el aviso literal de la Adenda; la carga activa la fianza y Cofianza no revisa el contenido.
 */
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconAlertTriangle, IconDownload, IconInfo, IconLoader, IconUpload } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'

/** El mismo tope que la API (20 MB). */
const MAX_BYTES = 20 * 1024 * 1024

interface Props {
  /** Por qué va a notaría (lo dice la API; sin nombrar personas ni resultados). */
  motivo: string
  /** El aviso literal que se acepta al cargar (Adenda 6 §2); lo manda la API. */
  aviso: string
  /** Hasta cuándo se puede cargar (ISO). */
  vence?: string | null
  /**
   * Lo que hoy impide cargarlo (las mismas puertas del envío a firma). Se muestra antes de la descarga: nadie lleva a
   * la notaría un contrato que después no se puede cargar.
   */
  freno?: string | null
  /** Quien mira puede cargarlo (inmobiliaria o propietario directo, no solo lectura). */
  puedeCargar: boolean
  /** Quién lo carga, cuando quien mira no puede. */
  quienCarga?: string
  cargando: boolean
  descargando?: boolean
  /** Descarga el contrato para llevarlo a la notaría. */
  onDescargar?: () => void
  /** Carga el PDF firmado; true si quedó cargado. */
  onCargar: (archivo: File) => Promise<boolean>
}

export function CargaContratoNotaria({
  motivo,
  aviso,
  vence,
  freno,
  puedeCargar,
  quienCarga = 'Lo carga un miembro de su inmobiliaria con permiso de edición.',
  cargando,
  descargando = false,
  onDescargar,
  onCargar,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const ayudaId = useId()
  const tituloId = useId()
  const vencido = !!vence && Date.parse(vence) <= Date.now()
  const bloqueado = cargando || vencido || !!freno

  // Se revisa antes del aviso: aceptar un aviso legal para que después la API rechace el archivo no sirve a nadie.
  const elegir = (f: File | undefined) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('El contrato firmado debe ser un PDF: escanéelo completo en un solo archivo PDF.')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('El archivo supera los 20 MB. Escanéelo con menor resolución e intente de nuevo.')
      return
    }
    setArchivo(f)
  }

  return (
    <section aria-labelledby={tituloId} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <IconInfo size={18} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-1 text-sm text-amber-900">
          <h3 id={tituloId} className="font-semibold">
            Firma en notaría
          </h3>
          <p>{motivo}</p>
          {vence && !vencido && <p>Plazo para cargarlo: hasta el {formatDateTime(vence)} (hora de Colombia).</p>}
        </div>
      </div>

      {vencido ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-white p-3 text-sm text-amber-900">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          Venció el plazo para cargar el contrato firmado. En unos minutos queda con la firma incompleta; si el resultado
          del estudio sigue vigente, podrá reabrir el plazo.
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
          <li>Escanéelo completo, con los sellos de la notaría, en un solo PDF y cárguelo aquí. Con la carga, la fianza queda activa.</li>
        </ol>
      )}

      {!vencido && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {onDescargar && !freno && (
            <Button variante="secondary" className="min-h-10" onClick={onDescargar} disabled={cargando || descargando}>
              {descargando ? <IconLoader size={16} className="animate-spin" /> : <IconDownload size={16} />}
              {descargando ? 'Abriendo…' : 'Descargar contrato'}
            </Button>
          )}
          {puedeCargar ? (
            <>
              <Button
                variante="primary"
                className="min-h-10"
                onClick={() => inputRef.current?.click()}
                disabled={bloqueado}
                aria-describedby={ayudaId}
              >
                {cargando ? <IconLoader size={16} className="animate-spin" /> : <IconUpload size={16} />}
                Cargar contrato firmado
              </Button>
              <span id={ayudaId} className="text-xs text-amber-800">
                PDF, máximo 20 MB.
              </span>
              {/* sr-only y no `hidden`: Safari de iOS no abre el selector de un input con display:none. */}
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(ev) => {
                  elegir(ev.target.files?.[0])
                  ev.target.value = ''
                }}
              />
            </>
          ) : (
            <p className="text-sm text-amber-900">{quienCarga}</p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={archivo !== null}
        onClose={() => setArchivo(null)}
        onConfirm={async () => {
          if (!archivo) return
          if (await onCargar(archivo)) setArchivo(null)
        }}
        title="Antes de cargar el contrato"
        message={
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{aviso}</p>
            {archivo && <p className="break-words text-gray-600">Archivo: {archivo.name}</p>}
            <p className="text-gray-600">Quedan registrados la fecha, la hora y quién lo cargó.</p>
          </div>
        }
        confirmLabel="Acepto y cargo el contrato"
        isLoading={cargando}
        focoEnCancelar
      />
    </section>
  )
}
