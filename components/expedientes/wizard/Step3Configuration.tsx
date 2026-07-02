/**
 * Step3Configuration - HP-247
 * Paso 3: Configuracion del expediente (notas y responsable)
 */

'use client'

import { useState, useEffect } from 'react'
import {
  IconFileText,
  IconUser,
  IconLoader,
  IconAlertTriangle,
} from '@/components/icons'
import { expedienteService } from '@/services/expedienteService'
import { listMiembros, type Miembro } from '@/services/miembrosService'
import { useAuthStore } from '@/stores/auth.store'
import type { WizardStep3Data } from '@/hooks/useExpedienteWizard'
import { WIZARD_MESSAGES } from './constants'
import { cn } from '@/lib/utils'

interface Step3ConfigurationProps {
  data: WizardStep3Data
  errors: Record<string, string>
  onUpdate: (data: Partial<WizardStep3Data>) => void
}

interface Analista {
  id: string
  nombre: string
}

const MAX_NOTAS_LENGTH = 5000

export function Step3Configuration({
  data,
  errors,
  onUpdate,
}: Step3ConfigurationProps) {
  // "Asignar responsable" (analista) es asignación INTERNA de Cofianza — no
  // aplica a inmobiliaria/propietario, así que para ellos se oculta el bloque
  // y ni siquiera se piden los analistas.
  const userRol = useAuthStore((s) => s.user?.rol)
  const esInterno = userRol === 'administrador' || userRol === 'operador_analista' || userRol === 'gerencia_consulta'
  // El responsable-MIEMBRO (multi-tenant Fase 3.1) aplica a la inmobiliaria.
  const esInmobiliaria = userRol === 'inmobiliaria'

  const [analistas, setAnalistas] = useState<Analista[]>([])
  const [isLoadingAnalistas, setIsLoadingAnalistas] = useState(false)
  const [analistasError, setAnalistasError] = useState<string | null>(null)

  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [isLoadingMiembros, setIsLoadingMiembros] = useState(false)

  // Cargar miembros activos de la inmobiliaria (para asignar responsable al crear).
  useEffect(() => {
    if (!esInmobiliaria) return
    let cancel = false
    setIsLoadingMiembros(true)
    listMiembros()
      .then((r) => {
        if (!cancel) setMiembros(r.miembros.filter((m) => m.estado === 'activo' && m.perfil_id))
      })
      .catch(() => {
        if (!cancel) setMiembros([])
      })
      .finally(() => {
        if (!cancel) setIsLoadingMiembros(false)
      })
    return () => {
      cancel = true
    }
  }, [esInmobiliaria])

  // Cargar analistas al montar (solo roles internos; con manejo de error defensivo)
  useEffect(() => {
    if (!esInterno) return
    async function loadAnalistas() {
      setIsLoadingAnalistas(true)
      setAnalistasError(null)
      try {
        const data = await expedienteService.getAnalistas()
        setAnalistas(data)
      } catch (err) {
        console.warn('No se pudieron cargar los analistas:', err)
        setAnalistasError('No se pudieron cargar los responsables')
        setAnalistas([])
      } finally {
        setIsLoadingAnalistas(false)
      }
    }
    loadAnalistas()
  }, [esInterno])

  // Manejar cambio de notas
  const handleNotasChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_NOTAS_LENGTH) {
      onUpdate({ notas: value })
    }
  }

  // Manejar cambio de analista
  const handleAnalistaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ analista_id: e.target.value })
  }

  const notasLength = data.notas?.length || 0
  const notasRemaining = MAX_NOTAS_LENGTH - notasLength

  return (
    <div className="space-y-6">
      {/* Header del paso */}
      <div>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          {WIZARD_MESSAGES.STEP3_TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {WIZARD_MESSAGES.STEP3_SUBTITLE}
        </p>
      </div>

      {/* Notas internas */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <IconFileText size={16} className="text-gray-400" />
          {WIZARD_MESSAGES.NOTAS_LABEL}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={data.notas}
          onChange={handleNotasChange}
          placeholder={WIZARD_MESSAGES.NOTAS_PLACEHOLDER}
          rows={5}
          className={cn(
            'block w-full px-4 py-3 border rounded-lg text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            errors.notas ? 'border-red-300' : 'border-gray-300'
          )}
        />
        <div className="flex items-center justify-between text-xs">
          {errors.notas ? (
            <p className="text-red-600">{errors.notas}</p>
          ) : (
            <p className="text-gray-400">
              Notas visibles solo para el equipo interno
            </p>
          )}
          <p className={cn(
            'text-gray-400',
            notasRemaining < 500 && 'text-amber-600',
            notasRemaining < 100 && 'text-red-600'
          )}>
            {notasLength}/{MAX_NOTAS_LENGTH}
          </p>
        </div>
      </div>

      {/* Asignar responsable — solo roles internos (no inmobiliaria/propietario) */}
      {esInterno && (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <IconUser size={16} className="text-gray-400" />
          {WIZARD_MESSAGES.ANALISTA_LABEL}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </label>

        {isLoadingAnalistas ? (
          <div className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-500">
            <IconLoader size={16} className="animate-spin" />
            <span>Cargando responsables...</span>
          </div>
        ) : analistasError ? (
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <IconAlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-800">{analistasError}</p>
              <p className="text-xs text-amber-600 mt-1">
                Puede continuar sin asignar responsable
              </p>
            </div>
          </div>
        ) : (
          <select
            value={data.analista_id}
            onChange={handleAnalistaChange}
            className={cn(
              'block w-full px-4 py-3 border rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'border-gray-300',
              !data.analista_id && 'text-gray-500'
            )}
          >
            <option value="">{WIZARD_MESSAGES.ANALISTA_PLACEHOLDER}</option>
            {analistas.length === 0 ? (
              <option value="" disabled>{WIZARD_MESSAGES.NO_ANALISTAS}</option>
            ) : (
              analistas.map((analista) => (
                <option key={analista.id} value={analista.id}>
                  {analista.nombre}
                </option>
              ))
            )}
          </select>
        )}
        <p className="text-xs text-gray-400">
          El responsable asignado recibira notificaciones del expediente
        </p>
      </div>
      )}

      {/* Responsable (miembro) — solo inmobiliaria (multi-tenant Fase 3.1) */}
      {esInmobiliaria && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <IconUser size={16} className="text-gray-400" />
            Responsable del expediente
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          {isLoadingMiembros ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-500">
              <IconLoader size={16} className="animate-spin" />
              <span>Cargando equipo...</span>
            </div>
          ) : (
            <select
              value={data.miembro_responsable_id}
              onChange={(e) => {
                const id = e.target.value
                const m = miembros.find((x) => (x.perfil_id ?? '') === id)
                const nombre = m
                  ? `${(m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email) ?? ''}${m.rol_miembro === 'owner' ? ' (titular)' : ''}`
                  : ''
                onUpdate({ miembro_responsable_id: id, miembro_responsable_nombre: nombre })
              }}
              className={cn(
                'block w-full px-4 py-3 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'border-gray-300',
                !data.miembro_responsable_id && 'text-gray-500',
              )}
            >
              <option value="">Sin asignar</option>
              {miembros.map((m) => (
                <option key={m.perfil_id ?? m.id} value={m.perfil_id ?? ''}>
                  {m.nombre ? `${m.nombre} ${m.apellido ?? ''}`.trim() : m.email}
                  {m.rol_miembro === 'owner' ? ' (titular)' : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-400">
            El miembro asignado será responsable del expediente y recibirá una notificación.
          </p>
        </div>
      )}

      {/* Informacion adicional */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Nota:</span> Estos campos son opcionales.
          Puede dejarlos vacios y actualizarlos posteriormente desde el detalle del expediente.
        </p>
      </div>
    </div>
  )
}
