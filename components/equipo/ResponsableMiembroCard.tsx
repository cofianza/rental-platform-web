/**
 * Card reutilizable para asignar el miembro responsable de un recurso
 * (inmueble o expediente) — multi-tenant Fase 3. Solo el TITULAR ve el selector;
 * los demás ven el responsable en solo-lectura. El padre provee `onAssign`
 * (la llamada al API correspondiente) y refresca su estado en el callback.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { IconUserCheck, IconLoader } from '@/components/icons'
import { listMiembros, type Miembro } from '@/services/miembrosService'

interface Props {
  miembroResponsableId?: string | null
  /** Llama al API y resuelve cuando se guardó. Recibe el perfil_id o null. */
  onAssign: (miembroId: string | null) => Promise<void>
  titulo: string
  ayuda?: string
}

export function ResponsableMiembroCard({ miembroResponsableId, onAssign, titulo, ayuda }: Props) {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [soyOwner, setSoyOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState<string>(miembroResponsableId ?? '')

  useEffect(() => {
    setValue(miembroResponsableId ?? '')
  }, [miembroResponsableId])

  useEffect(() => {
    listMiembros()
      .then((r) => {
        setSoyOwner(r.soy_owner)
        setMiembros(r.miembros.filter((m) => m.estado === 'activo' && m.perfil_id))
      })
      .catch(() => {
        // Sin organización o sin permiso: no mostramos el card.
      })
      .finally(() => setLoading(false))
  }, [])

  const nombrePorPerfil = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of miembros) {
      if (m.perfil_id) {
        map.set(m.perfil_id, m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email || 'Miembro')
      }
    }
    return map
  }, [miembros])

  const handleChange = async (nuevo: string) => {
    const miembroId = nuevo || null
    setValue(nuevo)
    setSaving(true)
    try {
      await onAssign(miembroId)
      toast.success(miembroId ? 'Responsable asignado' : 'Responsable removido')
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'No se pudo asignar el responsable')
      setValue(miembroResponsableId ?? '') // revertir
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null
  if (miembros.length === 0 && !soyOwner) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconUserCheck size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {saving && <IconLoader size={14} className="animate-spin text-gray-400" />}
      </div>

      {soyOwner ? (
        <>
          <select
            value={value}
            disabled={saving}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">Sin asignar</option>
            {miembros.map((m) => (
              <option key={m.perfil_id ?? m.id} value={m.perfil_id ?? ''}>
                {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
                {m.rol_miembro === 'owner' ? ' (titular)' : ''}
              </option>
            ))}
          </select>
          {ayuda && <p className="text-xs text-gray-500 mt-2">{ayuda}</p>}
        </>
      ) : (
        <p className="text-sm text-gray-700">
          {value && nombrePorPerfil.get(value) ? nombrePorPerfil.get(value) : 'Sin asignar'}
        </p>
      )}
    </div>
  )
}
