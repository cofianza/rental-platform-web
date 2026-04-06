'use client'

/**
 * ExportButton - Botón reutilizable para exportar datos en CSV o Excel
 * HP-364: Botones de exportación en listados y reportes
 */

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { IconDownload, IconLoader, IconChevronDown } from '@/components/icons'
import { API_BASE_URL } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'

export interface ExportButtonProps {
  /** Endpoint relativo de exportación, e.g. '/export/expedientes' */
  endpoint: string
  /** Filtros actuales a pasar como query params */
  params?: Record<string, string>
  /** Nombre de la entidad para mostrar en toast y nombre de archivo */
  entityName: string
}

export function ExportButton({ endpoint, params, entityName }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setOpen(false)
    setLoading(true)
    try {
      const token = useAuthStore.getState().accessToken
      const queryParams = new URLSearchParams({ format, ...params })
      const url = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || `Error ${res.status}`)
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename =
        filenameMatch?.[1] ||
        `${entityName}_${new Date().toISOString().slice(0, 10)}.${format}`

      // Trigger download
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)

      const truncated = res.headers.get('X-Export-Truncated') === 'true'
      if (truncated) {
        toast.warning(
          `Se exportaron los primeros 10,000 registros de ${res.headers.get('X-Export-Total-Rows')} totales`
        )
      } else {
        toast.success(`${entityName} exportado correctamente`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? (
          <IconLoader size={16} className="animate-spin" />
        ) : (
          <IconDownload size={16} />
        )}
        Exportar
        <IconChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <button
            onClick={() => handleExport('csv')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
          >
            Excel (XLSX)
          </button>
        </div>
      )}
    </div>
  )
}
