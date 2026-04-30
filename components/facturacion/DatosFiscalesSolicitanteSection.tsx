/**
 * DatosFiscalesSolicitanteSection — pestana 'Datos Fiscales' para el solicitante
 * en /facturacion. Muestra los datos que se usaran al emitir la factura
 * electronica y permite editarlos. Si faltan campos requeridos por Factus
 * (CC, email, telefono, direccion, municipio), bloquea con un banner ambar
 * — la emision desde el expediente esta gateada por la misma validacion en
 * backend, asi que aqui solo informamos al usuario.
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { misDatosFiscalesService, type IMisDatosFiscales } from '@/services/misDatosFiscalesService'
import { MunicipioCombobox } from '@/components/registro/MunicipioCombobox'
import { useAuthStore } from '@/stores/auth.store'
import { IconLoader, IconCheck, IconAlertTriangle } from '@/components/icons'

const TIPO_DOC_OPTIONS = [
  { value: 'cc', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'ce', label: 'Cédula de Extranjería (CE)' },
  { value: 'ti', label: 'Tarjeta de Identidad (TI)' },
  { value: 'nit', label: 'NIT' },
] as const

const FALTANTE_LABEL: Record<string, string> = {
  numero_documento: 'Número de documento',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  municipio_id: 'Municipio',
}

export function DatosFiscalesSolicitanteSection() {
  const accessToken = useAuthStore((s) => s.accessToken)

  const [data, setData] = useState<IMisDatosFiscales | null>(null)
  const [form, setForm] = useState({
    tipo_documento: '',
    numero_documento: '',
    email: '',
    telefono: '',
    direccion: '',
    municipio_id: '',
    municipio_nombre: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    misDatosFiscalesService
      .get()
      .then((res) => {
        if (cancelled) return
        setData(res)
        setForm({
          tipo_documento: res.tipo_documento || 'cc',
          numero_documento: res.numero_documento || '',
          email: res.email || '',
          telefono: res.telefono || '',
          direccion: res.direccion || '',
          municipio_id: res.municipio_id || '',
          municipio_nombre: res.municipio_nombre || '',
        })
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Error al cargar tus datos fiscales')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_documento.trim()) {
      toast.error('El número de documento es obligatorio')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error('Ingresa un correo electrónico válido')
      return
    }
    setSaving(true)
    try {
      const updated = await misDatosFiscalesService.update({
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        email: form.email,
        telefono: form.telefono,
        direccion: form.direccion,
        municipio_id: form.municipio_id,
        municipio_nombre: form.municipio_nombre,
      })
      setData(updated)
      setDirty(false)
      toast.success('Datos fiscales guardados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos guardar tus datos fiscales')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
        <IconLoader size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const faltantes = data?.faltantes ?? []
  const incompleto = faltantes.length > 0
  const municipioValue =
    form.municipio_id && form.municipio_nombre
      ? { codigo: form.municipio_id, nombre: form.municipio_nombre }
      : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner de estado */}
      {incompleto ? (
        <div className="px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
          <IconAlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Completa tus datos fiscales antes de emitir tu primera factura
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Te falta:{' '}
              {faltantes
                .map((f) => FALTANTE_LABEL[f] ?? f)
                .join(', ')}
              . Sin estos datos no podremos generar tu factura electrónica.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-green-50 border border-green-300 rounded-lg flex items-start gap-3">
          <IconCheck size={20} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-900">
            Tus datos fiscales están completos. Puedes emitir tu factura cuando lo necesites.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Datos del receptor</h3>
        <p className="text-sm text-gray-500 mb-4">
          Estos datos aparecerán en las facturas electrónicas que Cofianza emita a tu nombre.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre (readonly — viene del registro) */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={`${data?.nombre || ''} ${data?.apellido || ''}`.trim()}
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700"
            />
            <p className="text-xs text-gray-400 mt-1">
              Para cambiar tu nombre, contacta soporte.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tipo_documento}
              onChange={(e) => setField('tipo_documento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TIPO_DOC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de documento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.numero_documento}
              onChange={(e) => setField('numero_documento', e.target.value.replace(/[^\w]/g, ''))}
              placeholder="Sin puntos ni guiones"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setField('telefono', e.target.value)}
              placeholder="+57 300 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setField('direccion', e.target.value)}
              placeholder="Calle 100 # 20-30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Municipio <span className="text-red-500">*</span>
            </label>
            <MunicipioCombobox
              value={municipioValue}
              onChange={(v) => {
                setField('municipio_id', v?.codigo ?? '')
                setField('municipio_nombre', v?.nombre ?? '')
              }}
              authToken={accessToken ?? undefined}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconCheck size={16} />
            )}
            {saving ? 'Guardando…' : 'Guardar datos fiscales'}
          </button>
        </div>
      </div>
    </form>
  )
}
