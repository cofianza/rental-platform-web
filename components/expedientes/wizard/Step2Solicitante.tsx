/**
 * Step2Solicitante - HP-247
 * Paso 2: Buscar o crear solicitante
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  IconSearch,
  IconLoader,
  IconCheck,
  IconX,
  IconPlus,
  IconPencil,
  IconAlertTriangle,
  IconFileCheck,
  IconArrowRight,
} from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { solicitanteService } from '@/services/solicitanteService'
import { estudioService, type IEstudioVigente } from '@/services/estudioService'
import type { ISolicitante, ISolicitanteCreateData, TipoDocumento } from '@/types/solicitante'
import type { WizardStep2Data } from '@/hooks/useExpedienteWizard'
import {
  WIZARD_MESSAGES,
  TIPO_PERSONA_OPTIONS,
  TIPO_DOCUMENTO_OPTIONS,
  NIVEL_EDUCATIVO_OPTIONS,
  DEPARTAMENTOS_COLOMBIA,
} from './constants'
import { cn } from '@/lib/utils'

interface Step2SolicitanteProps {
  data: WizardStep2Data
  errors: Record<string, string>
  onUpdate: (data: Partial<WizardStep2Data>) => void
  onUpdateField: (field: string, value: unknown) => void
  /**
   * Avisa al wizard padre cuando el formulario de edición de solicitante tiene
   * cambios SIN guardar. El padre lo usa para bloquear "Siguiente" y forzar
   * que el usuario guarde (o cancele) antes de avanzar.
   */
  onEditingDirtyChange?: (dirty: boolean) => void
}

