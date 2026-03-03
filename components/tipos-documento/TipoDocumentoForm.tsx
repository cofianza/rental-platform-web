'use client'

import { useState, useEffect, useMemo } from 'react'
import { IconLoader } from '@/components/icons'
import type { ITipoDocumento, ICreateTipoDocumento } from '@/types/documento'
import { tipoDocumentoAdminService } from '@/services/tipoDocumentoAdminService'

interface TipoDocumentoFormProps {
  mode: 'create' | 'edit'
  initialData?: ITipoDocumento
  onSubmit: (data: ICreateTipoDocumento) => Promise<boolean>
  onCancel: () => void
  isLoading: boolean
}

interface FormErrors {
  nombre?: string
  codigo?: string
  formatos_aceptados?: string
  tamano_maximo_mb?: string
}

const FORMATO_OPTIONS = [
  { label: 'PDF', value: 'application/pdf' },
  { label: 'JPG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WEBP', value: 'image/webp' },
] as const

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const DEFAULT_FORM: ICreateTipoDocumento = {
  nombre: '',
  codigo: '',
  descripcion: '',
  es_obligatorio: false,
  formatos_aceptados: [],
  tamano_maximo_mb: 10,
}

export function TipoDocumentoForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: TipoDocumentoFormProps) {
  const [formData, setFormData] = useState<ICreateTipoDocumento>(DEFAULT_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [autoSlug, setAutoSlug] = useState(mode === 'create')
  const [isCheckingCodigo, setIsCheckingCodigo] = useState(false)
  const [codigoDisponible, setCodigoDisponible] = useState<boolean | null>(null)

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        nombre: initialData.nombre,
        codigo: initialData.codigo,
        descripcion: initialData.descripcion || '',
        es_obligatorio: initialData.es_obligatorio,
        formatos_aceptados: initialData.formatos_aceptados,
        tamano_maximo_mb: initialData.tamano_maximo_mb,
      })
      setAutoSlug(false)
    }
  }, [mode, initialData])

  // Debounced code uniqueness check
  useEffect(() => {
    const codigo = formData.codigo.trim()
    if (!codigo || codigo.length < 2 || !/^[a-z0-9_]+$/.test(codigo)) {
      setCodigoDisponible(null)
      return
    }
    if (mode === 'edit' && initialData && codigo === initialData.codigo) {
      setCodigoDisponible(true)
      return
    }

    setIsCheckingCodigo(true)
    const timer = setTimeout(async () => {
      try {
        const excludeId = mode === 'edit' ? initialData?.id : undefined
        const result = await tipoDocumentoAdminService.checkCodigo(codigo, excludeId)
        setCodigoDisponible(result.disponible)
      } catch {
        setCodigoDisponible(null)
      } finally {
        setIsCheckingCodigo(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      setIsCheckingCodigo(false)
    }
  }, [formData.codigo, mode, initialData])

  // Unsaved changes protection
  const isDirty = useMemo(() => {
    if (mode === 'create') {
      return (
        formData.nombre !== '' ||
        formData.codigo !== '' ||
        (formData.descripcion || '') !== '' ||
        formData.es_obligatorio !== false ||
        formData.formatos_aceptados.length !== 0 ||
        formData.tamano_maximo_mb !== 10
      )
    }
    if (!initialData) return false
    return (
      formData.nombre !== initialData.nombre ||
      formData.codigo !== initialData.codigo ||
      (formData.descripcion || '') !== (initialData.descripcion || '') ||
      formData.es_obligatorio !== initialData.es_obligatorio ||
      JSON.stringify([...formData.formatos_aceptados].sort()) !==
        JSON.stringify([...initialData.formatos_aceptados].sort()) ||
      formData.tamano_maximo_mb !== initialData.tamano_maximo_mb
    )
  }, [formData, mode, initialData])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El codigo es requerido'
    } else if (!/^[a-z0-9_]+$/.test(formData.codigo)) {
      newErrors.codigo = 'Solo letras minusculas, numeros y guion bajo'
    } else if (formData.codigo.length < 2) {
      newErrors.codigo = 'Minimo 2 caracteres'
    } else if (codigoDisponible === false) {
      newErrors.codigo = 'Este codigo ya esta en uso'
    }

    if (formData.formatos_aceptados.length === 0) {
      newErrors.formatos_aceptados = 'Selecciona al menos un formato'
    }

    if (!formData.tamano_maximo_mb || formData.tamano_maximo_mb < 1) {
      newErrors.tamano_maximo_mb = 'Minimo 1 MB'
    } else if (formData.tamano_maximo_mb > 10) {
      newErrors.tamano_maximo_mb = 'Maximo 10 MB (limite del bucket de almacenamiento)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const payload: ICreateTipoDocumento = {
      ...formData,
      descripcion: formData.descripcion?.trim() || null,
    }
    await onSubmit(payload)
  }

  const handleNombreChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      nombre: value,
      ...(autoSlug ? { codigo: toSlug(value) } : {}),
    }))
    if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined }))
  }

  const handleCodigoChange = (value: string) => {
    setAutoSlug(false)
    setFormData((prev) => ({ ...prev, codigo: value }))
    if (errors.codigo) setErrors((prev) => ({ ...prev, codigo: undefined }))
  }

  const handleFormatoToggle = (formato: string) => {
    setFormData((prev) => {
      const current = prev.formatos_aceptados
      const next = current.includes(formato)
        ? current.filter((f) => f !== formato)
        : [...current, formato]
      return { ...prev, formatos_aceptados: next }
    })
    if (errors.formatos_aceptados) setErrors((prev) => ({ ...prev, formatos_aceptados: undefined }))
  }

  const handleSelectAllFormatos = () => {
    const allValues = FORMATO_OPTIONS.map((o) => o.value)
    const allSelected = allValues.every((v) => formData.formatos_aceptados.includes(v))
    setFormData((prev) => ({
      ...prev,
      formatos_aceptados: allSelected ? [] : [...allValues],
    }))
    if (errors.formatos_aceptados) setErrors((prev) => ({ ...prev, formatos_aceptados: undefined }))
  }

  const allFormatosSelected = FORMATO_OPTIONS.every((o) =>
    formData.formatos_aceptados.includes(o.value),
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Nombre */}
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre *
        </label>
        <input
          type="text"
          id="nombre"
          value={formData.nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          disabled={isLoading}
          className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.nombre ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ej: Certificado Laboral"
          maxLength={100}
        />
        {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>}
      </div>

      {/* Codigo */}
      <div>
        <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
          Codigo *
        </label>
        <input
          type="text"
          id="codigo"
          value={formData.codigo}
          onChange={(e) => handleCodigoChange(e.target.value)}
          disabled={isLoading}
          className={`block w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.codigo ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="certificado_laboral"
          maxLength={50}
        />
        <p className="mt-1 text-xs text-gray-500">
          Solo letras minusculas, numeros y guion bajo (_)
        </p>
        {isCheckingCodigo && (
          <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
            <IconLoader size={12} className="animate-spin" /> Verificando disponibilidad...
          </p>
        )}
        {!isCheckingCodigo && codigoDisponible === false && !errors.codigo && (
          <p className="mt-1 text-xs text-red-600">Este codigo ya esta en uso</p>
        )}
        {!isCheckingCodigo && codigoDisponible === true && formData.codigo.length >= 2 && !errors.codigo && (
          <p className="mt-1 text-xs text-green-600">Codigo disponible</p>
        )}
        {errors.codigo && <p className="mt-1 text-xs text-red-600">{errors.codigo}</p>}
      </div>

      {/* Descripcion */}
      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripcion
        </label>
        <textarea
          id="descripcion"
          value={formData.descripcion || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
          disabled={isLoading}
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 resize-none"
          placeholder="Descripcion opcional del tipo de documento"
          maxLength={500}
        />
      </div>

      {/* Es obligatorio */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setFormData((prev) => ({ ...prev, es_obligatorio: !prev.es_obligatorio }))
          }
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
            formData.es_obligatorio ? 'bg-primary-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={formData.es_obligatorio}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              formData.es_obligatorio ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <label className="text-sm font-medium text-gray-700">Es obligatorio</label>
      </div>

      {/* Formatos aceptados */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Formatos aceptados *
        </label>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={handleSelectAllFormatos}
            disabled={isLoading}
            className="text-xs text-primary-600 hover:text-primary-700 underline disabled:opacity-50"
          >
            {allFormatosSelected ? 'Limpiar' : 'Seleccionar todos'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATO_OPTIONS.map((option) => {
            const isChecked = formData.formatos_aceptados.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFormatoToggle(option.value)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  isChecked
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {errors.formatos_aceptados && (
          <p className="mt-1 text-xs text-red-600">{errors.formatos_aceptados}</p>
        )}
      </div>

      {/* Tamano maximo */}
      <div>
        <label htmlFor="tamano_maximo_mb" className="block text-sm font-medium text-gray-700 mb-1">
          Tamano maximo (MB) *
        </label>
        <input
          type="number"
          id="tamano_maximo_mb"
          value={formData.tamano_maximo_mb}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, tamano_maximo_mb: Number(e.target.value) }))
            if (errors.tamano_maximo_mb)
              setErrors((prev) => ({ ...prev, tamano_maximo_mb: undefined }))
          }}
          disabled={isLoading}
          min={1}
          max={10}
          className={`block w-32 px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
            errors.tamano_maximo_mb ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.tamano_maximo_mb && (
          <p className="mt-1 text-xs text-red-600">{errors.tamano_maximo_mb}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
        >
          {isLoading && <IconLoader size={16} className="animate-spin" />}
          {mode === 'create' ? 'Crear Tipo' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  )
}
