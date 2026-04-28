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
import { IconLoader, IconCheck, IconUpload, IconTrash } from '@/components/icons'

const ROL_LABELS: Record<string, string> = {
  inmobiliaria: 'Inmobiliaria',
  propietario: 'Propietario',
  administrador: 'Administrador',
}

export default function DatosContratoPage() {
  const { user } = useAuth()
  const isInmobiliaria = user?.rol === 'inmobiliaria'
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
          representante_legal: data.representante_legal,
          domicilio_direccion: data.domicilio_direccion,
          domicilio_ciudad: data.domicilio_ciudad,
          matricula_arrendador: data.matricula_arrendador,
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
    setSaving(true)
    try {
      const updated = await perfilArrendadorService.updateMe(form)
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
            label="Representante legal"
            value={form.representante_legal}
            onChange={(v) => onChange('representante_legal', v)}
            placeholder="Carlos Mario Vélez Cifuentes"
            help="Quien firma el contrato a nombre de la inmobiliaria."
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Domicilio (dirección)"
            value={form.domicilio_direccion}
            onChange={(v) => onChange('domicilio_direccion', v)}
            placeholder="Calle 129 Sur 50 33 Oficina 301"
          />
          <Field
            label="Domicilio (ciudad)"
            value={form.domicilio_ciudad}
            onChange={(v) => onChange('domicilio_ciudad', v)}
            placeholder="Caldas, Antioquia"
          />
        </div>

        {isInmobiliaria && (
          <Field
            label="Matrícula de arrendador"
            value={form.matricula_arrendador}
            onChange={(v) => onChange('matricula_arrendador', v)}
            placeholder="0732"
            help="Número de matrícula expedido por la alcaldía. Solo aplica a inmobiliarias."
          />
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
            placeholder="Bancolombia"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
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
            placeholder="54102865025"
          />
          <Field
            label="Titular (nombre/razón social)"
            value={form.cuenta_recaudo_titular_nombre}
            onChange={(v) => onChange('cuenta_recaudo_titular_nombre', v)}
            placeholder={perfil.razon_social ?? `${perfil.nombre} ${perfil.apellido}`.trim()}
          />
          <Field
            label="Titular (NIT/CC)"
            value={form.cuenta_recaudo_titular_nit}
            onChange={(v) => onChange('cuenta_recaudo_titular_nit', v)}
            placeholder="901312029-0"
          />
        </div>
      </div>

      {/* Contacto para notificación de pagos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Notificación de pagos</h3>
        <p className="text-sm text-gray-500 -mt-2">
          El arrendatario te notificará cuando haga el pago. Estos canales aparecen en el contrato.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="WhatsApp"
            value={form.whatsapp_recaudo}
            onChange={(v) => onChange('whatsapp_recaudo', v)}
            placeholder="+57 301 597 6919"
          />
          <Field
            label="Email"
            type="email"
            value={form.email_recaudo}
            onChange={(v) => onChange('email_recaudo', v)}
            placeholder="recaudo@empresa.com"
          />
        </div>
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
          {saving ? 'Guardando…' : 'Guardar datos'}
        </button>
      </div>
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
}

function Field({ label, value, onChange, placeholder, help, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
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
