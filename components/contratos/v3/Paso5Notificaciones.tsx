/**
 * Paso 5 del asistente de contratos V3: datos de notificación de cada parte y
 * ciudad de suscripción, más la vista previa del contrato (modo revisión, D6).
 * El PDF lo genera el API y se sirve con la descarga normal del contrato.
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconAlertTriangle, IconEye, IconFileText, IconLoader, IconRefresh } from '@/components/icons'
import { contratoService } from '@/services/contratoService'
import type { Borrador, ErroresPaso } from '@/hooks/useContratoV3'
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

type Documento = NonNullable<EstadoAsistente['contrato']>['documento']

interface VistaPreviaProps {
  contratoId: string
  documento: Documento
  /** Faltantes que se corrigen en otros pasos (cada uno con "Ir al paso N"). */
  pendientes: { paso: NumeroPaso; mensaje: string }[]
  onIrPaso: (paso: NumeroPaso) => void
  /** null = se puede generar; texto = por qué no. */
  motivoNoGenerar: string | null
  generando: boolean
  onGenerar: () => Promise<boolean>
}

/** Fuera del <fieldset disabled>: el de solo lectura también puede ver el PDF. */
export function VistaPreviaContrato({
  contratoId,
  documento,
  pendientes,
  onIrPaso,
  motivoNoGenerar,
  generando,
  onGenerar,
}: VistaPreviaProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarPdf = async () => {
    setCargando(true)
    setError(null)
    try {
      setUrl((await contratoService.descargarContrato(contratoId, { inline: true })).url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar la vista previa.')
    } finally {
      setCargando(false)
    }
  }

  const generar = async () => {
    if (!(await onGenerar())) return
    toast.success('Vista previa generada')
    await cargarPdf()
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900">Vista previa del contrato</h2>
          <p className="mt-1 text-sm text-gray-500">
            {documento
              ? 'Documento de revisión: todavía no es el contrato para firmar.'
              : 'Genera el documento para revisarlo antes de enviarlo a firma.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {documento && !url && (
            <Button variante="secondary" onClick={cargarPdf} disabled={cargando}>
              <IconEye size={16} /> Ver vista previa
            </Button>
          )}
          <Button variante="primary" onClick={generar} disabled={generando || motivoNoGenerar !== null}>
            {generando ? <IconLoader size={16} className="animate-spin" /> : <IconFileText size={16} />}
            {generando ? 'Generando…' : 'Generar vista previa'}
          </Button>
          <span className="flex flex-col items-end">
            <Button variante="secondary" disabled>
              Enviar a firma
            </Button>
            <span className="mt-0.5 text-[11px] text-gray-400">Disponible próximamente</span>
          </span>
        </div>
      </div>

      {motivoNoGenerar && <p className="text-xs text-gray-500">{motivoNoGenerar}</p>}

      <BloqueosContrato bloqueos={[]} faltantes={pendientes} onIrPaso={onIrPaso} />

      {documento?.desactualizado && (
        <Aviso tono="aviso">Cambiaste datos después de generar la vista previa. Vuelve a generarla.</Aviso>
      )}

      {documento && <AvisosContrato avisos={documento.avisos} />}

      {cargando ? (
        <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500">
          <IconLoader size={18} className="animate-spin" /> Cargando vista previa…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <IconAlertTriangle size={24} className="text-red-500" />
          <p className="text-sm text-red-800">{error}</p>
          <Button variante="secondary" tamano="sm" onClick={cargarPdf}>
            <IconRefresh size={14} /> Reintentar
          </Button>
        </div>
      ) : url ? (
        <div className="h-[85vh] min-h-150 overflow-hidden rounded-lg border border-gray-200">
          <PdfViewer url={url} />
        </div>
      ) : null}
    </section>
  )
}
