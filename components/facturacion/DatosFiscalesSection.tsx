/**
 * DatosFiscalesSection — HP-354, HP-357
 *
 * Antes era un formulario de 9 campos que el usuario re-tecleaba desde cero
 * (con NIT sin DV y un régimen "Simplificado/Común" que la DIAN eliminó en
 * 2019) y que además no se guardaba en ningún lado: `saveDatosFiscales` era un
 * placeholder no-op. Ahora es una tarjeta de solo lectura que muestra los
 * MISMOS datos que la API usa al facturar (perfil del arrendador), con el
 * mismo orden de resolución, y remite a "Datos para contrato" para editarlos.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { perfilArrendadorService, type IPerfilArrendador } from '@/services/perfilArrendadorService'
import { useAuth } from '@/hooks/useAuth'
import { IconLoader, IconAlertTriangle } from '@/components/icons'

function Dato({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
        {value || 'Sin registrar'}
      </dd>
    </div>
  )
}

export function DatosFiscalesSection() {
  const { user } = useAuth()
  const [perfil, setPerfil] = useState<IPerfilArrendador | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPerfil = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPerfil(await perfilArrendadorService.getMe())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus datos de facturación')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerfil()
  }, [fetchPerfil])

  // Los datos para contrato son de la ORGANIZACIÓN: solo el titular los edita
  // (mismo criterio que /configuracion/datos-contrato, donde el backend manda).
  const puedeEditar = !(user?.rol === 'inmobiliaria' && user?.rol_miembro !== 'owner')

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-10 text-sm text-gray-500">
        <IconLoader size={18} className="animate-spin" />
        Cargando tus datos de facturación...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">{error}</p>
            <button
              type="button"
              onClick={fetchPerfil}
              className="mt-2 text-sm font-medium text-amber-800 underline hover:text-amber-900"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Con estos datos te factura Cofianza</h3>
      <p className="mt-1 text-xs text-gray-500">
        Los tomamos de tu perfil; no hace falta que los escribas otra vez.
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Dato label="Razón social / Nombre" value={perfil?.razon_social || nombre || null} />
        <Dato label="NIT o documento" value={perfil?.nit || perfil?.numero_documento || null} />
        <Dato label="Dirección de facturación" value={perfil?.domicilio_direccion || null} />
        <Dato label="Ciudad" value={perfil?.ciudad || perfil?.domicilio_ciudad || null} />
        <Dato label="Correo" value={perfil?.email_recaudo || user?.email || null} />
        <Dato label="Teléfono" value={perfil?.whatsapp_recaudo || null} />
      </dl>

      {puedeEditar && (
        <Link
          href="/configuracion/datos-contrato"
          className="mt-6 inline-block text-sm font-medium text-primary-700 hover:underline"
        >
          Editar en Datos para contrato
        </Link>
      )}
    </div>
  )
}
