/**
 * Seccion de Historial de Cambios - HP-188
 * Timeline visual con los cambios realizados al inmueble
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { IconHistory, IconClock, IconUser, IconLoader, IconChevronLeft, IconChevronRight } from '@/components/icons'
import { inmuebleService } from '@/services/inmuebleService'
import { formatCurrency, formatDateTime } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ICambioInmueble, ICambiosResumen } from '@/types/cambio-inmueble'

const CAMPOS_MONETARIOS = ['valor_arriendo', 'valor_comercial', 'administracion']
const CAMPOS_BOOLEANOS = ['parqueadero', 'visible_vitrina']
const ITEMS_PER_PAGE = 15

interface HistorialSectionProps {
  inmuebleId: string
}

interface UsuarioOption {
  id: string
  nombre: string
}

function formatValue(campo: string, valor: string | null): string {
  if (valor === null || valor === '') return '(vacío)'

  if (CAMPOS_MONETARIOS.includes(campo)) {
    const num = parseFloat(valor)
    if (!isNaN(num)) return formatCurrency(num)
  }

  if (CAMPOS_BOOLEANOS.includes(campo)) {
    return valor === 'true' ? 'Sí' : 'No'
  }

  return valor
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) return 'Hoy'
  if (dateOnly.getTime() === yesterday.getTime()) return 'Ayer'

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getTimeString(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function groupByDate(cambios: ICambioInmueble[]): { label: string; items: ICambioInmueble[] }[] {
  const groups: { label: string; items: ICambioInmueble[] }[] = []

  for (const cambio of cambios) {
    const label = getDateGroup(cambio.created_at)
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(cambio)
    } else {
      groups.push({ label, items: [cambio] })
    }
  }

  return groups
}

export function HistorialSection({ inmuebleId }: HistorialSectionProps) {
  const [cambios, setCambios] = useState<ICambioInmueble[]>([])
  const [resumen, setResumen] = useState<ICambiosResumen | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [filterCampo, setFilterCampo] = useState('')
  const [filterUsuario, setFilterUsuario] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cambiosResult, resumenResult] = await Promise.all([
        inmuebleService.getCambios(inmuebleId, {
          page,
          limit: ITEMS_PER_PAGE,
          campo: filterCampo || undefined,
          usuario_id: filterUsuario || undefined,
        }),
        page === 1 && !filterCampo && !filterUsuario
          ? inmuebleService.getCambiosResumen(inmuebleId)
          : Promise.resolve(null),
      ])

      setCambios(cambiosResult.data)
      setTotalPages(cambiosResult.pagination.totalPages)
      setTotal(cambiosResult.pagination.total)

      if (resumenResult) {
        setResumen(resumenResult)
      }

      // Extraer usuarios únicos de los cambios cargados
      setUsuarios((prev) => {
        const map = new Map(prev.map((u) => [u.id, u]))
        for (const c of cambiosResult.data) {
          if (c.usuario_id && c.usuario_nombre && !map.has(c.usuario_id)) {
            map.set(c.usuario_id, { id: c.usuario_id, nombre: c.usuario_nombre })
          }
        }
        return Array.from(map.values())
      })
    } catch (error) {
      console.error('Error fetching historial:', error)
    } finally {
      setIsLoading(false)
    }
  }, [inmuebleId, page, filterCampo, filterUsuario])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterCampoChange = (campo: string) => {
    setFilterCampo(campo)
    setPage(1)
  }

  const handleFilterUsuarioChange = (usuarioId: string) => {
    setFilterUsuario(usuarioId)
    setPage(1)
  }

  const hasActiveFilters = filterCampo || filterUsuario

  const clearFilters = () => {
    setFilterCampo('')
    setFilterUsuario('')
    setPage(1)
  }

  // Loading state
  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconLoader size={24} className="text-primary-600 animate-spin" />
      </div>
    )
  }

  // Empty state
  if (!isLoading && cambios.length === 0 && !hasActiveFilters) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <IconHistory size={24} className="text-gray-400" />
        </div>
        <p className="text-gray-600 mb-1">No hay cambios registrados</p>
        <p className="text-sm text-gray-400">
          Los cambios se registran automáticamente al editar el inmueble
        </p>
      </div>
    )
  }

  const groups = groupByDate(cambios)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {resumen && resumen.total_cambios > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total de cambios</p>
            <p className="text-lg font-semibold text-gray-900">{resumen.total_cambios}</p>
          </div>
          {resumen.ultimo_cambio && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Último cambio</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateTime(resumen.ultimo_cambio.created_at)}
              </p>
              <p className="text-xs text-gray-500">
                por {resumen.ultimo_cambio.usuario_nombre}
              </p>
            </div>
          )}
          {resumen.campos_mas_modificados.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Campo más modificado</p>
              <p className="text-sm font-medium text-gray-900">
                {resumen.campos_mas_modificados[0].campo_label}
              </p>
              <p className="text-xs text-gray-500">
                {resumen.campos_mas_modificados[0].count} cambios
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Filtrar:</span>

        {/* Filtro por campo */}
        {resumen && resumen.campos_mas_modificados.length > 1 && (
          <select
            value={filterCampo}
            onChange={(e) => handleFilterCampoChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los campos</option>
            {resumen.campos_mas_modificados.map((c) => (
              <option key={c.campo} value={c.campo}>
                {c.campo_label} ({c.count})
              </option>
            ))}
          </select>
        )}

        {/* Filtro por usuario */}
        {usuarios.length > 1 && (
          <select
            value={filterUsuario}
            onChange={(e) => handleFilterUsuarioChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        )}

        {total > 0 && (
          <span className="text-xs text-gray-400 ml-auto">
            {total} resultado{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Empty filtered state */}
      {!isLoading && cambios.length === 0 && hasActiveFilters && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No hay cambios con los filtros seleccionados</p>
          <button
            onClick={clearFilters}
            className="text-primary-600 text-sm hover:underline mt-1"
          >
            Ver todos los cambios
          </button>
        </div>
      )}

      {/* Timeline */}
      {groups.map((group) => (
        <div key={group.label}>
          {/* Date group header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Timeline items */}
          <div className="relative ml-3 border-l-2 border-gray-200 pl-6 space-y-4 mb-6">
            {group.items.map((cambio) => {
              const isEstado = cambio.campo === 'estado'

              return (
                <div key={cambio.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2',
                      isEstado
                        ? 'bg-amber-400 border-amber-500'
                        : 'bg-white border-gray-300'
                    )}
                  />

                  {/* Card */}
                  <div
                    className={cn(
                      'rounded-lg border p-3',
                      isEstado
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-gray-100 bg-white'
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isEstado ? 'text-amber-800' : 'text-gray-900'
                        )}
                      >
                        {cambio.campo_label}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                        <IconClock size={12} />
                        {getTimeString(cambio.created_at)}
                      </span>
                    </div>

                    {/* Values */}
                    <div className="text-sm mb-1.5">
                      <span className="text-gray-500 line-through">
                        {formatValue(cambio.campo, cambio.valor_anterior)}
                      </span>
                      <span className="text-gray-400 mx-1.5">&rarr;</span>
                      <span className={cn(
                        'font-medium',
                        isEstado ? 'text-amber-700' : 'text-gray-900'
                      )}>
                        {formatValue(cambio.campo, cambio.valor_nuevo)}
                      </span>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <IconUser size={12} />
                      <span>{cambio.usuario_nombre || 'Usuario desconocido'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Loading overlay for page changes */}
      {isLoading && page > 1 && (
        <div className="flex items-center justify-center py-4">
          <IconLoader size={20} className="text-primary-600 animate-spin" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors',
              page <= 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <IconChevronLeft size={14} />
            Anterior
          </button>

          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors',
              page >= totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Siguiente
            <IconChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