export function Step2Solicitante({
  data,
  errors,
  onUpdate,
  onUpdateField,
  onEditingDirtyChange,
}: Step2SolicitanteProps) {
  // Estado local para busqueda. Default 'cc' (cédula): el caso 90% en Colombia,
  // así el usuario solo escribe el número y busca — un clic menos.
  const [searchTipoDoc, setSearchTipoDoc] = useState<TipoDocumento | ''>('cc')
  const [searchNumDoc, setSearchNumDoc] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  // §5.2: "Si ya existe un estudio vigente para ese mismo número de documento,
  // el sistema lo informa y ofrece consultarlo o reutilizarlo, en lugar de
  // crear uno nuevo y cobrarlo."
  const [estudioVigente, setEstudioVigente] = useState<IEstudioVigente | null>(null)
  // Solicitantes que esta inmobiliaria/propietario ya registró — para elegir
  // rápido sin escribir el documento. El backend los scopea por creado_por.
  const [recientes, setRecientes] = useState<ISolicitante[]>([])

  useEffect(() => {
    let active = true
    solicitanteService
      .list({ limit: 6 })
      .then((rows) => { if (active) setRecientes(rows) })
      .catch(() => { /* silencioso: el quick-pick es opcional */ })
    return () => { active = false }
  }, [])

  const handleSelectReciente = (s: ISolicitante) => {
    onUpdate({ solicitante: s, isNewSolicitante: false, formData: null })
  }

  // Edición de un solicitante existente (PATCH inmediato). Estado local: no toca
  // el wizard hasta guardar; al guardar, reemplaza el solicitante seleccionado.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ISolicitanteCreateData | null>(null)
  // Snapshot de los datos al abrir la edición — para saber si hay cambios sin
  // guardar (comparando contra el form actual) y mostrar el aviso.
  const [editBaseline, setEditBaseline] = useState<ISolicitanteCreateData | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ¿El form de edición difiere del original? (false si volvió a su valor inicial)
  const isEditDirty =
    !!editForm && !!editBaseline && JSON.stringify(editForm) !== JSON.stringify(editBaseline)

  // Avisar al wizard padre del estado "cambios sin guardar" para que bloquee
  // "Siguiente". Al desmontar (o salir de la edición) se limpia.
  useEffect(() => {
    onEditingDirtyChange?.(isEditDirty)
    return () => onEditingDirtyChange?.(false)
  }, [isEditDirty, onEditingDirtyChange])

  const handleEditExisting = (s: ISolicitante) => {
    setEditError(null)
    setEditingId(s.id)
    const initial: ISolicitanteCreateData = {
      tipo_persona: s.tipo_persona,
      nombre: s.nombre,
      apellido: s.apellido,
      tipo_documento: s.tipo_documento,
      numero_documento: s.numero_documento,
      email: s.email,
      telefono: s.telefono ?? undefined,
      direccion: s.direccion ?? undefined,
      departamento: s.departamento ?? undefined,
      ciudad: s.ciudad ?? undefined,
      ocupacion: s.ocupacion ?? undefined,
      actividad_economica: s.actividad_economica ?? undefined,
      empresa: s.empresa ?? undefined,
      ingresos_mensuales: s.ingresos_mensuales ?? undefined,
      nivel_educativo: s.nivel_educativo ?? undefined,
      parentesco: s.parentesco ?? undefined,
      habitara_inmueble: s.habitara_inmueble,
    }
    setEditForm(initial)
    setEditBaseline(initial)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
    setEditBaseline(null)
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return
    setIsSavingEdit(true)
    setEditError(null)
    try {
      const updated = await solicitanteService.updateSolicitante(editingId, editForm)
      onUpdate({ solicitante: updated, isNewSolicitante: false, formData: null })
      setEditingId(null)
      setEditForm(null)
      setEditBaseline(null)
      toast.success('Solicitante actualizado')
      // Refrescar el quick-pick para que muestre los datos actualizados.
      solicitanteService.list({ limit: 6 }).then(setRecientes).catch(() => {})
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron guardar los cambios'
      setEditError(msg)
      toast.error(msg)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Crear directo, sin tener que buscar primero. Si ya escribió tipo/número,
  // los arrastra al formulario.
  const handleStartCreate = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: true,
      formData: {
        tipo_persona: 'natural',
        nombre: '',
        apellido: '',
        tipo_documento: searchTipoDoc || 'cc',
        numero_documento: searchNumDoc.trim(),
        email: '',
        telefono: '',
      },
    })
  }

  // Buscar solicitante por documento
  const handleSearch = useCallback(async () => {
    if (!searchTipoDoc || !searchNumDoc.trim()) {
      setSearchError('Ingresa tipo y número de documento')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    // Limpiar el aviso anterior: si no, el estudio vigente de la persona
    // buscada antes seguiría en pantalla junto a los datos de otra.
    setEstudioVigente(null)

    try {
      // El aviso del §5.2 es informativo: si la consulta falla, la búsqueda
      // del solicitante sigue su curso. Por eso va en paralelo y con catch.
      const [solicitante, vigente] = await Promise.all([
        solicitanteService.searchByDocument(searchTipoDoc, searchNumDoc.trim()),
        estudioService
          .buscarVigentePorDocumento(searchTipoDoc, searchNumDoc.trim())
          .catch(() => null),
      ])
      setEstudioVigente(vigente)

      if (solicitante) {
        onUpdate({
          solicitante,
          isNewSolicitante: false,
          formData: null,
        })
      } else {
        // No encontrado → abrir directo el formulario de creación, prellenado
        // con lo que ya escribió. Antes había un paso intermedio "Crear nuevo"
        // (un clic extra); ahora fluye solo.
        onUpdate({
          solicitante: null,
          isNewSolicitante: true,
          formData: {
            tipo_persona: 'natural',
            nombre: '',
            apellido: '',
            tipo_documento: searchTipoDoc || 'cc',
            numero_documento: searchNumDoc.trim(),
            email: '',
            telefono: '',
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en la busqueda'
      setSearchError(message)
    } finally {
      setIsSearching(false)
    }
  }, [searchTipoDoc, searchNumDoc, onUpdate])

  // Cancelar y volver a busqueda
  const handleCancelCreate = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: false,
      formData: null,
    })
    setSearchTipoDoc('cc')
    setSearchNumDoc('')
  }

  // Limpiar solicitante seleccionado
  const handleClearSelection = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: false,
      formData: null,
    })
  }

  // Editando un solicitante existente — reusa el formulario completo.
  if (editingId && editForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
              Editar solicitante
            </h2>
            <p className="mt-1 text-sm text-gray-500">Actualiza los datos y guarda los cambios.</p>
          </div>
          <button type="button" onClick={handleCancelEdit} className="text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </div>

        {/* Aviso prominente: hay cambios sin guardar. Mientras esté visible, el
            wizard bloquea "Siguiente" (vía onEditingDirtyChange) — el usuario
            DEBE guardar o cancelar antes de avanzar. */}
        {isEditDirty && (
          <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <IconAlertTriangle size={22} className="text-amber-600" />
              </span>
              <div>
                <p className="text-base font-bold text-amber-900 sm:text-lg">
                  Hiciste cambios sin guardar
                </p>
                <p className="mt-0.5 text-sm text-amber-800">
                  Para que se apliquen debes hacer clic en{' '}
                  <span className="font-semibold">«Guardar cambios»</span>. Si avanzas sin guardar,
                  se perderán.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {isSavingEdit && <IconLoader size={16} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        )}

        {editError && <p className="text-sm text-red-600">{editError}</p>}

        <SolicitanteForm
          formData={editForm}
          errors={{}}
          onUpdateField={(field, value) => setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev))}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSavingEdit}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50',
              isEditDirty && 'ring-2 ring-amber-400 ring-offset-2',
            )}
          >
            {isSavingEdit && <IconLoader size={16} className="animate-spin" />}
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSavingEdit}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // Si hay solicitante seleccionado, mostrar card
  if (data.solicitante) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
            {WIZARD_MESSAGES.STEP2_TITLE}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {WIZARD_MESSAGES.SOLICITANTE_FOUND}
          </p>
        </div>

        <SolicitanteCard
          solicitante={data.solicitante}
          onClear={handleClearSelection}
          onEdit={() => handleEditExisting(data.solicitante!)}
        />
      </div>
    )
  }

  // Si esta creando nuevo, mostrar formulario
  if (data.isNewSolicitante && data.formData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
              {WIZARD_MESSAGES.CREATE_NEW_SOLICITANTE}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Complete todos los campos requeridos
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelCreate}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>

        <SolicitanteForm
          formData={data.formData}
          errors={errors}
          onUpdateField={onUpdateField}
        />
      </div>
    )
  }

  // Modo busqueda
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          {WIZARD_MESSAGES.STEP2_TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {WIZARD_MESSAGES.STEP2_SUBTITLE}
        </p>
      </div>

      {/* Búsqueda — barra unificada (tipo + número + buscar en un solo grupo) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
            <IconSearch size={20} className="text-primary-600" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Buscar solicitante</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Escribe el documento. Si no existe, abrimos el formulario para crearlo al instante.
            </p>
          </div>
        </div>

        {/* Input group: select de tipo + número + botón, unidos */}
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-0">
          <select
            aria-label="Tipo de documento"
            value={searchTipoDoc}
            onChange={(e) => setSearchTipoDoc(e.target.value as TipoDocumento | '')}
            className="sm:w-44 rounded-lg sm:rounded-r-none sm:border-r-0 border border-gray-300 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10"
          >
            {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            autoFocus
            inputMode="numeric"
            value={searchNumDoc}
            onChange={(e) => setSearchNumDoc(e.target.value)}
            placeholder="Número de documento"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            className="flex-1 min-w-0 rounded-lg sm:rounded-none border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10"
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchTipoDoc || !searchNumDoc.trim()}
            className="rounded-lg sm:rounded-l-none px-6 py-3 bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isSearching ? <IconLoader size={18} className="animate-spin" /> : <IconSearch size={18} />}
            Buscar
          </button>
        </div>

        {/* §5.2 — ya hay un estudio vigente para este documento */}
        {estudioVigente && (
          <div className="mt-3 rounded-xl border border-primary-200 bg-primary-50/70 p-4">
            <div className="flex items-start gap-3">
              <IconFileCheck size={18} className="mt-0.5 shrink-0 text-primary-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary-900">
                  Esta persona ya tiene un estudio vigente
                </p>
                <p className="mt-1 text-sm text-primary-800">
                  {estudioVigente.expediente_numero
                    ? `Expediente ${estudioVigente.expediente_numero}. `
                    : ''}
                  Le quedan {estudioVigente.dias_restantes}{' '}
                  {estudioVigente.dias_restantes === 1 ? 'día' : 'días'} de vigencia. Puedes
                  reutilizarlo para esta propiedad sin volver a cobrarlo.
                </p>
                <Link
                  href={`/expedientes/${estudioVigente.expediente_id}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800"
                >
                  Ver el estudio existente
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error de busqueda */}
        {searchError && (
          <p className="text-sm text-red-600 mt-3">{searchError}</p>
        )}

        {/* Atajo: crear directo sin buscar */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">¿Es un solicitante nuevo?</span>
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <IconPlus size={16} />
            Crear solicitante
          </button>
        </div>
      </div>

      {/* Quick-pick: solicitantes ya registrados por este usuario */}
      {recientes.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            O elige uno que ya registraste
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recientes.map((s) => {
              const docLabel = TIPO_DOCUMENTO_OPTIONS.find((t) => t.value === s.tipo_documento)?.label
                || s.tipo_documento.toUpperCase()
              const iniciales = `${s.nombre?.[0] ?? ''}${s.apellido?.[0] ?? ''}`.toUpperCase() || '?'
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectReciente(s)}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50/40 text-left transition-colors"
                >
                  <span className="shrink-0 h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700">
                    {iniciales}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {s.nombre} {s.apellido}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {docLabel}: {s.numero_documento}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Error de validacion */}
      {errors.solicitante && (
        <p className="text-sm text-red-600">{errors.solicitante}</p>
      )}
    </div>
  )
}

// ============================================
// Componente: Card de solicitante encontrado
// ============================================

function SolicitanteCard({
  solicitante,
  onClear,
  onEdit,
}: {
  solicitante: ISolicitante
  onClear: () => void
  onEdit?: () => void
}) {
  const tipoDocLabel = TIPO_DOCUMENTO_OPTIONS.find(
    (t) => t.value === solicitante.tipo_documento
  )?.label || solicitante.tipo_documento.toUpperCase()

  return (
    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <IconCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {solicitante.nombre} {solicitante.apellido}
            </p>
            <p className="text-sm text-gray-600">
              {tipoDocLabel}: {solicitante.numero_documento}
            </p>
            <p className="text-sm text-gray-500">{solicitante.email}</p>
            {solicitante.telefono && (
              <p className="text-sm text-gray-500">{solicitante.telefono}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Editar datos del solicitante"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-primary-700 hover:bg-white rounded-md"
            >
              <IconPencil size={14} /> Editar
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            title="Quitar selección"
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Componente: Formulario de nuevo solicitante
// ============================================

function SolicitanteForm({
  formData,
  errors,
  onUpdateField,
}: {
  formData: ISolicitanteCreateData
  errors: Record<string, string>
  onUpdateField: (field: string, value: unknown) => void
}) {
  // Flujo de Gerencia, modulo de estudios, §5.1: los campos de este paso son
  // los MÍNIMOS para identificar y contactar al prospecto. Lo laboral y los
  // ingresos se los pregunta el §8.2 al propio prospecto en su pantalla, que
  // es donde el dato es fiable y donde el documento pide que se explique para
  // qué se usa. Aquí quedan detrás de un toggle: quien ya los tiene a mano
  // puede capturarlos, pero el camino rápido es el del documento.
  const [showMore, setShowMore] = useState(false)

  const inputClasses = (hasError: boolean) =>
    cn(
      'block w-full rounded-lg border px-3.5 py-2.5 text-base sm:text-sm',
      'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  const selectClasses = (hasError: boolean) =>
    cn(
      'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-base sm:text-sm',
      'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  return (
    <div className="space-y-8">
      {/* Seccion: Datos Basicos */}
      <section>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {WIZARD_MESSAGES.SECTION_DATOS_BASICOS}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de persona */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_TIPO_PERSONA} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipo_persona || ''}
              onChange={(e) => onUpdateField('tipo_persona', e.target.value)}
              className={selectClasses(!!errors.tipo_persona)}
            >
              <option value="">Seleccionar...</option>
              {TIPO_PERSONA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.tipo_persona && (
              <p className="mt-1 text-xs text-red-600">{errors.tipo_persona}</p>
            )}
          </div>

          {/* Espacio vacio para alinear */}
          <div />

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_NOMBRE} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre || ''}
              onChange={(e) => onUpdateField('nombre', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_NOMBRE}
              className={inputClasses(!!errors.nombre)}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_APELLIDO} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.apellido || ''}
              onChange={(e) => onUpdateField('apellido', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_APELLIDO}
              className={inputClasses(!!errors.apellido)}
            />
            {errors.apellido && (
              <p className="mt-1 text-xs text-red-600">{errors.apellido}</p>
            )}
          </div>

          {/* Tipo de documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_TIPO_DOCUMENTO} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipo_documento || ''}
              onChange={(e) => onUpdateField('tipo_documento', e.target.value)}
              className={selectClasses(!!errors.tipo_documento)}
            >
              <option value="">Seleccionar...</option>
              {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.tipo_documento && (
              <p className="mt-1 text-xs text-red-600">{errors.tipo_documento}</p>
            )}
          </div>

          {/* Numero de documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_NUMERO_DOCUMENTO} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.numero_documento || ''}
              onChange={(e) => onUpdateField('numero_documento', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_DOCUMENTO}
              className={inputClasses(!!errors.numero_documento)}
            />
            {errors.numero_documento && (
              <p className="mt-1 text-xs text-red-600">{errors.numero_documento}</p>
            )}
          </div>
        </div>
      </section>

      {/* Seccion: Contacto */}
      <section>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {WIZARD_MESSAGES.SECTION_CONTACTO}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_EMAIL} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => onUpdateField('email', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_EMAIL}
              className={inputClasses(!!errors.email)}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Telefono (= WhatsApp del arrendatario para firmar) */}
          <div>
            <PhoneInput
              label={WIZARD_MESSAGES.LABEL_TELEFONO}
              required
              value={formData.telefono || ''}
              onChange={(v) => onUpdateField('telefono', v)}
              placeholder="300 123 4567"
              error={errors.telefono}
            />
            <p className="mt-1 text-xs text-gray-500">
              A este WhatsApp le llega el enlace para firmar el contrato.
            </p>
          </div>
        </div>
      </section>

      {/* §5.1: todo lo que no es mínimo vive aquí detrás. */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        {showMore ? '− Ocultar datos adicionales' : '+ Agregar datos adicionales (opcional)'}
      </button>

      {showMore && (
        <>
      {/* Seccion: Ubicacion */}
      <section>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {WIZARD_MESSAGES.SECTION_UBICACION}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Direccion */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_DIRECCION}
            </label>
            <input
              type="text"
              value={formData.direccion || ''}
              onChange={(e) => onUpdateField('direccion', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_DIRECCION}
              className={inputClasses(false)}
            />
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_DEPARTAMENTO}
            </label>
            <select
              value={formData.departamento || ''}
              onChange={(e) => onUpdateField('departamento', e.target.value)}
              className={selectClasses(false)}
            >
              <option value="">Seleccionar...</option>
              {DEPARTAMENTOS_COLOMBIA.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_CIUDAD}
            </label>
            <input
              type="text"
              value={formData.ciudad || ''}
              onChange={(e) => onUpdateField('ciudad', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_CIUDAD}
              className={inputClasses(false)}
            />
          </div>
        </div>
      </section>

      {/* Seccion: Informacion Laboral */}
      <section>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {WIZARD_MESSAGES.SECTION_LABORAL}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ocupacion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_OCUPACION}
            </label>
            <input
              type="text"
              value={formData.ocupacion || ''}
              onChange={(e) => onUpdateField('ocupacion', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_OCUPACION}
              className={inputClasses(false)}
            />
          </div>

          {/* Actividad economica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_ACTIVIDAD_ECONOMICA}
            </label>
            <input
              type="text"
              value={formData.actividad_economica || ''}
              onChange={(e) => onUpdateField('actividad_economica', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_ACTIVIDAD}
              className={inputClasses(false)}
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_EMPRESA}
            </label>
            <input
              type="text"
              value={formData.empresa || ''}
              onChange={(e) => onUpdateField('empresa', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_EMPRESA}
              className={inputClasses(false)}
            />
          </div>

          {/* Ingresos mensuales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_INGRESOS}
            </label>
            <input
              type="number"
              value={formData.ingresos_mensuales || ''}
              onChange={(e) =>
                onUpdateField(
                  'ingresos_mensuales',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_INGRESOS}
              min="0"
              className={inputClasses(false)}
            />
          </div>
        </div>
      </section>

      {/* Seccion: Informacion Adicional */}
      <section>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          {WIZARD_MESSAGES.SECTION_ADICIONAL}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nivel educativo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_NIVEL_EDUCATIVO}
            </label>
            <select
              value={formData.nivel_educativo || ''}
              onChange={(e) => onUpdateField('nivel_educativo', e.target.value || undefined)}
              className={selectClasses(false)}
            >
              <option value="">Seleccionar...</option>
              {NIVEL_EDUCATIVO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Parentesco */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_PARENTESCO}
            </label>
            <input
              type="text"
              value={formData.parentesco || ''}
              onChange={(e) => onUpdateField('parentesco', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_PARENTESCO}
              className={inputClasses(false)}
            />
          </div>

          {/* Habitara el inmueble */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.habitara_inmueble || false}
                onChange={(e) => onUpdateField('habitara_inmueble', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {WIZARD_MESSAGES.LABEL_HABITARA_INMUEBLE}
              </span>
            </label>
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  )
}
