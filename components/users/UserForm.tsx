'use client'

/**
 * Formulario de Usuario - HP-117
 * Modal para crear/editar usuarios
 */

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { IconLoader } from '@/components/icons'
import { ROLE_OPTIONS } from './constants'
import type { IUserProfile, IUserFormData, UserRole, UserModalMode } from '@/types/user'

interface UserFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IUserFormData) => Promise<boolean>
  mode: UserModalMode
  user: IUserProfile | null
  isLoading?: boolean
  error?: string | null
}

interface FormErrors {
  email?: string
  nombre?: string
  apellido?: string
  rol?: string
}

export function UserForm({
  isOpen,
  onClose,
  onSubmit,
  mode,
  user,
  isLoading = false,
  error,
}: UserFormProps) {
  const [formData, setFormData] = useState<IUserFormData>({
    email: '',
    nombre: '',
    apellido: '',
    telefono: '',
    rol: 'operador_analista',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Cargar datos del usuario al editar
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        email: user.email,
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        telefono: user.telefono || '',
        rol: user.rol === 'sin_rol' ? 'operador_analista' : user.rol,
      })
    } else if (mode === 'create') {
      setFormData({
        email: '',
        nombre: '',
        apellido: '',
        telefono: '',
        rol: 'operador_analista',
      })
    }
    setErrors({})
  }, [mode, user])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }

    // Nombre validation
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    // Apellido validation
    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido'
    }

    // Rol validation
    if (!formData.rol) {
      newErrors.rol = 'El rol es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const success = await onSubmit(formData)
    if (success) {
      onClose()
    }
  }

  const handleChange = (field: keyof IUserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario escribe
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const title = mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'

  // Filtrar opciones de rol (excluir sin_rol)
  const roleOptionsFiltered = ROLE_OPTIONS.filter((opt) => opt.value && opt.value !== 'sin_rol')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error global */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={mode === 'edit' || isLoading}
            className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="usuario@ejemplo.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          {mode === 'edit' && (
            <p className="mt-1 text-xs text-gray-500">El email no puede ser modificado</p>
          )}
        </div>

        {/* Nombre y Apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              disabled={isLoading}
              className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
                errors.nombre ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Juan"
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>}
          </div>
          <div>
            <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
              Apellido *
            </label>
            <input
              type="text"
              id="apellido"
              value={formData.apellido}
              onChange={(e) => handleChange('apellido', e.target.value)}
              disabled={isLoading}
              className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
                errors.apellido ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Pérez"
            />
            {errors.apellido && <p className="mt-1 text-xs text-red-600">{errors.apellido}</p>}
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            disabled={isLoading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="+57 300 123 4567"
          />
        </div>

        {/* Rol */}
        <div>
          <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-1">
            Rol *
          </label>
          <select
            id="rol"
            value={formData.rol}
            onChange={(e) => handleChange('rol', e.target.value as UserRole)}
            disabled={isLoading}
            className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 ${
              errors.rol ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {roleOptionsFiltered.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.rol && <p className="mt-1 text-xs text-red-600">{errors.rol}</p>}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
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
            {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
