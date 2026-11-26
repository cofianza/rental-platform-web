/**
 * Datos de mi inmobiliaria — el único lugar con los datos de la inmobiliaria (reporte de la Oficina Virtual del
 * 25-nov, punto 13). Antes estaban repartidos en «Datos para contrato» (/configuracion/datos-contrato), «Mi
 * Inmobiliaria» (/configuracion/mi-inmobiliaria) y el formulario fiscal de los cupos: las dos rutas viejas redirigen
 * aquí (next.config.ts, con su returnTo) y el formulario de cupos lee estos mismos datos y solo pide los que falten.
 *
 * El propietario usa la misma página («Mis datos de propietario»). Los datos son de la ORGANIZACIÓN: solo el titular
 * los edita; los demás miembros los ven en modo lectura (la API también lo bloquea).
 */

'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { IconAlertTriangle } from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { DatosArrendadorForm } from '@/components/configuracion/DatosArrendadorForm'
import { DocumentosLegalesInmobiliaria } from '@/components/configuracion/DocumentosLegalesInmobiliaria'
import { tituloDatosArrendador } from '@/lib/datosArrendador'

export default function DatosInmobiliariaPage() {
  const { user } = useAuth()
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  const soloLectura = isInmobiliaria && user?.rol_miembro !== 'owner'

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title={tituloDatosArrendador(user?.rol)}
        subtitle={
          isInmobiliaria
            ? 'Los datos de su inmobiliaria para los contratos y las facturas de Cofianza, su contacto y sus documentos legales.'
            : 'Sus datos para los contratos y las facturas de Cofianza, su contacto y sus documentos legales.'
        }
      />

      {soloLectura && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Estos datos y documentos los gestiona <strong>el titular</strong> de la inmobiliaria y son los mismos para
            todo el equipo. Los ve en <strong>modo lectura</strong>: puede descargar los documentos, pero no editarlos.
          </p>
        </div>
      )}

      <DatosArrendadorForm />
      <DocumentosLegalesInmobiliaria />
    </div>
  )
}
