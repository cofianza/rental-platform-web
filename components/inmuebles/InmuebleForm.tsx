/**
 * Formulario de Inmueble - HP-174
 * Componente para crear/editar inmuebles
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconChevronRight, IconHome, IconPlus, IconX, IconImage } from '@/components/icons'
import { PageHeader } from '@/components/ui'
import { ImageUploader } from './ImageUploader'
import { PropietarioSelector } from './PropietarioSelector'
import { GaleriaSection } from './GaleriaSection'
import {
  TIPO_OPTIONS,
  USO_OPTIONS,
  ESTRATO_OPTIONS,
  INMUEBLE_MESSAGES,
} from './constants'
import { inmuebleService } from '@/services/inmuebleService'
import type {
  IInmueble,
  IInmuebleCreateData,
  IInmuebleUpdateData,
  TipoInmueble,
  UsoInmueble,
} from '@/types/inmueble'
// No importamos IUserProfile ya que solo usamos el ID del propietario
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// ── Field Tooltip ───────────────────────────────────────────

function FieldTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center cursor-help hover:bg-primary-100 hover:text-primary-600 transition-colors">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-normal w-56 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  )
}

// ── COP Currency Input ──────────────────────────────────────

function formatCOPDisplay(value: number | ''): string {
  if (value === '' || value === 0) return ''
  return new Intl.NumberFormat('es-CO').format(Number(value))
}

function parseCOPInput(display: string): number | '' {
  const cleaned = display.replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '')
  if (!cleaned) return ''
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? '' : num
}

function CurrencyInput({ label, id, value, onChange, disabled, placeholder, error, max, tooltip }: {
  label: string
  id: string
  value: number | ''
  onChange: (val: number | '') => void
  disabled?: boolean
  placeholder?: string
  error?: string
  max?: number
  tooltip?: string
}) {
  const [display, setDisplay] = useState(formatCOPDisplay(value))

  useEffect(() => {
    setDisplay(formatCOPDisplay(value))
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Allow only digits and dots (as thousand separators)
    const onlyDigits = raw.replace(/[^\d]/g, '')
    if (!onlyDigits) {
      setDisplay('')
      onChange('')
      return
    }
    const num = parseInt(onlyDigits, 10)
    if (max && num > max) return
    setDisplay(new Intl.NumberFormat('es-CO').format(num))
    onChange(num)
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {tooltip && <FieldTooltip text={tooltip} />}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input
          type="text"
          inputMode="numeric"
          id={id}
          value={display}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// Departamentos de Colombia (principales)
const DEPARTAMENTOS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
]

interface InmuebleFormProps {
  mode: 'create' | 'edit'
  inmueble?: IInmueble | null
}

interface FormData {
  // Requeridos
  codigo: string
  direccion: string
  ciudad: string
  departamento: string
  tipo: TipoInmueble | ''
  estrato: number | ''
  valor_arriendo: number | ''
  propietario_id: string
  foto_fachada_url: string
  // Opcionales
  barrio: string
  uso: UsoInmueble
  destinacion: string
  valor_comercial: number | ''
  administracion: number | ''
  area_m2: number | ''
  habitaciones: number | ''
  banos: number | ''
  parqueadero: boolean
  parqueaderos: number | ''
  piso: string
  descripcion: string
  notas_internas: string
  visible_vitrina: boolean
  // Datos para contrato
  propiedad_horizontal: 'auto' | 'si' | 'no'
  cuarto_util: boolean
  ubicacion_detallada: string
}

interface FormErrors {
  codigo?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  tipo?: string
  estrato?: string
  valor_arriendo?: string
  propietario_id?: string
  foto_fachada_url?: string
  area_m2?: string
  habitaciones?: string
  banos?: string
  parqueaderos?: string
  valor_comercial?: string
  administracion?: string
}

const initialFormData: FormData = {
  codigo: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  tipo: '',
  estrato: '',
  valor_arriendo: '',
  propietario_id: '',
  foto_fachada_url: '',
  barrio: '',
  uso: 'vivienda',
  destinacion: '',
  valor_comercial: '',
  administracion: '',
  area_m2: '',
  habitaciones: '',
  banos: '',
  parqueadero: false,
  parqueaderos: '',
  piso: '',
  descripcion: '',
  notas_internas: '',
  visible_vitrina: true,
  propiedad_horizontal: 'auto',
  cuarto_util: false,
  ubicacion_detallada: '',
}

export function InmuebleForm({ mode, inmueble }: InmuebleFormProps) {
  const router = useRouter()
  const authUser = useAuthStore((s) => s.user)
  const isPropietarioUser = authUser?.rol === 'propietario'
  const isInmobiliariaUser = authUser?.rol === 'inmobiliaria'
  const isAutoAssignOwner = isPropietarioUser || isInmobiliariaUser
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialPropietario, setInitialPropietario] = useState<{
    id: string
    nombre: string
    apellido: string
  } | null>(null)
  const [fotosAdicionales, setFotosAdicionales] = useState<{ file: File; preview: string }[]>([])
  const [uploadingFotos, setUploadingFotos] = useState(false)

  // Auto-asignar propietario_id si el usuario es propietario o inmobiliaria
  useEffect(() => {
    if (isAutoAssignOwner && authUser && mode === 'create') {
      setFormData((prev) => ({ ...prev, propietario_id: authUser.id }))
    }
  }, [isAutoAssignOwner, authUser, mode])

  // Cargar datos del inmueble al editar
  useEffect(() => {
    if (mode === 'edit' && inmueble) {
      setFormData({
        codigo: inmueble.codigo || '',
        direccion: inmueble.direccion,
        ciudad: inmueble.ciudad,
        departamento: inmueble.departamento,
        tipo: inmueble.tipo,
        estrato: inmueble.estrato,
        valor_arriendo: inmueble.valor_arriendo,
        propietario_id: inmueble.propietario_id,
        foto_fachada_url: inmueble.foto_fachada_url || '',
        barrio: inmueble.barrio || '',
        uso: inmueble.uso,
        destinacion: inmueble.destinacion || '',
        valor_comercial: inmueble.valor_comercial || '',
        administracion: inmueble.administracion || '',
        area_m2: inmueble.area_m2 || '',
        habitaciones: inmueble.habitaciones || '',
        banos: inmueble.banos || '',
        parqueadero: inmueble.parqueadero,
        parqueaderos: inmueble.parqueaderos || '',
        piso: inmueble.piso || '',
        descripcion: inmueble.descripcion || '',
        notas_internas: inmueble.notas_internas || '',
        visible_vitrina: inmueble.visible_vitrina,
        propiedad_horizontal:
          inmueble.propiedad_horizontal === true ? 'si'
          : inmueble.propiedad_horizontal === false ? 'no'
          : 'auto',
        cuarto_util: Boolean(inmueble.cuarto_util),
        ubicacion_detallada: inmueble.ubicacion_detallada || '',
      })

      // Cargar datos del propietario si existen
      if (inmueble.propietario) {
        setInitialPropietario({
          id: inmueble.propietario.id,
          nombre: inmueble.propietario.nombre,
          apellido: inmueble.propietario.apellido,
        })
      }
    }
  }, [mode, inmueble])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const codigoTrim = formData.codigo.trim()
    if (!codigoTrim) {
      newErrors.codigo = 'El código del inmueble es obligatorio'
    } else if (codigoTrim.length > 30) {
      newErrors.codigo = 'El código no puede superar 30 caracteres'
    } else if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(codigoTrim)) {
      newErrors.codigo = 'Solo letras, números, guiones, guiones bajos y espacios'
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = INMUEBLE_MESSAGES.DIRECCION_REQUIRED
    }
    if (!formData.ciudad.trim()) {
      newErrors.ciudad = INMUEBLE_MESSAGES.CIUDAD_REQUIRED
    }
    if (!formData.departamento.trim()) {
      newErrors.departamento = INMUEBLE_MESSAGES.DEPARTAMENTO_REQUIRED
    }
    if (!formData.tipo) {
      newErrors.tipo = INMUEBLE_MESSAGES.TIPO_REQUIRED
    }
    if (!formData.estrato) {
      newErrors.estrato = INMUEBLE_MESSAGES.ESTRATO_REQUIRED
    }
    if (!formData.valor_arriendo) {
      newErrors.valor_arriendo = INMUEBLE_MESSAGES.VALOR_ARRIENDO_REQUIRED
    }
    if (!formData.propietario_id) {
      newErrors.propietario_id = INMUEBLE_MESSAGES.PROPIETARIO_REQUIRED
    }
    if (!formData.foto_fachada_url) {
      newErrors.foto_fachada_url = INMUEBLE_MESSAGES.FOTO_REQUIRED
    }

    // Validaciones de rango en campos numéricos
    if (formData.area_m2 && Number(formData.area_m2) > 99999) {
      newErrors.area_m2 = 'El area no puede superar 99.999 m²'
    }
    if (formData.valor_arriendo && Number(formData.valor_arriendo) > 999999999) {
      newErrors.valor_arriendo = 'El valor no puede superar $999.999.999'
    }
    if (formData.valor_comercial && Number(formData.valor_comercial) > 99999999999) {
      newErrors.valor_comercial = 'El valor no puede superar $99.999.999.999'
    }
    if (formData.administracion && Number(formData.administracion) > 999999999) {
      newErrors.administracion = 'El valor no puede superar $999.999.999'
    }
    if (formData.habitaciones && Number(formData.habitaciones) > 99) {
      newErrors.habitaciones = 'Maximo 99 habitaciones'
    }
    if (formData.banos && Number(formData.banos) > 99) {
      newErrors.banos = 'Maximo 99 baños'
    }
    if (formData.parqueaderos && Number(formData.parqueaderos) > 99) {
      newErrors.parqueaderos = 'Maximo 99 parqueaderos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor, completa todos los campos requeridos')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        const createData: IInmuebleCreateData = {
          codigo: formData.codigo.trim(),
          direccion: formData.direccion,
          ciudad: formData.ciudad,
          departamento: formData.departamento,
          tipo: formData.tipo as TipoInmueble,
          estrato: Number(formData.estrato),
          valor_arriendo: Number(formData.valor_arriendo),
          propietario_id: formData.propietario_id,
          foto_fachada_url: formData.foto_fachada_url,
          // Opcionales
          barrio: formData.barrio || undefined,
          uso: formData.uso,
          destinacion: formData.destinacion || undefined,
          valor_comercial: formData.valor_comercial ? Number(formData.valor_comercial) : undefined,
          administracion: formData.administracion ? Number(formData.administracion) : undefined,
          area_m2: formData.area_m2 ? Number(formData.area_m2) : undefined,
          habitaciones: formData.habitaciones ? Number(formData.habitaciones) : undefined,
          banos: formData.banos ? Number(formData.banos) : undefined,
          parqueadero: formData.parqueadero,
          parqueaderos: formData.parqueaderos ? Number(formData.parqueaderos) : undefined,
          piso: formData.piso || undefined,
          descripcion: formData.descripcion || undefined,
          notas_internas: formData.notas_internas || undefined,
          visible_vitrina: formData.visible_vitrina,
          // Datos para contrato
          propiedad_horizontal:
            formData.propiedad_horizontal === 'auto' ? null
            : formData.propiedad_horizontal === 'si',
          cuarto_util: formData.cuarto_util,
          ubicacion_detallada: formData.ubicacion_detallada || null,
        }

        const newInmueble = await inmuebleService.createInmueble(createData)

        // Upload fotos adicionales si hay
        if (fotosAdicionales.length > 0 && newInmueble?.id) {
          setUploadingFotos(true)
          let uploaded = 0
          for (const foto of fotosAdicionales) {
            try {
              await inmuebleService.uploadFoto(newInmueble.id, foto.file, {
                orden: uploaded + 1,
              })
              uploaded++
            } catch {
              // Continuar con las demas fotos si una falla
            }
          }
          if (uploaded > 0) {
            toast.success(`${uploaded} foto${uploaded > 1 ? 's' : ''} adicional${uploaded > 1 ? 'es' : ''} subida${uploaded > 1 ? 's' : ''}`)
          }
          setUploadingFotos(false)
        }

        toast.success(INMUEBLE_MESSAGES.CREATE_SUCCESS)
      } else if (inmueble) {
        const updateData: IInmuebleUpdateData = {
          codigo: formData.codigo.trim(),
          direccion: formData.direccion,
          ciudad: formData.ciudad,
          departamento: formData.departamento,
          tipo: formData.tipo as TipoInmueble,
          estrato: Number(formData.estrato),
          valor_arriendo: Number(formData.valor_arriendo),
          propietario_id: formData.propietario_id,
          foto_fachada_url: formData.foto_fachada_url,
          barrio: formData.barrio || null,
          uso: formData.uso,
          destinacion: formData.destinacion || null,
          valor_comercial: formData.valor_comercial ? Number(formData.valor_comercial) : null,
          administracion: formData.administracion ? Number(formData.administracion) : undefined,
          area_m2: formData.area_m2 ? Number(formData.area_m2) : null,
          habitaciones: formData.habitaciones ? Number(formData.habitaciones) : undefined,
          banos: formData.banos ? Number(formData.banos) : undefined,
          parqueadero: formData.parqueadero,
          parqueaderos: formData.parqueaderos ? Number(formData.parqueaderos) : null,
          piso: formData.piso || null,
          descripcion: formData.descripcion || null,
          notas_internas: formData.notas_internas || null,
          visible_vitrina: formData.visible_vitrina,
          // Datos para contrato
          propiedad_horizontal:
            formData.propiedad_horizontal === 'auto' ? null
            : formData.propiedad_horizontal === 'si',
          cuarto_util: formData.cuarto_util,
          ubicacion_detallada: formData.ubicacion_detallada || null,
        }

        await inmuebleService.updateInmueble(inmueble.id, updateData)

        // Upload fotos adicionales si hay (en modo edicion)
        if (fotosAdicionales.length > 0) {
          setUploadingFotos(true)
          let uploaded = 0
          for (const foto of fotosAdicionales) {
            try {
              await inmuebleService.uploadFoto(inmueble.id, foto.file, {
                orden: uploaded + 1,
              })
              uploaded++
            } catch {
              // Continuar con las demas
            }
          }
          if (uploaded > 0) {
            toast.success(`${uploaded} foto${uploaded > 1 ? 's' : ''} adicional${uploaded > 1 ? 'es' : ''} subida${uploaded > 1 ? 's' : ''}`)
          }
          setUploadingFotos(false)
        }

        toast.success(INMUEBLE_MESSAGES.UPDATE_SUCCESS)
      }

      router.push('/inmuebles')
    } catch (err: unknown) {
      console.error('Error saving inmueble:', err)
      // Caso especifico: codigo duplicado para el mismo propietario. Asi el
      // mensaje queda visible en el input + toast, no perdido en un toast generico.
      const apiError = err as {
        code?: string
        message?: string
        response?: { data?: { errorCode?: string; message?: string; details?: Array<{ field: string; message: string }> } }
      }
      const errorCode = apiError?.code || apiError?.response?.data?.errorCode
      if (errorCode === 'CODIGO_DUPLICADO') {
        const msg = apiError?.message || apiError?.response?.data?.message || 'Ese código ya está en uso para otro inmueble tuyo.'
        setErrors((prev) => ({ ...prev, codigo: msg }))
        toast.error(msg)
        return
      }

      const details = apiError?.response?.data?.details
      if (details && details.length > 0) {
        // Mostrar errores por campo del backend
        const backendErrors: FormErrors = {}
        for (const d of details) {
          if (d.field in backendErrors || d.field === 'codigo' || d.field === 'direccion' || d.field === 'ciudad' || d.field === 'tipo' || d.field === 'area_m2' || d.field === 'valor_arriendo' || d.field === 'valor_comercial' || d.field === 'administracion' || d.field === 'habitaciones' || d.field === 'banos' || d.field === 'parqueaderos') {
            backendErrors[d.field as keyof FormErrors] = d.message
          }
        }
        setErrors((prev) => ({ ...prev, ...backendErrors }))
        toast.error(details.map((d) => d.message).join('. '))
      } else {
        toast.error(mode === 'create' ? INMUEBLE_MESSAGES.CREATE_ERROR : INMUEBLE_MESSAGES.UPDATE_ERROR)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePropietarioChange = (propietarioId: string, _propietario: any) => {
    handleChange('propietario_id', propietarioId)
  }

  const inputClasses = (hasError: boolean) =>
    cn(
      'block w-full px-3 py-2 border rounded-lg text-sm',
      'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:bg-gray-100 disabled:cursor-not-allowed',
      hasError ? 'border-red-300' : 'border-gray-300'
    )

  const title = mode === 'create' ? 'Nuevo Inmueble' : 'Editar Inmueble'
  const subtitle =
    mode === 'create'
      ? 'Completa los datos para registrar un nuevo inmueble'
      : `Editando inmueble ${inmueble?.codigo || ''}`

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600 flex items-center gap-1">
          <IconHome size={16} />
          Inicio
        </Link>
        <IconChevronRight size={14} />
        <Link href="/inmuebles" className="hover:text-primary-600">
          Inmuebles
        </Link>
        <IconChevronRight size={14} />
        <span className="text-gray-900 font-medium">
          {mode === 'create' ? 'Nuevo' : 'Editar'}
        </span>
      </nav>

      {/* Header */}
      <PageHeader title={title} subtitle={subtitle} />

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Fotos — Galeria completa en edicion, uploader simple en creacion */}
        {mode === 'edit' && inmueble?.id ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Galeria de Fotos</h3>
            <p className="text-sm text-gray-500 mb-4">
              Sube, reordena, marca la foto de fachada y agrega descripciones a cada imagen.
            </p>
            <GaleriaSection inmuebleId={inmueble.id} canEdit={true} />
          </div>
        ) : (
          <>
            {/* Foto de fachada (creacion) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto de Fachada *</h3>
              <ImageUploader
                value={formData.foto_fachada_url}
                onChange={(url) => handleChange('foto_fachada_url', url)}
                inmuebleId={inmueble?.id}
                disabled={isSubmitting}
                error={errors.foto_fachada_url}
              />
            </div>

            {/* Fotos adicionales (creacion) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Fotos adicionales</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Opcional</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Agrega fotos del interior. La primera foto sera la de fachada. Puedes reordenar y editar descripciones despues desde el detalle.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fotosAdicionales.map((foto, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={foto.preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(foto.preview)
                        setFotosAdicionales((prev) => prev.filter((_, i) => i !== idx))
                      }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}

                {fotosAdicionales.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    <IconImage size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Agregar</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        const remaining = 10 - fotosAdicionales.length
                        const toAdd = files.slice(0, remaining)
                        const newFotos = toAdd.map((file) => ({
                          file,
                          preview: URL.createObjectURL(file),
                        }))
                        setFotosAdicionales((prev) => [...prev, ...newFotos])
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>

              {fotosAdicionales.length >= 10 && (
                <p className="text-xs text-amber-600 mt-2">Máximo 10 fotos adicionales</p>
              )}
            </div>
          </>
        )}

        {/* Información básica */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de inmueble */}
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Inmueble *
              </label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                disabled={isSubmitting}
                className={inputClasses(!!errors.tipo)}
              >
                <option value="">Seleccionar tipo...</option>
                {TIPO_OPTIONS.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.tipo && <p className="mt-1 text-xs text-red-600">{errors.tipo}</p>}
            </div>

            {/* Uso */}
            <div>
              <label htmlFor="uso" className="block text-sm font-medium text-gray-700 mb-1">
                Uso
                <FieldTooltip text="Vivienda: para habitar. Comercial: para oficinas, locales o negocios." />
              </label>
              <select
                id="uso"
                value={formData.uso}
                onChange={(e) => handleChange('uso', e.target.value)}
                disabled={isSubmitting}
                className={inputClasses(false)}
              >
                {USO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estrato */}
            <div>
              <label htmlFor="estrato" className="block text-sm font-medium text-gray-700 mb-1">
                Estrato *
                <FieldTooltip text="Clasificacion socioeconomica de 1 a 6 usada en Colombia. Determina el costo de servicios publicos. 1 es el mas bajo, 6 el mas alto." />
              </label>
              <select
                id="estrato"
                value={formData.estrato}
                onChange={(e) => handleChange('estrato', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                className={inputClasses(!!errors.estrato)}
              >
                <option value="">Seleccionar estrato...</option>
                {ESTRATO_OPTIONS.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.estrato && <p className="mt-1 text-xs text-red-600">{errors.estrato}</p>}
            </div>

            {/* Área */}
            <div>
              <label htmlFor="area_m2" className="block text-sm font-medium text-gray-700 mb-1">
                Área (m²)
              </label>
              <input
                type="number"
                id="area_m2"
                value={formData.area_m2}
                onChange={(e) => handleChange('area_m2', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                min="0"
                max="99999"
                step="0.01"
                placeholder="Ej: 85"
                className={inputClasses(!!errors.area_m2)}
              />
              {errors.area_m2 && <p className="mt-1 text-xs text-red-600">{errors.area_m2}</p>}
            </div>
          </div>
        </div>

        {/* Identificación + Ubicación */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Identificación y ubicación</h3>

          {/* Código de propiedad — campo destacado, obligatorio. Cada
              inmobiliaria/propietario define su sistema (APT-001, etc).
              Es único por propietario. */}
          <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <label htmlFor="codigo" className="block text-sm font-semibold text-primary-900 mb-1.5">
              Código de la propiedad *
            </label>
            <input
              type="text"
              id="codigo"
              value={formData.codigo}
              onChange={(e) => handleChange('codigo', e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: APT-001, CASA-SAB, OF-302"
              maxLength={30}
              className={`w-full px-3 py-2 text-base font-mono font-semibold bg-white border rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary-500 ${
                errors.codigo ? 'border-red-400' : 'border-primary-300'
              }`}
            />
            {errors.codigo ? (
              <p className="mt-1.5 text-xs text-red-600">{errors.codigo}</p>
            ) : (
              <p className="mt-1.5 text-xs text-primary-700">
                Identificador interno que usas para tus reportes. Letras, números, guiones, máx 30 caracteres.
                Debe ser único dentro de tus inmuebles.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dirección */}
            <div className="md:col-span-2">
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <input
                type="text"
                id="direccion"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Calle 100 #15-50 Apto 501"
                className={inputClasses(!!errors.direccion)}
              />
              {errors.direccion && <p className="mt-1 text-xs text-red-600">{errors.direccion}</p>}
            </div>

            {/* Departamento */}
            <div>
              <label htmlFor="departamento" className="block text-sm font-medium text-gray-700 mb-1">
                Departamento *
              </label>
              <select
                id="departamento"
                value={formData.departamento}
                onChange={(e) => handleChange('departamento', e.target.value)}
                disabled={isSubmitting}
                className={inputClasses(!!errors.departamento)}
              >
                <option value="">Seleccionar departamento...</option>
                {DEPARTAMENTOS.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
              {errors.departamento && (
                <p className="mt-1 text-xs text-red-600">{errors.departamento}</p>
              )}
            </div>

            {/* Ciudad */}
            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad *
              </label>
              <input
                type="text"
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => handleChange('ciudad', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Bogotá"
                className={inputClasses(!!errors.ciudad)}
              />
              {errors.ciudad && <p className="mt-1 text-xs text-red-600">{errors.ciudad}</p>}
            </div>

            {/* Barrio */}
            <div>
              <label htmlFor="barrio" className="block text-sm font-medium text-gray-700 mb-1">
                Barrio
              </label>
              <input
                type="text"
                id="barrio"
                value={formData.barrio}
                onChange={(e) => handleChange('barrio', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Chapinero"
                className={inputClasses(false)}
              />
            </div>

            {/* Piso */}
            <div>
              <label htmlFor="piso" className="block text-sm font-medium text-gray-700 mb-1">
                Piso / Interior
              </label>
              <input
                type="text"
                id="piso"
                value={formData.piso}
                onChange={(e) => handleChange('piso', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Piso 5, Apto 501"
                className={inputClasses(false)}
              />
            </div>

          </div>
        </div>

        {/* Características */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Características</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Habitaciones */}
            <div>
              <label htmlFor="habitaciones" className="block text-sm font-medium text-gray-700 mb-1">
                Habitaciones
              </label>
              <input
                type="number"
                id="habitaciones"
                value={formData.habitaciones}
                onChange={(e) => handleChange('habitaciones', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                min="0"
                max="99"
                placeholder="0"
                className={inputClasses(!!errors.habitaciones)}
              />
              {errors.habitaciones && <p className="mt-1 text-xs text-red-600">{errors.habitaciones}</p>}
            </div>

            {/* Baños */}
            <div>
              <label htmlFor="banos" className="block text-sm font-medium text-gray-700 mb-1">
                Baños
              </label>
              <input
                type="number"
                id="banos"
                value={formData.banos}
                onChange={(e) => handleChange('banos', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                min="0"
                max="99"
                placeholder="0"
                className={inputClasses(!!errors.banos)}
              />
              {errors.banos && <p className="mt-1 text-xs text-red-600">{errors.banos}</p>}
            </div>

            {/* Parqueadero checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="parqueadero"
                checked={formData.parqueadero}
                onChange={(e) => handleChange('parqueadero', e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="parqueadero" className="ml-2 text-sm text-gray-700">
                Tiene parqueadero
              </label>
            </div>

            {/* Parqueaderos cantidad */}
            {formData.parqueadero && (
              <div>
                <label htmlFor="parqueaderos" className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  id="parqueaderos"
                  value={formData.parqueaderos}
                  onChange={(e) => handleChange('parqueaderos', e.target.value ? Number(e.target.value) : '')}
                  disabled={isSubmitting}
                  min="1"
                  max="99"
                  placeholder="1"
                  className={inputClasses(!!errors.parqueaderos)}
                />
                {errors.parqueaderos && <p className="mt-1 text-xs text-red-600">{errors.parqueaderos}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Valores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Valor arriendo */}
            <CurrencyInput
              label="Valor Arriendo (COP) *"
              tooltip="Monto mensual que el arrendatario paga por vivir en el inmueble."
              id="valor_arriendo"
              value={formData.valor_arriendo}
              onChange={(val) => handleChange('valor_arriendo', val)}
              disabled={isSubmitting}
              placeholder="Ej: 2.500.000"
              error={errors.valor_arriendo}
              max={999999999}
            />

            {/* Administración */}
            <CurrencyInput
              label="Administracion (COP)"
              tooltip="Cuota mensual de administracion del conjunto o edificio. Dejalo en 0 si no aplica."
              id="administracion"
              value={formData.administracion}
              onChange={(val) => handleChange('administracion', val)}
              disabled={isSubmitting}
              placeholder="Ej: 350.000"
              error={errors.administracion}
              max={999999999}
            />

            {/* Valor comercial */}
            <CurrencyInput
              label="Valor Comercial (COP)"
              tooltip="Precio estimado de venta del inmueble en el mercado. Es referencial, no obligatorio."
              id="valor_comercial"
              value={formData.valor_comercial}
              onChange={(val) => handleChange('valor_comercial', val)}
              disabled={isSubmitting}
              placeholder="Ej: 450.000.000"
              error={errors.valor_comercial}
              max={99999999999}
            />
          </div>
        </div>

        {/* Propietario — auto-asigna para propietario e inmobiliaria */}
        {isAutoAssignOwner ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
              {authUser?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">
                {isPropietarioUser ? 'Propietario: Tu cuenta' : 'Administrado por: Tu inmobiliaria'}
              </p>
              <p className="text-xs text-green-600">
                {isPropietarioUser
                  ? 'El inmueble se registrará a tu nombre automáticamente'
                  : 'El inmueble quedará vinculado a tu inmobiliaria'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Propietario *</h3>
            <PropietarioSelector
              value={formData.propietario_id}
              onChange={handlePropietarioChange}
              disabled={isSubmitting}
              error={errors.propietario_id}
              initialPropietario={initialPropietario}
            />
          </div>
        )}

        {/* Descripción y notas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h3>

          <div className="space-y-6">
            {/* Descripción pública */}
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción para Vitrina
              </label>
              <textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Descripción del inmueble visible en la vitrina pública..."
                className={inputClasses(false)}
              />
            </div>

            {/* Notas internas */}
            <div>
              <label htmlFor="notas_internas" className="block text-sm font-medium text-gray-700 mb-1">
                Notas Internas
                <FieldTooltip text="Notas privadas visibles solo para administradores. No se muestran al arrendatario ni en la vitrina publica." />
              </label>
              <textarea
                id="notas_internas"
                value={formData.notas_internas}
                onChange={(e) => handleChange('notas_internas', e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Notas internas (solo visibles para el equipo)..."
                className={inputClasses(false)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Estas notas no serán visibles en la vitrina pública
              </p>
            </div>

            {/* Visible en vitrina */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="visible_vitrina"
                checked={formData.visible_vitrina}
                onChange={(e) => handleChange('visible_vitrina', e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="visible_vitrina" className="ml-2 text-sm text-gray-700">
                Visible en vitrina pública
              </label>
            </div>
          </div>
        </div>

        {/* ============================================
            Datos para contrato
            Lo que aparece en las cláusulas PRIMERA y SEGUNDA del contrato
            de arrendamiento generado para este inmueble.
            ============================================ */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Datos para contrato</h2>
          <p className="text-xs text-gray-500 mb-4">
            Estos datos aparecen en el contrato de arrendamiento generado para este inmueble.
          </p>
          <div className="space-y-5">
            {/* Propiedad horizontal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Inmueble en propiedad horizontal?
              </label>
              <div className="flex gap-4">
                {(['auto', 'si', 'no'] as const).map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="propiedad_horizontal"
                      value={opt}
                      checked={formData.propiedad_horizontal === opt}
                      onChange={() => handleChange('propiedad_horizontal', opt)}
                      disabled={isSubmitting}
                      className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      {opt === 'auto' ? 'Auto-detectar' : opt === 'si' ? 'Sí' : 'No'}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Auto-detectar: se infiere por el valor de administración (si paga, asume que sí).
              </p>
            </div>

            {/* Cuarto útil */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cuarto_util"
                checked={formData.cuarto_util}
                onChange={(e) => handleChange('cuarto_util', e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="cuarto_util" className="ml-2 text-sm text-gray-700">
                El inmueble incluye <strong>cuarto útil</strong>
              </label>
            </div>

            {/* Ubicación detallada */}
            <div>
              <label htmlFor="ubicacion_detallada" className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación detallada (opcional)
                <FieldTooltip text="Texto que aparece en la cláusula SEGUNDA del contrato. Si lo dejas vacío, se construye automáticamente con dirección + barrio + ciudad + departamento." />
              </label>
              <textarea
                id="ubicacion_detallada"
                value={formData.ubicacion_detallada}
                onChange={(e) => handleChange('ubicacion_detallada', e.target.value)}
                disabled={isSubmitting}
                rows={2}
                placeholder={
                  [formData.direccion, formData.barrio, formData.ciudad, formData.departamento]
                    .filter(Boolean)
                    .join(', ') || 'Ej. Carrera 50 #20-30, barrio La Estrella, Caldas, Antioquia'
                }
                className={inputClasses(false)}
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link
            href="/inmuebles"
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting && <IconLoader size={16} className="animate-spin" />}
            {mode === 'create' ? 'Crear Inmueble' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
