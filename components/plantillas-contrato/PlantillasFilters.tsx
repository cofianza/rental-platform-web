'use client'

import { IconSearch } from '@/components/icons'

interface PlantillasFiltersProps {
  search: string
  activa: 'true' | 'false' | ''
  onSearchChange: (value: string) => void
  onActivaChange: (value: 'true' | 'false' | '') => void
}

export function PlantillasFilters({
  search,
  activa,
  onSearchChange,
  onActivaChange,
}: PlantillasFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Buscar */}
      <div className="relative flex-1">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      {/* Estado */}
      <select
        value={activa}
        onChange={(e) => onActivaChange(e.target.value as 'true' | 'false' | '')}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
      >
        <option value="">Todas</option>
        <option value="true">Activas</option>
        <option value="false">Inactivas</option>
      </select>
    </div>
  )
}
