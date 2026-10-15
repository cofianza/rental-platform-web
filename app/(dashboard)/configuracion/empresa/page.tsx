/**
 * Datos de la empresa (Cofianza) — edición por el administrador.
 * Nombre, NIT, dirección, teléfono, email y web. La vigencia del CRC NO se
 * edita aquí: es VIGENCIA_CRC_DIAS en /admin/calibracion.
 * Estos datos alimentan los certificados de estudio y la firma de Cofianza.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui'
import { IconLoader, IconBuilding2, IconRefresh } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { getEmpresa, updateEmpresa, type EmpresaInfo } from '@/services/empresaService'
import { TIPOS_DOCUMENTO } from '@/lib/constants'
import { useFirmantePendienteStore } from '@/stores/firmantePendiente.store'
import { useAuthStore } from '@/stores/auth.store'

// Auco solo acepta documentos de persona natural: el NIT no sirve para firmar.
const TIPOS_FIRMANTE = (['CC', 'CE', 'PPT', 'PEP', 'PASAPORTE'] as const).map((k) => ({ value: k, label: TIPOS_DOCUMENTO[k] }))
const INPUT_CLS =
  'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

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
  { key: 'email', label: 'Correo', type: 'email', required: true, help: 'Correo de Cofianza para la firma y los certificados.' },
  { key: 'website', label: 'Sitio web' },
]

// Errores de validación junto a cada campo (antes solo salían en un toast que
// no decía cuál de los cinco datos del firmante faltaba).
type Errores = Partial<Record<keyof EmpresaInfo, string>>

const FIRMANTE_KEYS = ['firmanteNombre', 'firmanteTipoDocumento', 'firmanteDocumento', 'firmanteEmail', 'firmanteCelular'] as const

export default function EmpresaPage() {
  const esAdmin = useAuthStore((s) => s.user?.rol === 'administrador')
  const [form, setForm] = useState<EmpresaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})

  const cargar = useCallback(async () => {
    try {
      setForm(await getEmpresa())
      setErrorCarga(null)
    } catch (err: unknown) {
      setErrorCarga((err as { message?: string }).message || 'No se pudieron cargar los datos de la empresa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const setCampo = (key: keyof EmpresaInfo, value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setErrores((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const errorDe = (key: keyof EmpresaInfo) =>
    errores[key] ? <p className="text-xs text-red-600 mt-1">{errores[key]}</p> : null
  const inputCls = (key: keyof EmpresaInfo) => (errores[key] ? INPUT_CLS.replace('border-gray-300', 'border-red-400') : INPUT_CLS)

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const nuevos: Errores = {}
    if (!form.name?.trim()) nuevos.name = 'Escriba la razón social de Cofianza.'
    if (!form.email?.trim()) nuevos.email = 'Escriba el correo de Cofianza.'
    // PhoneInput emite "+57 301..."; validamos y guardamos sin espacios.
    const phone = (form.phone ?? '').replace(/\s+/g, '').trim()
    if (!phone || !/^\+?\d{7,15}$/.test(phone)) {
      nuevos.phone = 'Falta un WhatsApp válido de Cofianza: es donde recibe el enlace para firmar el contrato.'
    }
    // Firmante del Acta de Migración (spec migración §3.3): todo o nada.
    const firmante = {
      firmanteNombre: (form.firmanteNombre ?? '').trim(),
      firmanteTipoDocumento: form.firmanteTipoDocumento ?? '',
      firmanteDocumento: (form.firmanteDocumento ?? '').trim(),
      firmanteEmail: (form.firmanteEmail ?? '').trim(),
      // PhoneInput vacío emite solo el indicativo («+57 »): eso es «sin celular».
      firmanteCelular: (form.firmanteCelular ?? '').replace(/\s+/g, '').replace(/^\+\d{1,4}$/, ''),
    }
    const llenos = Object.values(firmante).filter(Boolean).length
    if (llenos > 0 && llenos < 5) {
      for (const k of FIRMANTE_KEYS) {
        if (!firmante[k]) nuevos[k] = 'Falta este dato (o deje vacíos todos los del firmante).'
      }
    }
    if (firmante.firmanteCelular && !/^\+?\d{7,15}$/.test(firmante.firmanteCelular)) {
      nuevos.firmanteCelular = 'Celular no válido: use el código de país (ej. +57…).'
    }
    if (firmante.firmanteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firmante.firmanteEmail)) {
      nuevos.firmanteEmail = 'Correo no válido.'
    }
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) {
      toast.error('Revise los campos marcados en rojo.')
      return
    }
    setSaving(true)
    try {
      // Solo los campos de esta pantalla: `certificateValidityDays` ya no se
      // edita aquí (vive en /admin/calibracion) y no se reenvía para no pisarlo.
      const { name, nit, address, email, website } = form
      const updated = await updateEmpresa({ name, nit, address, phone, email, website, ...firmante })
      setForm(updated)
      void useFirmantePendienteStore.getState().cargar() // el aviso y el punto del menú se apagan al guardar
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
        subtitle="Identidad institucional de COFIANZA, no sus datos personales. Cofianza firma como tercero en cada contrato: a este WhatsApp/email le llega su enlace de firma, y estos datos salen en los certificados de estudio."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : !form ? (
        !esAdmin ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-600">
            Solo el administrador puede ver y editar esta sección.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
            <p className="text-sm text-red-700">{errorCarga ?? 'No se pudieron cargar los datos de la empresa.'}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                cargar()
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              <IconRefresh size={14} />
              Reintentar
            </button>
          </div>
        )
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
                  error={errores[c.key]}
                />
              ) : (
                <>
                  <label htmlFor={`empresa-${c.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                    {c.label}
                    {c.required && <span className="text-coral-700"> *</span>}
                  </label>
                  <input
                    id={`empresa-${c.key}`}
                    type={c.type ?? 'text'}
                    value={String(form[c.key] ?? '')}
                    onChange={(e) => setCampo(c.key, e.target.value)}
                    aria-invalid={!!errores[c.key]}
                    className={inputCls(c.key)}
                  />
                  {errorDe(c.key)}
                </>
              )}
              {c.help && <p className="text-xs text-gray-500 mt-1">{c.help}</p>}
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-primary-700">Firmante del Acta de Migración</h2>
              <p className="text-xs text-gray-500 mt-1">
                Persona que suscribe por Cofianza el Acta de Migración de cartera en Auco. Le llega el enlace de firma a este
                correo y el código a este WhatsApp; deben ser distintos a los del representante legal de la inmobiliaria. Sin
                estos datos el acta no se puede enviar a firma.
              </p>
            </div>
            <div>
              <label htmlFor="empresa-firmanteNombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                id="empresa-firmanteNombre"
                value={form.firmanteNombre ?? ''}
                onChange={(e) => setCampo('firmanteNombre', e.target.value)}
                aria-invalid={!!errores.firmanteNombre}
                className={inputCls('firmanteNombre')}
              />
              {errorDe('firmanteNombre')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="empresa-firmanteTipoDocumento" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de documento
                </label>
                <select
                  id="empresa-firmanteTipoDocumento"
                  value={form.firmanteTipoDocumento ?? ''}
                  onChange={(e) => setCampo('firmanteTipoDocumento', e.target.value)}
                  aria-invalid={!!errores.firmanteTipoDocumento}
                  className={inputCls('firmanteTipoDocumento')}
                >
                  <option value="">Seleccione…</option>
                  {TIPOS_FIRMANTE.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errorDe('firmanteTipoDocumento')}
              </div>
              <div>
                <label htmlFor="empresa-firmanteDocumento" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de documento
                </label>
                <input
                  id="empresa-firmanteDocumento"
                  value={form.firmanteDocumento ?? ''}
                  onChange={(e) => setCampo('firmanteDocumento', e.target.value)}
                  aria-invalid={!!errores.firmanteDocumento}
                  className={inputCls('firmanteDocumento')}
                />
                {errorDe('firmanteDocumento')}
              </div>
            </div>
            <div>
              <label htmlFor="empresa-firmanteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Correo
              </label>
              <input
                id="empresa-firmanteEmail"
                type="email"
                value={form.firmanteEmail ?? ''}
                onChange={(e) => setCampo('firmanteEmail', e.target.value)}
                aria-invalid={!!errores.firmanteEmail}
                className={inputCls('firmanteEmail')}
              />
              {errorDe('firmanteEmail')}
            </div>
            <PhoneInput
              label="Celular (WhatsApp)"
              value={form.firmanteCelular ?? ''}
              onChange={(v) => setCampo('firmanteCelular', v)}
              placeholder="300 123 4567"
              error={errores.firmanteCelular}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-ink-900 bg-coral-500 rounded-lg hover:bg-coral-400 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
