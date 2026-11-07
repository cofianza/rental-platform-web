/**
 * Card reutilizable para asignar el miembro responsable de un recurso
 * (inmueble o expediente) — multi-tenant Fase 3. Solo el TITULAR ve el selector;
 * los demás ven el responsable en solo-lectura. El padre provee `onAssign`
 * (la llamada al API correspondiente) y refresca su estado en el callback.
 */

'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { IconUserCheck, IconLoader } from '@/components/icons'
import { listMiembros, type Miembro } from '@/services/miembrosService'
import { InfoTip } from '@/components/ui/InfoTip'

interface Props {
  miembroResponsableId?: string | null
  /** Llama al API y resuelve cuando se guardó. Recibe el perfil_id o null. */
  onAssign: (miembroId: string | null) => Promise<void>
  titulo: string
  ayuda?: string
  /**
   * 'dato': un dato más de la ficha del encabezado (rótulo encima, selector chico),
   * sin tarjeta propia; la ayuda va como texto de apoyo del selector. Va dentro de un <dl>.
   */
  variante?: 'tarjeta' | 'dato'
}

export function ResponsableMiembroCard({ miembroResponsableId, onAssign, titulo, ayuda, variante = 'tarjeta' }: Props) {
  const uid = useId()
  const idSelector = `${uid}-responsable`
  const idAyuda = `${uid}-ayuda`
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
        setMiembros(r.miembros.filter((m) => m.estado === 'activo' && m.perfil_id && m.rol_miembro !== 'solo_lectura'))
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

  const nombreActual = value && nombrePorPerfil.get(value) ? nombrePorPerfil.get(value) : 'Sin responsable'
  const selector = (
    <select
      id={idSelector}
      value={value}
      disabled={saving}
      aria-describedby={ayuda && variante === 'tarjeta' ? idAyuda : undefined}
      onChange={(e) => handleChange(e.target.value)}
      className={
        variante === 'dato'
          ? 'min-h-10 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-medium text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'
          : 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50'
      }
    >
      <option value="">Sin responsable</option>
      {miembros.map((m) => (
        <option key={m.perfil_id ?? m.id} value={m.perfil_id ?? ''}>
          {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
          {m.rol_miembro === 'owner' ? ' (titular)' : ''}
        </option>
      ))}
    </select>
  )

  if (variante === 'dato') {
    return (
      <div className="col-span-2 min-w-0">
        <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          {soyOwner ? <label htmlFor={idSelector}>{titulo}</label> : titulo}
          {soyOwner && ayuda && <InfoTip texto={ayuda} lado="derecha" />}
          {saving && <IconLoader size={12} className="animate-spin text-gray-500" aria-label="Guardando" />}
        </dt>
        <dd className="mt-0.5 text-sm font-medium text-gray-900">
          {soyOwner ? selector : nombreActual}
        </dd>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconUserCheck size={16} className="text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          {soyOwner ? <label htmlFor={idSelector}>{titulo}</label> : titulo}
        </h3>
        {saving && <IconLoader size={14} className="animate-spin text-gray-500" />}
      </div>

      {soyOwner ? (
        <>
          {selector}
          {ayuda && <p id={idAyuda} className="text-xs text-gray-500 mt-2">{ayuda}</p>}
        </>
      ) : (
        <p className="text-sm text-gray-700">{nombreActual}</p>
      )}
    </div>
  )
}
