/**
 * DatosFiscalesSolicitanteSection — pestana 'Datos Fiscales' para el solicitante
 * en /facturacion. Muestra los datos que se usaran al emitir la factura
 * electronica y permite editarlos.
 *
 * Soporta persona natural (CC/CE/TI + nombre completo) y persona juridica
 * (NIT + razon social + DV) — la facturacion DIAN exige campos distintos
 * segun el tipo. El toggle al inicio del form decide que campos se piden.
 *
 * Si faltan campos requeridos por Factus bloquea con un banner ambar — la
 * emision desde el expediente esta gateada por la misma validacion en
 * backend, asi que aqui solo informamos al usuario.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { misDatosFiscalesService, type IMisDatosFiscales } from '@/services/misDatosFiscalesService'
import { MunicipioCombobox } from '@/components/registro/MunicipioCombobox'
import { useAuthStore } from '@/stores/auth.store'
import { IconLoader, IconCheck, IconAlertTriangle } from '@/components/icons'

const TIPO_DOC_NATURAL = [
  { value: 'cc', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'ce', label: 'Cédula de Extranjería (CE)' },
  { value: 'ti', label: 'Tarjeta de Identidad (TI)' },
] as const

const TIPO_DOC_JURIDICA = [
  { value: 'nit', label: 'NIT' },
] as const

const FALTANTE_LABEL: Record<string, string> = {
  tipo_documento: 'Tipo de documento (debe ser CC, CE, TI o NIT — el pasaporte no aplica para facturación electrónica en Colombia)',
  numero_documento: 'Número de documento',
  digito_verificacion: 'Dígito de verificación del NIT',
  razon_social: 'Razón social de la empresa',
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  municipio_id: 'Municipio',
}

const TIPOS_FISCALES_VALIDOS = ['cc', 'ce', 'ti', 'nit']

type Form = {
  tipo_persona: 'natural' | 'juridica'
  razon_social: string
  tipo_documento: string
  numero_documento: string
  digito_verificacion: string
  email: string
  telefono: string
  direccion: string
  municipio_id: string
  municipio_nombre: string
}

export function DatosFiscalesSolicitanteSection() {
  const accessToken = useAuthStore((s) => s.accessToken)

  const [data, setData] = useState<IMisDatosFiscales | null>(null)
  const [form, setForm] = useState<Form>({
    tipo_persona: 'natural',
    razon_social: '',
    tipo_documento: '',
    numero_documento: '',
    digito_verificacion: '',
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
        // Si el tipo guardado no es tributario (eg. 'pasaporte' del registro),
        // dejamos vacio para forzar al usuario a elegir uno valido.
        const tipoLower = (res.tipo_documento || '').toLowerCase()
        const tipoEsFiscal = TIPOS_FISCALES_VALIDOS.includes(tipoLower)
        setForm({
          tipo_persona: res.tipo_persona ?? 'natural',
          razon_social: res.razon_social ?? '',
          tipo_documento: tipoEsFiscal ? tipoLower : '',
          numero_documento: tipoEsFiscal ? res.numero_documento || '' : '',
          digito_verificacion: res.digito_verificacion ?? '',
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

  const setField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleTipoPersonaChange = (next: 'natural' | 'juridica') => {
    setForm((prev) => ({
      ...prev,
      tipo_persona: next,
      // Persona juridica: forzamos NIT como tipo_documento. Si el usuario
      // cambia de juridica -> natural y tenia NIT, vaciamos para que elija
      // CC/CE/TI manualmente (NIT no aplica a persona natural en este flujo).
      tipo_documento: next === 'juridica' ? 'nit' : (prev.tipo_documento === 'nit' ? '' : prev.tipo_documento),
      // Si pasa a natural, limpiamos campos exclusivos de juridica.
      ...(next === 'natural'
        ? { razon_social: '', digito_verificacion: '' }
        : {}),
    }))
    setDirty(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones cliente — el backend tambien valida y bloquea.
    if (form.tipo_persona === 'juridica') {
      if (!form.razon_social.trim()) {
        toast.error('Ingresa la razón social de la empresa')
        return
      }
      if (form.tipo_documento !== 'nit') {
        toast.error('Persona jurídica requiere NIT')
        return
      }
      if (!/^\d$/.test(form.digito_verificacion)) {
        toast.error('Ingresa el dígito de verificación del NIT (1 dígito)')
        return
      }
    } else {
      if (!form.tipo_documento || form.tipo_documento === 'nit') {
        toast.error('Selecciona un tipo de documento válido (CC, CE o TI)')
        return
      }
    }

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
        tipo_persona: form.tipo_persona,
        razon_social: form.razon_social,
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento,
        digito_verificacion: form.digito_verificacion,
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

  const tipoDocOptions = useMemo(
    () => (form.tipo_persona === 'juridica' ? TIPO_DOC_JURIDICA : TIPO_DOC_NATURAL),
    [form.tipo_persona],
  )

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

        {/* Toggle Persona Natural / Jurídica */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Facturas como persona natural o como empresa?
          </label>
          <div className="flex gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => handleTipoPersonaChange('natural')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                form.tipo_persona === 'natural'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Persona natural
            </button>
            <button
              type="button"
              onClick={() => handleTipoPersonaChange('juridica')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                form.tipo_persona === 'juridica'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Empresa (Persona jurídica)
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {form.tipo_persona === 'natural'
              ? 'La factura saldrá a tu nombre con tu Cédula de Ciudadanía.'
              : 'La factura saldrá a nombre de la empresa con su NIT y dígito de verificación.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {form.tipo_persona === 'natural' ? (
            // Persona natural: nombre completo viene del registro (readonly)
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
          ) : (
            // Persona jurídica: razón social editable
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.razon_social}
                onChange={(e) => setField('razon_social', e.target.value)}
                placeholder="Ej. CONSTRUCTORA Y ARRENDAMIENTOS DE ANTIOQUIA S.A.S."
                maxLength={300}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nombre legal completo de la empresa, tal como aparece en el RUT.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de documento <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tipo_documento}
              onChange={(e) => setField('tipo_documento', e.target.value)}
              disabled={form.tipo_persona === 'juridica'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-700"
            >
              <option value="">— Selecciona —</option>
              {tipoDocOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {form.tipo_persona === 'juridica'
                ? 'Las empresas en Colombia facturan con NIT.'
                : 'Si en el registro pusiste pasaporte, eligelo aquí como CC, CE o TI — son los únicos válidos para facturas DIAN de persona natural.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.tipo_persona === 'juridica' ? 'NIT' : 'Número de documento'} <span className="text-red-500">*</span>
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

          {/* Dígito de verificación — solo persona jurídica */}
          {form.tipo_persona === 'juridica' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dígito de verificación <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.digito_verificacion}
                onChange={(e) => setField('digito_verificacion', e.target.value.replace(/\D/g, '').slice(0, 1))}
                placeholder="Ej. 7"
                maxLength={1}
                inputMode="numeric"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                El último dígito que aparece en el NIT (ej. 900.123.456-<strong>7</strong>).
              </p>
            </div>
          )}

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
