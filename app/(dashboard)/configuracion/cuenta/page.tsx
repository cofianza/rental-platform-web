/**
 * Mi cuenta — el usuario edita sus propios datos personales.
 *
 * Comun a todos los roles (arrendatario, propietario, inmobiliaria, admin).
 * Para rol='solicitante' los cambios sincronizan tambien la fila vinculada
 * en `solicitantes` (donde vive el documento autoritativo). El email es
 * read-only en MVP — cambiarlo requiere flow de re-verificacion en
 * Supabase Auth, fuera de alcance.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { ApiClientError } from '@/lib/api'
import type { IMyProfile, IUpdateMyProfilePayload } from '@/types/auth'
import { IconLoader, IconCheck } from '@/components/icons'

const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  cc: 'Cédula de ciudadanía',
  ce: 'Cédula de extranjería',
  ti: 'Tarjeta de identidad',
  nit: 'NIT',
  pasaporte: 'Pasaporte',
}

interface FormState {
  nombre: string
  apellido: string
  telefono: string
  tipo_documento: 'cc' | 'ce' | 'ti' | 'nit' | 'pasaporte' | ''
  numero_documento: string
  nombre_representante: string
}

function profileToForm(p: IMyProfile): FormState {
  return {
    nombre: p.nombre ?? '',
    apellido: p.apellido ?? '',
    telefono: p.telefono ?? '',
    tipo_documento: (p.tipo_documento ?? '') as FormState['tipo_documento'],
    numero_documento: p.numero_documento ?? '',
    nombre_representante: p.nombre_representante ?? '',
  }
}

export default function MiCuentaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Si vinimos redirigidos (banner "completá tu perfil"), al guardar volvemos
  // a donde estabamos. Solo aceptamos paths internos (evita open-redirect).
  const returnToParam = searchParams?.get('returnTo')
  const returnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : null
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  const isSolicitante = user?.rol === 'solicitante'

  const [perfil, setPerfil] = useState<IMyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    nombre: '',
    apellido: '',
    telefono: '',
    tipo_documento: '',
    numero_documento: '',
    nombre_representante: '',
  })

  useEffect(() => {
    authService
      .getMyProfile()
      .then((data) => {
        setPerfil(data)
        setForm(profileToForm(data))
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Error al cargar tu cuenta'),
      )
      .finally(() => setLoading(false))
  }, [])

  const onChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!perfil) return

    if (form.nombre.trim().length < 2) {
      toast.error('Ingresa tu nombre')
      return
    }
    if (form.apellido.trim().length < 2) {
      toast.error('Ingresa tu apellido')
      return
    }

    // PhoneInput emite "+57 3001234567"; el backend espera sin espacios.
    const telefonoLimpio = form.telefono.replace(/\s+/g, '').trim()
    if (!telefonoLimpio) {
      toast.error('Ingresa tu teléfono de WhatsApp: ahí recibes los avisos y es el respaldo para firmar contratos.')
      return
    }
    if (!/^\+?\d{7,15}$/.test(telefonoLimpio)) {
      toast.error('Teléfono inválido')
      return
    }

    // Para la inmobiliaria (titular y miembros del equipo) el documento es
    // obligatorio: sin él, un miembro no puede administrar expedientes (queda
    // bloqueado por perfil incompleto).
    if (isInmobiliaria) {
      if (!form.tipo_documento) {
        toast.error('Selecciona tu tipo de documento')
        return
      }
      if (form.numero_documento.trim().length < 3) {
        toast.error('Ingresa tu número de documento')
        return
      }
    }

    const payload: IUpdateMyProfilePayload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: telefonoLimpio || null,
      tipo_documento: form.tipo_documento || null,
      numero_documento: form.numero_documento.trim() || null,
    }
    if (isInmobiliaria) {
      payload.nombre_representante = form.nombre_representante.trim() || null
    }

    setSaving(true)
    try {
      const updated = await authService.updateMyProfile(payload)
      setPerfil(updated)
      setForm(profileToForm(updated))
      toast.success('Datos actualizados')
      // Refrescar la sesión para que `perfil_completo`/`rol_miembro` del store
      // queden al día (así se levanta el bloqueo de "perfil incompleto" sin
      // tener que recargar). Si vinimos de otro flujo, volvemos allí.
      await authService.checkSession().catch(() => {})
      if (returnTo) {
        router.push(returnTo)
      }
    } catch (err) {
      // Errores conocidos del backend con mensajes especificos.
      if (err instanceof ApiClientError) {
        if (err.code === 'DOCUMENTO_BLOQUEADO_POR_ESTUDIO') {
          toast.error(err.message, {
            description: 'Tu documento ya fue consultado en un estudio crediticio.',
            duration: 8000,
          })
          return
        }
        if (err.code === 'DOCUMENTO_DUPLICADO') {
          toast.error(err.message)
          return
        }
      }
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!perfil) {
    return <div className="text-gray-500">No se pudo cargar tu cuenta.</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Mi cuenta"
        subtitle="Edita tus datos personales. El email no es editable; contacta soporte si necesitas cambiarlo."
      />

      {/* Datos personales */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Datos personales</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Nombre"
            value={form.nombre}
            onChange={(v) => onChange('nombre', v)}
            placeholder="Juan"
            required
          />
          <Field
            label="Apellido"
            value={form.apellido}
            onChange={(v) => onChange('apellido', v)}
            placeholder="Pérez"
            required
          />
        </div>

        {isInmobiliaria && (
          <Field
            label="Representante legal"
            value={form.nombre_representante}
            onChange={(v) => onChange('nombre_representante', v)}
            placeholder="Ej. Juan Pérez Gómez"
            help="Quien firma en nombre de la inmobiliaria."
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={perfil.email}
            disabled
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Para cambiar el email, escríbenos a soporte@cofianza.com.
          </p>
        </div>

        <div>
          <PhoneInput
            label="Teléfono"
            value={form.telefono}
            onChange={(v) => onChange('telefono', v)}
            placeholder="300 123 4567"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Tu WhatsApp de contacto: aquí te llegan los avisos del sistema y es el respaldo para la firma de contratos. Con código de país (ej. +57…).
          </p>
        </div>
      </div>

      {/* Documento de identidad */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Documento de identidad</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo{isInmobiliaria && <span className="text-coral-500"> *</span>}
            </label>
            <select
              value={form.tipo_documento}
              onChange={(e) =>
                onChange('tipo_documento', e.target.value as FormState['tipo_documento'])
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Seleccionar…</option>
              {Object.entries(TIPO_DOCUMENTO_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Número"
              value={form.numero_documento}
              onChange={(v) => onChange('numero_documento', v)}
              placeholder="Ej. 1234567890"
              required={isInmobiliaria}
            />
          </div>
        </div>

        {isSolicitante && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Una vez que tu documento haya sido consultado en un estudio crediticio, no podrás
            modificarlo desde aquí. Si necesitas corregirlo, contacta soporte.
          </p>
        )}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <IconLoader size={16} className="animate-spin" />
          ) : (
            <IconCheck size={16} />
          )}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  help?: string
  required?: boolean
}

function Field({ label, value, onChange, placeholder, help, required }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && ' *'}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  )
}
