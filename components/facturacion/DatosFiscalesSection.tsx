/**
 * DatosFiscalesSection - HP-354, HP-357
 * Formulario para crear/editar datos fiscales del usuario
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { facturacionService } from '@/services/facturacionService'
import { REGIMEN_TRIBUTARIO_LABELS } from '@/types/facturacion'
import type { IDatosFiscales, IDatosFiscalesInput, RegimenTributario } from '@/types/facturacion'
import {
  IconLoader,
  IconCheck,
  IconAlertTriangle,
  IconEdit,
} from '@/components/icons'

// ============================================
// Types
// ============================================

type PageState = 'loading' | 'empty' | 'view' | 'edit'

interface FormErrors {
  [key: string]: string
}

// ============================================
// Helper: Validar NIT colombiano
// ============================================

function validarNIT(nit: string): boolean {
  // Remover puntos, guiones y espacios
  const cleanNit = nit.replace(/[\.\-\s]/g, '')

  // Debe tener entre 9 y 10 digitos (sin DV) o incluir DV
  if (!/^\d{9,10}$/.test(cleanNit)) {
    // Verificar formato con DV (ej: 900123456-7)
    const withDV = nit.replace(/[\.\s]/g, '')
    if (!/^\d{9}-\d$/.test(withDV)) {
      return false
    }
  }

  return true
}

function formatNIT(value: string): string {
  // Remover todo excepto numeros y guion
  const clean = value.replace(/[^\d-]/g, '')

  // Si tiene guion, es formato con DV
  if (clean.includes('-')) {
    const parts = clean.split('-')
    const base = parts[0].replace(/\D/g, '').slice(0, 9)
    const dv = parts[1]?.replace(/\D/g, '').slice(0, 1) || ''

    // Formatear base con puntos
    let formatted = ''
    for (let i = 0; i < base.length; i++) {
      if (i > 0 && (base.length - i) % 3 === 0) {
        formatted += '.'
      }
      formatted += base[i]
    }

    return dv ? `${formatted}-${dv}` : formatted
  }

  // Sin guion, solo formatear numeros
  const nums = clean.replace(/\D/g, '').slice(0, 10)
  let formatted = ''
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && (nums.length - i) % 3 === 0 && i < nums.length - 1) {
      formatted += '.'
    }
    formatted += nums[i]
  }

  return formatted
}

// ============================================
// Component
// ============================================

export function DatosFiscalesSection() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [datosFiscales, setDatosFiscales] = useState<IDatosFiscales | null>(null)
  const [formData, setFormData] = useState<IDatosFiscalesInput>({
    tipo_documento: 'NIT',
    numero_documento: '',
    razon_social: '',
    regimen_tributario: 'comun',
    direccion_fiscal: '',
    ciudad: '',
    departamento: '',
    email_fiscal: '',
    telefono_fiscal: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  // Cargar datos fiscales
  const fetchDatosFiscales = useCallback(async () => {
    setPageState('loading')
    try {
      const data = await facturacionService.getDatosFiscales()
      if (data) {
        setDatosFiscales(data)
        setFormData({
          tipo_documento: data.tipo_documento,
          numero_documento: data.numero_documento,
          razon_social: data.razon_social,
          regimen_tributario: data.regimen_tributario,
          direccion_fiscal: data.direccion_fiscal,
          ciudad: data.ciudad,
          departamento: data.departamento,
          email_fiscal: data.email_fiscal,
          telefono_fiscal: data.telefono_fiscal,
        })
        setPageState('view')
      } else {
        setPageState('empty')
      }
    } catch (err) {
      toast.error('Error al cargar datos fiscales')
      setPageState('empty')
    }
  }, [])

  useEffect(() => {
    fetchDatosFiscales()
  }, [fetchDatosFiscales])

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.numero_documento.trim()) {
      newErrors.numero_documento = 'El numero de documento es requerido'
    } else if (formData.tipo_documento === 'NIT' && !validarNIT(formData.numero_documento)) {
      newErrors.numero_documento = 'Formato de NIT invalido'
    }

    if (!formData.razon_social.trim()) {
      newErrors.razon_social = 'La razon social es requerida'
    }

    if (!formData.direccion_fiscal.trim()) {
      newErrors.direccion_fiscal = 'La direccion fiscal es requerida'
    }

    if (!formData.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es requerida'
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es requerido'
    }

    if (!formData.email_fiscal.trim()) {
      newErrors.email_fiscal = 'El email fiscal es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_fiscal)) {
      newErrors.email_fiscal = 'Email invalido'
    }

    if (!formData.telefono_fiscal.trim()) {
      newErrors.telefono_fiscal = 'El telefono fiscal es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Guardar datos fiscales
  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const saved = await facturacionService.saveDatosFiscales(formData)
      setDatosFiscales(saved)
      setPageState('view')
      toast.success('Datos fiscales guardados correctamente')
    } catch (err) {
      toast.error('Error al guardar datos fiscales')
    } finally {
      setSaving(false)
    }
  }

  // Manejar cambios en el formulario
  const handleChange = (field: keyof IDatosFiscalesInput, value: string) => {
    if (field === 'numero_documento' && formData.tipo_documento === 'NIT') {
      value = formatNIT(value)
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // ============================================
  // Render: Loading
  // ============================================
  if (pageState === 'loading') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      </div>
    )
  }

  // ============================================
  // Render: View Mode
  // ============================================
  if (pageState === 'view' && datosFiscales) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <IconCheck size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Datos Fiscales Completos</h3>
              <p className="text-sm text-gray-500">Tus datos fiscales estan configurados</p>
            </div>
          </div>
          <button
            onClick={() => setPageState('edit')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <IconEdit size={16} />
            Editar
          </button>
        </div>

        {/* Data Display */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de Documento</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.tipo_documento}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Numero de Documento</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.numero_documento}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Razon Social</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.razon_social}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Regimen Tributario</p>
            <p className="text-sm font-medium text-gray-900">
              {REGIMEN_TRIBUTARIO_LABELS[datosFiscales.regimen_tributario]}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Direccion Fiscal</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.direccion_fiscal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ciudad</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.ciudad}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Departamento</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.departamento}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email Fiscal</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.email_fiscal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Telefono Fiscal</p>
            <p className="text-sm font-medium text-gray-900">{datosFiscales.telefono_fiscal}</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // Render: Empty/Edit Mode (Form)
  // ============================================
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <IconAlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {pageState === 'empty' ? 'Configura tus Datos Fiscales' : 'Editar Datos Fiscales'}
            </h3>
            <p className="text-sm text-gray-500">
              {pageState === 'empty'
                ? 'Completa la informacion para poder generar facturas'
                : 'Actualiza tu informacion fiscal'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Documento *
            </label>
            <select
              value={formData.tipo_documento}
              onChange={(e) => handleChange('tipo_documento', e.target.value as 'NIT' | 'CC' | 'CE')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="NIT">NIT</option>
              <option value="CC">Cedula de Ciudadania</option>
              <option value="CE">Cedula de Extranjeria</option>
            </select>
          </div>

          {/* Numero de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero de Documento *
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={(e) => handleChange('numero_documento', e.target.value)}
              placeholder={formData.tipo_documento === 'NIT' ? '900.123.456-7' : '1.234.567.890'}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.numero_documento
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.numero_documento && (
              <p className="mt-1 text-xs text-red-600">{errors.numero_documento}</p>
            )}
          </div>

          {/* Razon Social */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razon Social / Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.razon_social}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              placeholder="Empresa S.A.S. o Nombre Apellido"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.razon_social
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.razon_social && (
              <p className="mt-1 text-xs text-red-600">{errors.razon_social}</p>
            )}
          </div>

          {/* Regimen Tributario */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regimen Tributario *
            </label>
            <select
              value={formData.regimen_tributario}
              onChange={(e) => handleChange('regimen_tributario', e.target.value as RegimenTributario)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              {Object.entries(REGIMEN_TRIBUTARIO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Direccion Fiscal */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Direccion Fiscal *
            </label>
            <input
              type="text"
              value={formData.direccion_fiscal}
              onChange={(e) => handleChange('direccion_fiscal', e.target.value)}
              placeholder="Calle 100 #15-20 Oficina 501"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.direccion_fiscal
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.direccion_fiscal && (
              <p className="mt-1 text-xs text-red-600">{errors.direccion_fiscal}</p>
            )}
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad *
            </label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => handleChange('ciudad', e.target.value)}
              placeholder="Bogota"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.ciudad
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.ciudad && <p className="mt-1 text-xs text-red-600">{errors.ciudad}</p>}
          </div>

          {/* Departamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento *
            </label>
            <input
              type="text"
              value={formData.departamento}
              onChange={(e) => handleChange('departamento', e.target.value)}
              placeholder="Cundinamarca"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.departamento
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.departamento && (
              <p className="mt-1 text-xs text-red-600">{errors.departamento}</p>
            )}
          </div>

          {/* Email Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Fiscal *
            </label>
            <input
              type="email"
              value={formData.email_fiscal}
              onChange={(e) => handleChange('email_fiscal', e.target.value)}
              placeholder="facturacion@empresa.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.email_fiscal
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.email_fiscal && (
              <p className="mt-1 text-xs text-red-600">{errors.email_fiscal}</p>
            )}
          </div>

          {/* Telefono Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono Fiscal *
            </label>
            <input
              type="tel"
              value={formData.telefono_fiscal}
              onChange={(e) => handleChange('telefono_fiscal', e.target.value)}
              placeholder="601 234 5678"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 ${
                errors.telefono_fiscal
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {errors.telefono_fiscal && (
              <p className="mt-1 text-xs text-red-600">{errors.telefono_fiscal}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          {pageState === 'edit' && (
            <button
              onClick={() => setPageState('view')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving && <IconLoader size={16} className="animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar Datos Fiscales'}
          </button>
        </div>
      </div>
    </div>
  )
}
