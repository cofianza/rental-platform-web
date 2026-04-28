/**
 * Preview de la plantilla del contrato con datos del inmueble + propietario.
 * Carga el HTML compilado desde el backend y lo embebe en un iframe via
 * `srcdoc` (mismo origen, los estilos del contrato no afectan al resto
 * de la app).
 *
 * El backend usa placeholders para arrendatario/coarrendatario porque
 * en el detalle del inmueble todavia no hay un solicitante asignado.
 */

'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { IconLoader, IconAlertTriangle, IconRefresh } from '@/components/icons'

interface Props {
  inmuebleId: string
}

export function PlantillaContratoPreview({ inmuebleId }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHtml = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().accessToken
      const res = await fetch(`${API_BASE_URL}/inmuebles/${inmuebleId}/contrato-preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
      if (!res.ok) {
        let message = 'No se pudo cargar el preview de la plantilla'
        try {
          const json = await res.json()
          message = json?.message || message
        } catch {
          // ignore — respuesta no JSON
        }
        throw new Error(message)
      }
      setHtml(await res.text())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHtml()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmuebleId])

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Vista previa del contrato</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Asi se vería el contrato con los datos actuales del inmueble y tu perfil.
            Los datos del arrendatario aparecen como placeholders <code>[…]</code>.
          </p>
        </div>
        <button
          onClick={fetchHtml}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-50"
          title="Recargar"
        >
          <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          Recargar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={24} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-6 bg-red-50">
          <IconAlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
            <p className="text-xs text-red-700 mt-1">
              Verifica que tu perfil tenga los datos para contrato completos en
              Configuración → Datos para contrato.
            </p>
          </div>
        </div>
      ) : (
        <iframe
          srcDoc={html ?? ''}
          title="Vista previa del contrato"
          sandbox="allow-same-origin"
          className="w-full border-0 bg-white"
          style={{ height: '70vh' }}
        />
      )}
    </div>
  )
}
