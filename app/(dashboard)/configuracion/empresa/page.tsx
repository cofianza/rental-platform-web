/**
 * Datos de la empresa (Cofianza) — edición por el administrador.
 * Nombre, NIT, dirección, teléfono, email, web y validez de certificados.
 * Estos datos alimentan los certificados de estudio y la firma de Cofianza.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconBuilding2 } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { getEmpresa, updateEmpresa, type EmpresaInfo } from '@/services/empresaService'

const CAMPOS: Array<{ key: keyof EmpresaInfo; label: string; type?: string; help?: string; required?: boolean }> = [
  { key: 'name', label: 'Razón social', required: true, help: 'Nombre de Cofianza tal como firma en el contrato.' },
  { key: 'nit', label: 'NIT' },
  { key: 'address', label: 'Dirección' },
  {
    key: 'phone',
    label: 'Teléfono (WhatsApp de Cofianza)',
    required: true,
    help: 'Obligatorio. A este WhatsApp le llega el enlace para que Cofianza firme el contrato. Debe ser un número real con código de país (ej. +57…) y distinto al del arrendatario y el arrendador.',
  },
  { key: 'email', label: 'Email', type: 'email', required: true, help: 'Correo de Cofianza para la firma y los certificados.' },
  { key: 'website', label: 'Sitio web' },
  { key: 'certificateValidityDays', label: 'Validez de certificados (días)', type: 'number' },
]

export default function EmpresaPage() {
  const [form, setForm] = useState<EmpresaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setForm(await getEmpresa())
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudieron cargar los datos de la empresa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const setCampo = (key: keyof EmpresaInfo, value: string) => {
    setForm((f) =>
      f ? { ...f, [key]: key === 'certificateValidityDays' ? Number(value) || 0 : value } : f,
    )
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (!form.name?.trim() || !form.email?.trim()) {
      toast.error('La razón social y el email de Cofianza son obligatorios.')
      return
    }
    // PhoneInput emite "+57 301..."; validamos y guardamos sin espacios.
    const phone = (form.phone ?? '').replace(/\s+/g, '').trim()
    if (!phone || !/^\+?\d{7,15}$/.test(phone)) {
      toast.error('Falta un WhatsApp válido de Cofianza: es donde recibe el enlace para firmar el contrato.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateEmpresa({ ...form, phone })
      setForm(updated)
      toast.success('Datos de la empresa actualizados')
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Datos de la empresa (Cofianza)"
        subtitle="Identidad institucional de COFIANZA, no tus datos personales. Cofianza firma como tercero en cada contrato: a este WhatsApp/email le llega su enlace de firma, y estos datos salen en los certificados de estudio."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : !form ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-600">
          No se pudieron cargar los datos. Solo el administrador puede ver y editar esta sección.
        </div>
      ) : (
        <form onSubmit={handleGuardar} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary-700 mb-2">
            <IconBuilding2 size={18} />
            <h2 className="text-sm font-semibold">Información de la empresa</h2>
          </div>

          {CAMPOS.map((c) => (
            <div key={c.key}>
              {c.key === 'phone' ? (
                <PhoneInput
                  label={c.label}
                  required={c.required}
                  value={String(form[c.key] ?? '')}
                  onChange={(v) => setCampo(c.key, v)}
                  placeholder="300 123 4567"
                />
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {c.label}
                    {c.required && <span className="text-coral-500"> *</span>}
                  </label>
                  <input
                    type={c.type ?? 'text'}
                    value={String(form[c.key] ?? '')}
                    onChange={(e) => setCampo(c.key, e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </>
              )}
              {c.help && <p className="text-xs text-gray-500 mt-1">{c.help}</p>}
            </div>
          ))}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-coral-500 rounded-lg hover:bg-coral-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <IconLoader size={16} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
