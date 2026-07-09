/**
 * Datos del arrendador para contratos.
 *
 * Pantalla donde la inmobiliaria/propietario completa los datos que
 * aparecen en el contrato de arrendamiento generado: domicilio, cuenta
 * de recaudo del canon, contacto para notificar pagos, y (solo
 * inmobiliaria) logo + matrícula de arrendador.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import {
  perfilArrendadorService,
  type IPerfilArrendador,
  type IUpdatePerfilArrendadorInput,
} from '@/services/perfilArrendadorService'
import { IconLoader, IconCheck, IconUpload, IconTrash, IconAlertTriangle } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'

const ROL_LABELS: Record<string, string> = {
  inmobiliaria: 'Inmobiliaria',
  propietario: 'Propietario',
  administrador: 'Administrador',
}

export default function DatosContratoPage() {
  const { user } = useAuth()
  const isInmobiliaria = user?.rol === 'inmobiliaria'
  // Los datos para contrato son de la ORGANIZACIÓN: solo el titular los edita.
  // Un miembro no-titular los ve en modo lectura (el backend también lo bloquea).
  const soloLectura = isInmobiliaria && user?.rol_miembro !== 'owner'
  const router = useRouter()
  const searchParams = useSearchParams()
  // Si vinimos redirigidos desde otra pantalla (banner perfil incompleto),
  // al guardar volvemos a donde estabamos. Validamos que sea un path
  // interno seguro para evitar open-redirect.
  const returnToParam = searchParams?.get('returnTo')
  const returnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : null

  const [perfil, setPerfil] = useState<IPerfilArrendador | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [form, setForm] = useState<IUpdatePerfilArrendadorInput>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    perfilArrendadorService
      .getMe()
      .then((data) => {
        setPerfil(data)
        setForm({
          razon_social: data.razon_social,
          nit: data.nit,
          representante_legal: data.representante_legal,
          domicilio_direccion: data.domicilio_direccion,
          domicilio_ciudad: data.domicilio_ciudad,
          matricula_arrendador: data.matricula_arrendador,
          matricula_expedida_por: data.matricula_expedida_por,
          matricula_fecha: data.matricula_fecha,
          whatsapp_recaudo: data.whatsapp_recaudo,
          email_recaudo: data.email_recaudo,
          cuenta_recaudo_banco: data.cuenta_recaudo_banco,
          cuenta_recaudo_tipo: data.cuenta_recaudo_tipo,
          cuenta_recaudo_numero: data.cuenta_recaudo_numero,
          cuenta_recaudo_titular_nombre: data.cuenta_recaudo_titular_nombre,
          cuenta_recaudo_titular_nit: data.cuenta_recaudo_titular_nit,
        })
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error al cargar el perfil'))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (field: keyof IUpdatePerfilArrendadorInput, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    // El WhatsApp del arrendador es obligatorio: es a donde llega el enlace de
    // firma del contrato. PhoneInput emite "+57 301..."; validamos sin espacios.
    const waRecaudo = (form.whatsapp_recaudo ?? '').replace(/\s+/g, '').trim()
    if (!waRecaudo || !/^\+?\d{7,15}$/.test(waRecaudo)) {
      toast.error('Falta un WhatsApp válido del arrendador: es donde recibes el enlace para firmar el contrato.')
      return
    }
    // Todos estos datos salen impresos en el contrato. Si falta cualquiera, el
    // PDF queda con campos en blanco, asi que son obligatorios al guardar.
    // (El mismo set se valida en el backend al generar el contrato.)
    const requeridos: { valor: string | null | undefined; etiqueta: string }[] = [
      { valor: form.domicilio_direccion, etiqueta: 'Domicilio (dirección)' },
      { valor: form.domicilio_ciudad, etiqueta: 'Domicilio (ciudad)' },
      { valor: form.cuenta_recaudo_banco, etiqueta: 'Banco de la cuenta de recaudo' },
      { valor: form.cuenta_recaudo_tipo, etiqueta: 'Tipo de cuenta' },
      { valor: form.cuenta_recaudo_numero, etiqueta: 'Número de cuenta' },
      { valor: form.cuenta_recaudo_titular_nombre, etiqueta: 'Titular de la cuenta' },
      { valor: form.cuenta_recaudo_titular_nit, etiqueta: 'NIT/CC del titular' },
      { valor: form.email_recaudo, etiqueta: 'Email de recaudo' },
    ]
    if (isInmobiliaria) {
      requeridos.push(
        { valor: form.razon_social, etiqueta: 'Nombre comercial / Razón social' },
        { valor: form.nit, etiqueta: 'NIT' },
        { valor: form.representante_legal, etiqueta: 'Representante legal' },
        { valor: form.matricula_arrendador, etiqueta: 'Matrícula de arrendador' },
      )
    }
    const faltantes = requeridos
      .filter((r) => !r.valor || String(r.valor).trim().length === 0)
      .map((r) => r.etiqueta)
    if (faltantes.length > 0) {
      toast.error(
        `Faltan datos obligatorios para el contrato: ${faltantes.join(', ')}.`,
      )
      return
    }
    setSaving(true)
    try {
      const updated = await perfilArrendadorService.updateMe({ ...form, whatsapp_recaudo: waRecaudo })
      setPerfil(updated)
      toast.success('Datos actualizados')
      // Si vinimos desde otro flujo (banner perfil incompleto), volvemos
      // ahi para que el usuario continue lo que estaba haciendo.
      if (returnTo) {
        router.push(returnTo)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no puede superar 2 MB')
      return
    }
    setUploadingLogo(true)
    try {
      const updated = await perfilArrendadorService.uploadLogo(file)
      setPerfil(updated)
      toast.success('Logo actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleLogoDelete = () => {
    toast('¿Eliminar el logo?', {
      description: 'Los próximos contratos saldrán sin logo hasta que subas uno nuevo.',
      duration: 10000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          setDeletingLogo(true)
          try {
            const updated = await perfilArrendadorService.deleteLogo()
            setPerfil(updated)
            toast.success('Logo eliminado')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al eliminar')
          } finally {
            setDeletingLogo(false)
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!perfil) {
    return <div className="text-gray-500">No se pudo cargar el perfil.</div>
  }

  const rolLabel = ROL_LABELS[perfil.rol] ?? perfil.rol

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Datos para contrato"
        subtitle={`Estos datos aparecen en los contratos de arrendamiento que se generan a tu nombre como ${rolLabel.toLowerCase()}.`}
      />

      {soloLectura && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Estos datos los gestiona <strong>el titular</strong> de la inmobiliaria y son los mismos
            para todo el equipo. Los ves en <strong>modo lectura</strong>.
          </p>
        </div>
      )}

      <fieldset disabled={soloLectura} className="space-y-6 border-0 p-0 m-0 disabled:opacity-70">
      {/* Logo (solo inmobiliaria) */}
      {isInmobiliaria && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Logo de la inmobiliaria</h3>
          <p className="text-sm text-gray-500 mb-4">
            Aparecerá en la esquina superior derecha de cada contrato. PNG, JPG o WebP. Máx 2 MB.
          </p>

          {perfil.logo_url ? (
            <div className="flex items-center gap-6">
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <img
                  src={perfil.logo_url}
                  alt="Logo actual"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <IconLoader size={16} className="animate-spin" />
                  ) : (
                    <IconUpload size={16} />
                  )}
                  Reemplazar
                </button>
                <button
                  onClick={handleLogoDelete}
                  disabled={deletingLogo || uploadingLogo}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingLogo ? (
                    <IconLoader size={16} className="animate-spin" />
                  ) : (
                    <IconTrash size={16} />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              <IconUpload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {uploadingLogo ? 'Subiendo…' : 'Subir logo'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click o arrastra una imagen aquí (PNG, JPG o WebP, máx 2 MB)
              </p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Datos generales del arrendador */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Datos generales</h3>

        {perfil.rol === 'inmobiliaria' && (
          <Field
            label="Nombre comercial / Razón social"
            value={form.razon_social}
            onChange={(v) => onChange('razon_social', v)}
            placeholder="Ej. Inmobiliaria del Valle S.A.S"
            help="El nombre de la inmobiliaria que aparece en el contrato y en la app."
            required
          />
        )}

        {perfil.rol === 'inmobiliaria' && (
          <Field
            label="NIT"
            value={form.nit}
            onChange={(v) => onChange('nit', v)}
            placeholder="Ej. 901234567-8"
            help="NIT de la inmobiliaria (con dígito de verificación). Aparece en el contrato."
            required
          />
        )}

        {perfil.rol === 'inmobiliaria' && (
          <Field
            label="Representante legal"
            value={form.representante_legal}
            onChange={(v) => onChange('representante_legal', v)}
            placeholder="Ej. Juan Pérez Gómez"
            help="Quien firma el contrato a nombre de la inmobiliaria."
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Domicilio (dirección)"
            value={form.domicilio_direccion}
            onChange={(v) => onChange('domicilio_direccion', v)}
            placeholder="Ej. Calle 10 # 20-30 Of. 301"
            required
          />
          <Field
            label="Domicilio (ciudad)"
            value={form.domicilio_ciudad}
            onChange={(v) => onChange('domicilio_ciudad', v)}
            placeholder="Ej. Medellín, Antioquia"
            required
          />
        </div>

        {isInmobiliaria && (
          <Field
            label="Matrícula de arrendador"
            value={form.matricula_arrendador}
            onChange={(v) => onChange('matricula_arrendador', v)}
            placeholder="Ej. 12345"
            help="Número de matrícula expedido por la alcaldía. Solo aplica a inmobiliarias."
            required
          />
        )}

        {isInmobiliaria && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Matrícula expedida por"
              value={form.matricula_expedida_por}
              onChange={(v) => onChange('matricula_expedida_por', v)}
              placeholder="Ej. Cámara de Comercio de Medellín"
              help="Entidad que expidió la matrícula. Se imprime en el contrato."
            />
            <Field
              label="Fecha de expedición de la matrícula"
              type="date"
              value={form.matricula_fecha}
              onChange={(v) => onChange('matricula_fecha', v)}
              help="Fecha en que se expidió la matrícula. Se imprime en el contrato."
            />
          </div>
        )}
      </div>

      {/* Cuenta de recaudo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Cuenta de recaudo del canon</h3>
        <p className="text-sm text-gray-500 -mt-2">
          Datos donde el arrendatario debe consignar el canon mensual (parágrafo 1, cláusula CUARTA).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Banco"
            value={form.cuenta_recaudo_banco}
            onChange={(v) => onChange('cuenta_recaudo_banco', v)}
            placeholder="Ej. Bancolombia"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de cuenta<span className="text-coral-500"> *</span>
            </label>
            <select
              value={form.cuenta_recaudo_tipo ?? ''}
              onChange={(e) =>
                onChange('cuenta_recaudo_tipo', (e.target.value || null) as 'ahorros' | 'corriente' | null)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Seleccionar…</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
          <Field
            label="Número de cuenta"
            value={form.cuenta_recaudo_numero}
            onChange={(v) => onChange('cuenta_recaudo_numero', v)}
            placeholder="Ej. 1234567890"
            required
          />
          <Field
            label="Titular (nombre/razón social)"
            value={form.cuenta_recaudo_titular_nombre}
            onChange={(v) => onChange('cuenta_recaudo_titular_nombre', v)}
            placeholder="Ej. Inmobiliaria XYZ S.A.S."
            required
          />
          <Field
            label="Titular (NIT/CC)"
            value={form.cuenta_recaudo_titular_nit}
            onChange={(v) => onChange('cuenta_recaudo_titular_nit', v)}
            placeholder="Ej. 900123456-7"
            required
          />
        </div>
      </div>

      {/* WhatsApp del arrendador: firma + aviso de pagos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">WhatsApp del arrendador (firma y pagos)</h3>
        <p className="text-sm text-gray-500 -mt-2">
          A este WhatsApp <strong>te llega el enlace para firmar el contrato</strong> como arrendador.
          También es el canal donde el arrendatario te avisa de los pagos y que aparece impreso en el contrato.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <PhoneInput
              label="WhatsApp"
              required
              value={form.whatsapp_recaudo ?? ''}
              onChange={(v) => onChange('whatsapp_recaudo', v)}
              placeholder="300 123 4567"
            />
            <p className="mt-1 text-xs text-gray-500">
              Obligatorio. Aquí recibes el enlace de firma del contrato. Debe ser un WhatsApp real.
            </p>
          </div>
          <Field
            label="Email"
            type="email"
            value={form.email_recaudo}
            onChange={(v) => onChange('email_recaudo', v)}
            placeholder="recaudo@empresa.com"
            help="Para avisos de pago y respaldo de notificaciones."
            required
          />
        </div>
      </div>

      {/* Botón guardar — solo el titular (los miembros ven en modo lectura) */}
      {!soloLectura && (
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
            {saving ? 'Guardando…' : 'Guardar datos'}
          </button>
        </div>
      )}
      </fieldset>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string | null | undefined
  onChange: (v: string | null) => void
  placeholder?: string
  help?: string
  type?: string
  required?: boolean
}

function Field({ label, value, onChange, placeholder, help, type = 'text', required = false }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-coral-500"> *</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  )
}
