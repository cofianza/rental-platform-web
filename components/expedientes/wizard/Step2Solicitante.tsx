/**
 * Step2Solicitante - HP-247
 * Paso 2: Buscar o crear solicitante
 */

'use client'

import { useState, useCallback } from 'react'
import {
  IconSearch,
  IconLoader,
  IconUser,
  IconCheck,
  IconX,
  IconPlus,
} from '@/components/icons'
import { solicitanteService } from '@/services/solicitanteService'
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
}

export function Step2Solicitante({
  data,
  errors,
  onUpdate,
  onUpdateField,
}: Step2SolicitanteProps) {
  // Estado local para busqueda
  const [searchTipoDoc, setSearchTipoDoc] = useState<TipoDocumento | ''>('')
  const [searchNumDoc, setSearchNumDoc] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  // Buscar solicitante por documento
  const handleSearch = useCallback(async () => {
    if (!searchTipoDoc || !searchNumDoc.trim()) {
      setSearchError('Ingrese tipo y numero de documento')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearched(true)

    try {
      const solicitante = await solicitanteService.searchByDocument(
        searchTipoDoc,
        searchNumDoc.trim()
      )

      if (solicitante) {
        onUpdate({
          solicitante,
          isNewSolicitante: false,
          formData: null,
        })
      } else {
        // No encontrado - ofrecer crear nuevo
        onUpdate({
          solicitante: null,
          isNewSolicitante: false,
          formData: null,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en la busqueda'
      setSearchError(message)
    } finally {
      setIsSearching(false)
    }
  }, [searchTipoDoc, searchNumDoc, onUpdate])

  // Iniciar creacion de nuevo solicitante
  const handleStartCreate = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: true,
      formData: {
        tipo_persona: 'natural',
        nombre: '',
        apellido: '',
        tipo_documento: searchTipoDoc || 'cc',
        numero_documento: searchNumDoc,
        email: '',
        telefono: '',
      },
    })
  }

  // Cancelar y volver a busqueda
  const handleCancelCreate = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: false,
      formData: null,
    })
    setSearched(false)
    setSearchTipoDoc('')
    setSearchNumDoc('')
  }

  // Limpiar solicitante seleccionado
  const handleClearSelection = () => {
    onUpdate({
      solicitante: null,
      isNewSolicitante: false,
      formData: null,
    })
    setSearched(false)
  }

  // Clases para inputs
  const inputClasses = (hasError: boolean) =>
    cn(
      'block w-full px-3 py-2 border rounded-lg text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  const selectClasses = (hasError: boolean) =>
    cn(
      'block w-full px-3 py-2 border rounded-lg text-sm bg-white',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  // Si hay solicitante seleccionado, mostrar card
  if (data.solicitante) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {WIZARD_MESSAGES.STEP2_TITLE}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {WIZARD_MESSAGES.SOLICITANTE_FOUND}
          </p>
        </div>

        <SolicitanteCard
          solicitante={data.solicitante}
          onClear={handleClearSelection}
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
            <h2 className="text-xl font-semibold text-gray-900">
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
        <h2 className="text-xl font-semibold text-gray-900">
          {WIZARD_MESSAGES.STEP2_TITLE}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {WIZARD_MESSAGES.STEP2_SUBTITLE}
        </p>
      </div>

      {/* Formulario de busqueda */}
      <div className="p-6 bg-gray-50 rounded-lg space-y-4">
        <h3 className="text-sm font-medium text-gray-700">
          {WIZARD_MESSAGES.USE_EXISTING_SOLICITANTE}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tipo de documento */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de documento
            </label>
            <select
              value={searchTipoDoc}
              onChange={(e) => setSearchTipoDoc(e.target.value as TipoDocumento | '')}
              className={selectClasses(false)}
            >
              <option value="">Seleccionar...</option>
              {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Numero de documento */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numero de documento
            </label>
            <input
              type="text"
              value={searchNumDoc}
              onChange={(e) => setSearchNumDoc(e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_DOCUMENTO}
              className={inputClasses(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
            />
          </div>

          {/* Boton buscar */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchTipoDoc || !searchNumDoc.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconSearch size={16} />
              )}
              Buscar
            </button>
          </div>
        </div>

        {/* Error de busqueda */}
        {searchError && (
          <p className="text-sm text-red-600">{searchError}</p>
        )}
      </div>

      {/* Resultado: no encontrado */}
      {searched && !data.solicitante && !isSearching && (
        <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center">
          <IconUser size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            {WIZARD_MESSAGES.SOLICITANTE_NOT_FOUND}
          </p>
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <IconPlus size={16} />
            {WIZARD_MESSAGES.CREATE_NEW_SOLICITANTE}
          </button>
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
}: {
  solicitante: ISolicitante
  onClear: () => void
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
        <button
          type="button"
          onClick={onClear}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <IconX size={20} />
        </button>
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
  const inputClasses = (hasError: boolean) =>
    cn(
      'block w-full px-3 py-2 border rounded-lg text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  const selectClasses = (hasError: boolean) =>
    cn(
      'block w-full px-3 py-2 border rounded-lg text-sm bg-white',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  return (
    <div className="space-y-8">
      {/* Seccion: Datos Basicos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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

          {/* Telefono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {WIZARD_MESSAGES.LABEL_TELEFONO}
            </label>
            <input
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => onUpdateField('telefono', e.target.value)}
              placeholder={WIZARD_MESSAGES.PLACEHOLDER_TELEFONO}
              className={inputClasses(!!errors.telefono)}
            />
            {errors.telefono && (
              <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>
            )}
          </div>
        </div>
      </section>

      {/* Seccion: Ubicacion */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
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
    </div>
  )
}
