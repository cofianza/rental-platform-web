/**
 * ContratoVerificacionView (tarea 4.1d) — "vista de verificación" del contrato.
 *
 * Carga desde el backend el HTML del contrato re-renderizado con los datos
 * insertados RESALTADOS y lo embebe en un iframe (via `srcdoc`, mismo origen,
 * para que los estilos del contrato no afecten al resto de la app). Sirve para
 * que la inmobiliaria confirme de un vistazo que el contrato se generó bien.
 *
 * No es el documento legal (ese es el PDF): es un apoyo de verificación.
 */

'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { IconLoader, IconAlertTriangle } from '@/components/icons'

interface Props {
  contratoId: string
}

export function ContratoVerificacionView({ contratoId }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const token = useAuthStore.getState().accessToken
        const res = await fetch(`${API_BASE_URL}/contratos/${contratoId}/verificacion-html`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        })
        if (!res.ok) {
          let message = 'No se pudo cargar la vista de verificación'
          try {
            const json = await res.json()
            message = json?.message || message
          } catch {
            // respuesta no JSON — dejamos el mensaje por defecto
          }
          throw new Error(message)
        }
        const text = await res.text()
        if (!cancel) setHtml(text)
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [contratoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconLoader size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-6">
        <IconAlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-700">{error}</p>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={html ?? ''}
      title="Vista de verificación del contrato"
      sandbox="allow-same-origin"
      className="w-full h-full border-0 bg-white"
    />
  )
}
