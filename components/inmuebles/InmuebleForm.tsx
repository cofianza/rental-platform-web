/**
 * Formulario de Inmueble - HP-174
 * Componente para crear/editar inmuebles
 */

'use client'

import { scrollToFirstError } from '@/components/auth/registro-ui'
import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconLoader, IconChevronRight, IconHome, IconX, IconImages } from '@/components/icons'
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
import { FOTO_LIMITS } from '@/types/inmueble'
// No importamos IUserProfile ya que solo usamos el ID del propietario
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

// ── Sección y campo ─────────────────────────────────────────

function Seccion({ n, titulo, descripcion, opcional, children }: {
  n: number
  titulo: string
  descripcion?: string
  opcional?: boolean
  children: ReactNode
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <header className="flex items-start gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
        <span className="shrink-0 w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold flex items-center justify-center">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 flex flex-wrap items-center gap-2">
            {titulo}
            {opcional && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Opcional</span>}
          </h3>
          {descripcion && <p className="text-sm text-gray-500 mt-0.5">{descripcion}</p>}
        </div>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

/** Etiqueta + control + error o ayuda. La ayuda queda visible: el «?» con hover no se veía en el celular. */
function Campo({ id, label, requerido, ayuda, error, className, children }: {
  id: string
  label: ReactNode
  requerido?: boolean
  ayuda?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {requerido && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : ayuda ? (
        <p className="mt-1 text-xs text-gray-500">{ayuda}</p>
      ) : null}
    </div>
  )
}

// ── COP Currency Input ──────────────────────────────────────

function formatCOPDisplay(value: number | ''): string {
  if (value === '' || value === 0) return ''
  return new Intl.NumberFormat('es-CO').format(Number(value))
}

function CurrencyInput({ label, id, value, onChange, disabled, placeholder, error, max, ayuda, requerido }: {
  label: string
  id: string
  value: number | ''
  onChange: (val: number | '') => void
  disabled?: boolean
  placeholder?: string
  error?: string
  max?: number
  ayuda?: string
  requerido?: boolean
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
    <Campo id={id} label={label} requerido={requerido} ayuda={ayuda} error={error}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
        <input
          type="text"
          inputMode="numeric"
          id={id}
          value={display}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
      </div>
    </Campo>
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
  /** Ruta interna a la que se vuelve al guardar o cancelar (p. ej. el asistente de contratos). */
  returnTo?: string
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
  matricula_inmobiliaria: string
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
  matricula_inmobiliaria: '',
}

// Etiquetas para el aviso de 'falta X' (antes: 'completa todos los campos requeridos' sin decir cual).
const FIELD_LABELS: Record<string, string> = {
  codigo: 'código', direccion: 'dirección', ciudad: 'ciudad', departamento: 'departamento', tipo: 'tipo de inmueble',
  estrato: 'estrato', valor_arriendo: 'valor del arriendo', propietario_id: 'propietario', foto_fachada_url: 'foto de fachada',
  area_m2: 'área', habitaciones: 'habitaciones', banos: 'baños', parqueaderos: 'parqueaderos', administracion: 'administración',
}

// Prefijo del código autogenerado. El propietario particular no tiene un sistema
// de códigos como una inmobiliaria: le inventábamos la tarea de crear uno.
const PREFIJO_TIPO: Record<string, string> = {
  apartamento: 'APT',
  apartaestudio: 'AES',
  casa: 'CASA',
  casa_finca: 'CFIN',
  finca: 'FIN',
  oficina: 'OF',
  local: 'LOC',
  bodega: 'BOD',
  lote: 'LOT',
  parqueadero: 'PARQ',
}

/**
 * Pliega en un `<details>` los campos que solo le importan a una inmobiliaria
 * (código interno, datos de cláusulas). Para el propietario particular publicar
 * desde el celular no debería exigir 25 campos; para los demás roles no cambia
 * nada: se renderiza el contenido tal cual.
 */
function Avanzado({ plegar, children }: { plegar: boolean; children: ReactNode }) {
  if (!plegar) return <>{children}</>
  return (
    <details className="group">
      <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-700">
        <IconChevronRight size={14} className="transition-transform group-open:rotate-90" />
        Opciones avanzadas
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

export function InmuebleForm({ mode, inmueble, returnTo }: InmuebleFormProps) {
  const router = useRouter()
  const authUser = useAuthStore((s) => s.user)
  const isPropietarioUser = authUser?.rol === 'propietario'
  const isInmobiliariaUser = authUser?.rol === 'inmobiliaria'
  const isAutoAssignOwner = isPropietarioUser || isInmobiliariaUser
  // El propietario vuelve a /dashboard: /inmuebles no está en su navegación.
  const rutaListado = isPropietarioUser ? '/dashboard' : '/inmuebles'
  const esPropietarioNuevo = isPropietarioUser && mode === 'create'
  const [codigoTocado, setCodigoTocado] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialPropietario, setInitialPropietario] = useState<{
    id: string
    nombre: string
    apellido: string
  } | null>(null)
  const [fotosAdicionales, setFotosAdicionales] = useState<{ file: File; preview: string }[]>([])

  // Auto-asignar propietario_id si el usuario es propietario o inmobiliaria
  useEffect(() => {
    if (isAutoAssignOwner && authUser && mode === 'create') {
      setFormData((prev) => ({ ...prev, propietario_id: authUser.id }))
    }
  }, [isAutoAssignOwner, authUser, mode])

  // Código sugerido para el propietario particular: no tiene un sistema de
  // códigos propio, así que lo generamos a partir del tipo. Si lo edita a mano
  // (codigoTocado) dejamos de pisárselo.
  useEffect(() => {
    if (!esPropietarioNuevo || codigoTocado) return
    const prefijo = PREFIJO_TIPO[formData.tipo] ?? 'INM'
    setFormData((prev) => ({
      ...prev,
      codigo: `${prefijo}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    }))
  }, [esPropietarioNuevo, codigoTocado, formData.tipo])

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
        // 'local_comercial' (legacy) se consolida en 'comercial' (Comercio) para
        // que el select lo muestre correctamente con las nuevas opciones.
        uso: inmueble.uso === 'local_comercial' ? 'comercial' : inmueble.uso,
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
        matricula_inmobiliaria: inmueble.matricula_inmobiliaria || '',
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

  const validateForm = (): string[] => {
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
      newErrors.area_m2 = 'El área no puede superar 99.999 m²'
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
      newErrors.habitaciones = 'Máximo 99 habitaciones'
    }
    if (formData.banos && Number(formData.banos) > 99) {
      newErrors.banos = 'Máximo 99 baños'
    }
    if (formData.parqueaderos && Number(formData.parqueaderos) > 99) {
      newErrors.parqueaderos = 'Máximo 99 parqueaderos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const faltan = validateForm()
    if (faltan.length > 0) {
      const etiquetas = faltan.map((k) => FIELD_LABELS[k] ?? k)
      toast.error(`Revise: ${etiquetas.slice(0, 4).join(', ')}${etiquetas.length > 4 ? ` y ${etiquetas.length - 4} más` : ''}`)
      scrollToFirstError(formRef.current)
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
          matricula_inmobiliaria: formData.matricula_inmobiliaria.trim() || null,
        }

        const newInmueble = await inmuebleService.createInmueble(createData)

        // Upload fotos adicionales si hay
        if (fotosAdicionales.length > 0 && newInmueble?.id) {
          let uploaded = 0
          let fallidas = 0
          for (const foto of fotosAdicionales) {
            try {
              await inmuebleService.uploadFoto(newInmueble.id, foto.file, {
                orden: uploaded + 1,
              })
              uploaded++
            } catch {
              // Continuar con las demás fotos si una falla; se avisa al final
              fallidas++
            }
          }
          if (uploaded > 0) {
            toast.success(`${uploaded} foto${uploaded > 1 ? 's' : ''} adicional${uploaded > 1 ? 'es' : ''} subida${uploaded > 1 ? 's' : ''}`)
          }
          if (fallidas > 0) {
            toast.warning(
              `No se ${fallidas > 1 ? 'subieron' : 'subió'} ${fallidas} foto${fallidas > 1 ? 's' : ''}; agréguela${fallidas > 1 ? 's' : ''} desde la pestaña Galería del inmueble`,
            )
          }
        }

        // "Y ahora qué": el toast dice si quedó publicado y qué puede hacer
        // desde la tarjeta, porque el listado no lo explica.
        toast.success(INMUEBLE_MESSAGES.CREATE_SUCCESS, {
          description: formData.visible_vitrina
            ? 'Ya está publicado en la vitrina de Cofianza. Desde la tarjeta puede pausarlo o evaluar un candidato.'
            : 'No está en la vitrina: actívelo desde la tarjeta cuando desee publicarlo.',
        })
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
          // Siempre un número: con undefined el 0 («Déjalo en 0 si no aplica») o
          // el campo vacío no se guardaban y quedaba el valor anterior.
          administracion: Number(formData.administracion || 0),
          area_m2: formData.area_m2 ? Number(formData.area_m2) : null,
          habitaciones: Number(formData.habitaciones || 0),
          banos: Number(formData.banos || 0),
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
          matricula_inmobiliaria: formData.matricula_inmobiliaria.trim() || null,
        }

        // En edición las fotos se gestionan en GaleriaSection, no aquí.
        await inmuebleService.updateInmueble(inmueble.id, updateData)

        toast.success(INMUEBLE_MESSAGES.UPDATE_SUCCESS)
      }

      router.push(returnTo ?? rutaListado)
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
        const msg = apiError?.message || apiError?.response?.data?.message || 'Ese código ya está en uso en otro de sus inmuebles.'
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

  const title = mode === 'create' ? 'Nuevo inmueble' : 'Editar inmueble'
  const subtitle =
    mode === 'create'
      ? 'Complete los datos del inmueble. Los marcados con * son obligatorios.'
      : `Editando el inmueble ${inmueble?.codigo || ''}`

  // Las secciones se numeran según lo que ve cada rol.
  let numero = 0
  const sig = () => ++numero

  const campoCodigo = (
    <Campo
      id="codigo"
      label="Código de la propiedad"
      requerido
      error={errors.codigo}
      ayuda={
        isPropietarioUser
          ? 'Lo generamos por usted; cámbielo si desea. Debe ser único dentro de sus inmuebles.'
          : 'Identificador interno para sus reportes: letras, números y guiones, máximo 30. Único dentro de sus inmuebles.'
      }
    >
      <input
        type="text"
        id="codigo"
        value={formData.codigo}
        onChange={(e) => {
          // Al escribirlo a mano dejamos de sugerirlo automáticamente.
          setCodigoTocado(true)
          handleChange('codigo', e.target.value)
        }}
        disabled={isSubmitting}
        placeholder="Ej: APT-001, CASA-SAB, OF-302"
        maxLength={30}
        aria-invalid={!!errors.codigo}
        className={cn(inputClasses(!!errors.codigo), 'font-mono font-semibold')}
      />
    </Campo>
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        {/* "Inicio" es el dashboard, no la landing pública. */}
        <Link href="/dashboard" className="hover:text-primary-600 flex items-center gap-1">
          <IconHome size={16} />
          Inicio
        </Link>
        <IconChevronRight size={14} />
        <Link href={rutaListado} className="hover:text-primary-600">
          {isPropietarioUser ? 'Mis inmuebles' : 'Inmuebles'}
        </Link>
        <IconChevronRight size={14} />
        <span className="text-gray-900 font-medium">
          {mode === 'create' ? 'Nuevo' : 'Editar'}
        </span>
      </nav>

      {/* Header */}
      <PageHeader title={title} subtitle={subtitle} />

      {/* A nombre de quién queda: contexto, no un campo a llenar. */}
      {isAutoAssignOwner && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
            {authUser?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <p className="text-sm text-primary-900">
            {isPropietarioUser
              ? 'El inmueble quedará a su nombre.'
              : 'El inmueble quedará vinculado a su inmobiliaria.'}
          </p>
        </div>
      )}

      {/* Formulario */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Datos generales */}
        <Seccion n={sig()} titulo="Datos generales">
          <div className={cn('grid grid-cols-1 gap-5', isPropietarioUser ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
            {!isPropietarioUser && campoCodigo}

            <Campo id="tipo" label="Tipo de inmueble" requerido error={errors.tipo}>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!errors.tipo}
                className={inputClasses(!!errors.tipo)}
              >
                <option value="">Seleccionar tipo...</option>
                {TIPO_OPTIONS.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id="uso" label="Uso" ayuda="Vivienda: para habitar. Comercial: oficinas, locales o negocios.">
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
            </Campo>

            <Campo
              id="estrato"
              label="Estrato"
              requerido
              error={errors.estrato}
              ayuda="El que aparece en el recibo de servicios públicos."
            >
              <select
                id="estrato"
                value={formData.estrato}
                onChange={(e) => handleChange('estrato', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                aria-invalid={!!errors.estrato}
                className={inputClasses(!!errors.estrato)}
              >
                <option value="">Seleccionar estrato...</option>
                {ESTRATO_OPTIONS.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {/* El propietario particular no tiene un sistema de códigos: lo generamos y se pliega. */}
          {isPropietarioUser && (
            <div className="mt-5">
              <Avanzado plegar>{campoCodigo}</Avanzado>
            </div>
          )}
        </Seccion>

        {/* 2. Ubicación */}
        <Seccion n={sig()} titulo="Ubicación">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Campo id="direccion" label="Dirección" requerido error={errors.direccion} className="md:col-span-2">
              <input
                type="text"
                id="direccion"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Calle 100 #15-50 Apto 501"
                aria-invalid={!!errors.direccion}
                className={inputClasses(!!errors.direccion)}
              />
            </Campo>

            <Campo id="departamento" label="Departamento" requerido error={errors.departamento}>
              <select
                id="departamento"
                value={formData.departamento}
                onChange={(e) => handleChange('departamento', e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!errors.departamento}
                className={inputClasses(!!errors.departamento)}
              >
                <option value="">Seleccionar departamento...</option>
                {DEPARTAMENTOS.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id="ciudad" label="Ciudad" requerido error={errors.ciudad}>
              <input
                type="text"
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => handleChange('ciudad', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Bogotá"
                aria-invalid={!!errors.ciudad}
                className={inputClasses(!!errors.ciudad)}
              />
            </Campo>

            <Campo id="barrio" label="Barrio">
              <input
                type="text"
                id="barrio"
                value={formData.barrio}
                onChange={(e) => handleChange('barrio', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Chapinero"
                className={inputClasses(false)}
              />
            </Campo>

            <Campo id="piso" label="Piso / interior">
              <input
                type="text"
                id="piso"
                value={formData.piso}
                onChange={(e) => handleChange('piso', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Piso 5, Apto 501"
                className={inputClasses(false)}
              />
            </Campo>
          </div>
        </Seccion>

        {/* 3. Características */}
        <Seccion n={sig()} titulo="Características">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Campo id="area_m2" label="Área (m²)" error={errors.area_m2}>
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
                aria-invalid={!!errors.area_m2}
                className={inputClasses(!!errors.area_m2)}
              />
            </Campo>

            <Campo id="habitaciones" label="Habitaciones" error={errors.habitaciones}>
              <input
                type="number"
                id="habitaciones"
                value={formData.habitaciones}
                onChange={(e) => handleChange('habitaciones', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                min="0"
                max="99"
                placeholder="0"
                aria-invalid={!!errors.habitaciones}
                className={inputClasses(!!errors.habitaciones)}
              />
            </Campo>

            <Campo id="banos" label="Baños" error={errors.banos}>
              <input
                type="number"
                id="banos"
                value={formData.banos}
                onChange={(e) => handleChange('banos', e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                min="0"
                max="99"
                placeholder="0"
                aria-invalid={!!errors.banos}
                className={inputClasses(!!errors.banos)}
              />
            </Campo>

            {/* Parqueadero: la casilla y la cantidad comparten celda para no correr la grilla. */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Parqueadero</span>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="parqueadero"
                  className="flex items-center gap-2 h-[38px] px-3 border border-gray-300 rounded-lg cursor-pointer text-sm text-gray-700 has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50"
                >
                  <input
                    type="checkbox"
                    id="parqueadero"
                    checked={formData.parqueadero}
                    onChange={(e) => handleChange('parqueadero', e.target.checked)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  Tiene
                </label>
                {formData.parqueadero && (
                  <input
                    type="number"
                    id="parqueaderos"
                    aria-label="Cantidad de parqueaderos"
                    value={formData.parqueaderos}
                    onChange={(e) => handleChange('parqueaderos', e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                    min="1"
                    max="99"
                    placeholder="Cant."
                    aria-invalid={!!errors.parqueaderos}
                    className={cn(inputClasses(!!errors.parqueaderos), 'w-20')}
                  />
                )}
              </div>
              {errors.parqueaderos && <p className="mt-1 text-xs text-red-600">{errors.parqueaderos}</p>}
            </div>
          </div>
        </Seccion>

        {/* 4. Valores */}
        <Seccion n={sig()} titulo="Valores">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <CurrencyInput
              label="Valor del arriendo (COP)"
              requerido
              ayuda="Canon mensual que paga el arrendatario."
              id="valor_arriendo"
              value={formData.valor_arriendo}
              onChange={(val) => handleChange('valor_arriendo', val)}
              disabled={isSubmitting}
              placeholder="Ej: 2.500.000"
              error={errors.valor_arriendo}
              max={999999999}
            />

            <CurrencyInput
              label="Administración (COP)"
              ayuda="Cuota mensual del conjunto o edificio. Déjela vacía si no aplica."
              id="administracion"
              value={formData.administracion}
              onChange={(val) => handleChange('administracion', val)}
              disabled={isSubmitting}
              placeholder="Ej: 350.000"
              error={errors.administracion}
              max={999999999}
            />

            {/* Valor comercial — dato referencial de inmobiliaria; al
                propietario particular no le pedimos el precio de venta. */}
            {!isPropietarioUser && (
              <CurrencyInput
                label="Valor comercial (COP)"
                ayuda="Precio estimado de venta. Es solo referencial."
                id="valor_comercial"
                value={formData.valor_comercial}
                onChange={(val) => handleChange('valor_comercial', val)}
                disabled={isSubmitting}
                placeholder="Ej: 450.000.000"
                error={errors.valor_comercial}
                max={99999999999}
              />
            )}
          </div>
        </Seccion>

        {/* 5. Fotos y vitrina — galería completa en edición, uploader simple en creación */}
        <Seccion
          n={sig()}
          titulo="Fotos y vitrina"
          descripcion="Lo que ven los interesados en la vitrina de Cofianza."
        >
          <div className="space-y-6">
            {mode === 'edit' && inmueble?.id ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Suba, reordene, marque la foto de fachada y agregue descripciones a cada imagen.
                </p>
                <GaleriaSection inmuebleId={inmueble.id} canEdit={true} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Foto de fachada<span className="text-red-500"> *</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-2">Es la portada del inmueble en la vitrina.</p>
                  <ImageUploader
                    value={formData.foto_fachada_url}
                    onChange={(url) => handleChange('foto_fachada_url', url)}
                    inmuebleId={inmueble?.id}
                    disabled={isSubmitting}
                    error={errors.foto_fachada_url}
                  />
                </div>

                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Fotos del interior
                    <span className="text-xs font-normal text-gray-500">({fotosAdicionales.length}/10, opcional)</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Podrá reordenarlas y describirlas después, desde la galería del inmueble.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {fotosAdicionales.map((foto, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={foto.preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Quitar foto ${idx + 1}`}
                          onClick={() => {
                            URL.revokeObjectURL(foto.preview)
                            setFotosAdicionales((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="absolute top-1 right-1 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ))}

                    {fotosAdicionales.length < 10 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors focus-within:ring-2 focus-within:ring-primary-500">
                        <IconImages size={22} className="text-gray-500 mb-1" />
                        <span className="text-xs text-gray-600">Agregar fotos</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          disabled={isSubmitting}
                          onChange={(e) => {
                            // Se descartan aquí las que uploadFoto rechazaría, para
                            // que no queden en la vista previa y se pierdan al guardar.
                            const allowedTypes: readonly string[] = FOTO_LIMITS.ALLOWED_TYPES
                            const files = Array.from(e.target.files || []).filter((file) => {
                              const ok = allowedTypes.includes(file.type) && file.size <= FOTO_LIMITS.MAX_FILE_SIZE
                              if (!ok) toast.error(`${file.name}: supera 5 MB o no es JPG, PNG o WebP`)
                              return ok
                            })
                            const remaining = 10 - fotosAdicionales.length
                            const toAdd = files.slice(0, remaining)
                            if (files.length > remaining) toast.warning('Máximo 10 fotos del interior; las demás no se agregaron')
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
                </div>
              </div>
            )}

            <Campo
              id="descripcion"
              label="Descripción para la vitrina"
              ayuda="Lo que destacaría a un interesado: iluminación, vista, cercanías, zonas comunes."
            >
              <textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                disabled={isSubmitting}
                rows={4}
                placeholder="Ej: Apartamento iluminado, con balcón y vista a los cerros, a dos cuadras del parque."
                className={inputClasses(false)}
              />
            </Campo>

            {/* Publicar: es una decisión, no un detalle de la descripción. */}
            <label
              htmlFor="visible_vitrina"
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer has-[:checked]:border-primary-300 has-[:checked]:bg-primary-50/60"
            >
              <input
                type="checkbox"
                id="visible_vitrina"
                checked={formData.visible_vitrina}
                onChange={(e) => handleChange('visible_vitrina', e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Publicar en la vitrina de Cofianza</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Los interesados podrán verlo y pedir una visita. Puede pausarlo cuando quiera.
                </span>
              </span>
            </label>
          </div>
        </Seccion>

        {/* 6. Solo para el equipo: propietario (admin/operador) y notas internas.
            El propietario particular no tiene equipo a quien dejarle notas. */}
        {(!isAutoAssignOwner || !isPropietarioUser) && (
          <Seccion
            n={sig()}
            titulo={isAutoAssignOwner ? 'Notas internas' : 'Propietario y notas internas'}
            opcional={isAutoAssignOwner}
          >
            <div className="space-y-5">
              {!isAutoAssignOwner && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Propietario<span className="text-red-500"> *</span>
                  </p>
                  <PropietarioSelector
                    value={formData.propietario_id}
                    onChange={handlePropietarioChange}
                    disabled={isSubmitting}
                    error={errors.propietario_id}
                    initialPropietario={initialPropietario}
                  />
                </div>
              )}

              <Campo
                id="notas_internas"
                label={isAutoAssignOwner ? <span className="sr-only">Notas internas</span> : 'Notas internas'}
                ayuda="Solo las ve su equipo. No aparecen en la vitrina ni se le muestran al arrendatario."
              >
                <textarea
                  id="notas_internas"
                  value={formData.notas_internas}
                  onChange={(e) => handleChange('notas_internas', e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Ej: Llaves en portería; el propietario prefiere visitas en la tarde."
                  className={inputClasses(false)}
                />
              </Campo>
            </div>
          </Seccion>
        )}

        {/* Datos para contrato: lo que aparece en las cláusulas PRIMERA y SEGUNDA
            del contrato generado. Para el propietario particular es jerga de
            cláusulas: se pliega y, si no lo toca, lo deducimos igual. */}
        <Seccion
          n={sig()}
          titulo="Datos para contrato"
          descripcion="Aparecen en el contrato de arrendamiento de este inmueble."
          opcional
        >
          <Avanzado plegar={isPropietarioUser}>
            <div className="space-y-5">
              <div>
                <p id="inmueble-form-esta-en-un-conjunto-o-edificio-con-admin" className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Está en un conjunto o edificio con administración?
                </p>
                <div role="group" aria-labelledby="inmueble-form-esta-en-un-conjunto-o-edificio-con-admin" className="flex flex-wrap gap-x-4 gap-y-2">
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
                        {opt === 'auto' ? 'Lo detectamos por la administración' : opt === 'si' ? 'Sí' : 'No'}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Si no lo sabe, lo deducimos: si el inmueble paga administración, asumimos que es propiedad horizontal.
                </p>
              </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Campo
                  id="matricula_inmobiliaria"
                  label="Matrícula inmobiliaria"
                  ayuda="Folio del certificado de tradición y libertad. Si lo deja vacío, el contrato no lo menciona."
                >
                  <input
                    type="text"
                    id="matricula_inmobiliaria"
                    value={formData.matricula_inmobiliaria}
                    onChange={(e) => handleChange('matricula_inmobiliaria', e.target.value)}
                    disabled={isSubmitting}
                    maxLength={40}
                    placeholder="Ej: 001-1234567"
                    className={inputClasses(false)}
                  />
                </Campo>

                <Campo
                  id="ubicacion_detallada"
                  label="Ubicación detallada"
                  ayuda="Cómo se describe la ubicación en el contrato. Si lo deja vacío, usamos dirección, barrio y ciudad."
                >
                  <textarea
                    id="ubicacion_detallada"
                    value={formData.ubicacion_detallada}
                    onChange={(e) => handleChange('ubicacion_detallada', e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={
                      [formData.direccion, formData.barrio, formData.ciudad, formData.departamento]
                        .filter(Boolean)
                        .join(', ') || 'Ej: Carrera 50 #20-30, barrio La Estrella, Caldas, Antioquia'
                    }
                    className={inputClasses(false)}
                  />
                </Campo>
              </div>
            </div>
          </Avanzado>
        </Seccion>

        {/* Botones: fijos abajo, el formulario es largo y el botón quedaba fuera de vista. */}
        <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.12)]">
          <p className="hidden sm:block text-xs text-gray-500">
            <span className="text-red-500">*</span> Obligatorio
          </p>
          <div className="flex gap-3 justify-end">
            <Link
              href={returnTo ?? rutaListado}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <IconLoader size={16} className="animate-spin" />}
              {mode === 'create' ? 'Crear inmueble' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
