/**
 * AutorizacionSection — Estado de autorizacion habeas data en el expediente
 * 4 estados visuales: sin autorizacion, pendiente, autorizado, revocado/expirado
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { IconShield, IconMail, IconCheck, IconClock, IconLoader, IconAlertTriangle } from '@/components/icons'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { autorizacionService } from '@/services/autorizacionService'
import type { IAutorizacion } from '@/types/autorizacion'

interface AutorizacionSectionProps {
  expedienteId: string
  /** Contacto registrado del solicitante — se muestra como destino del enlace
   *  y es corregible antes de (re)enviar. Opcionales para tolerar contextos
   *  donde el padre aún no los tiene. */
  solicitanteEmail?: string | null
  solicitanteTelefono?: string | null
  /** Refresca el expediente padre cuando el contacto del solicitante cambió. */
  onContactoActualizado?: () => void
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const METODO_LABELS: Record<string, string> = {
  canvas: 'Firma manuscrita digital',
  otp: 'Verificación por código OTP',
}

export function AutorizacionSection({
  expedienteId,
  solicitanteEmail,
  solicitanteTelefono,
  onContactoActualizado,
}: AutorizacionSectionProps) {
  const [autorizacion, setAutorizacion] = useState<IAutorizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showRevocar, setShowRevocar] = useState(false)
  const [revocarMotivo, setRevocarMotivo] = useState('')
  const [revocando, setRevocando] = useState(false)
  // Detalle de la firma: evidencia legal y texto literal firmado (colapsables).
  const [showEvidencia, setShowEvidencia] = useState(false)
  const [showTexto, setShowTexto] = useState(false)
  // Corrección del contacto destino antes de (re)enviar el enlace. Antes la
  // card ni mostraba a dónde se enviaba — con el dato mal escrito, reenviar
  // era inútil y no había forma de arreglarlo.
  const [editContacto, setEditContacto] = useState(false)
  const [emailEdit, setEmailEdit] = useState('')
  const [telEdit, setTelEdit] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const data = await autorizacionService.getStatus(expedienteId)
      setAutorizacion(data)
    } catch {
      // silent — section just won't show data
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleEnviarEnlace = async () => {
    // Overrides de contacto (solo si el gestor está corrigiendo y difieren).
    let contacto: { email?: string; telefono?: string } | undefined
    if (editContacto) {
      const emailNuevo = emailEdit.trim().toLowerCase()
      if (!emailNuevo || !/.+@.+\..+/.test(emailNuevo)) {
        toast.error('Ingresa un correo válido para enviar el enlace')
        return
      }
      const telDigits = telEdit.replace(/\D/g, '').replace(/^57/, '')
      contacto = {
        ...(emailNuevo !== (solicitanteEmail ?? '').toLowerCase() ? { email: emailNuevo } : {}),
        ...(telDigits.length >= 7 && telEdit !== (solicitanteTelefono ?? '')
          ? { telefono: telEdit }
          : {}),
      }
      if (!contacto.email && !contacto.telefono) contacto = undefined
    }
    setSending(true)
    try {
      const result = await autorizacionService.enviarEnlace(expedienteId, contacto)
      toast.success('Enlace de autorizacion enviado al arrendatario')
      setAutorizacion({
        id: result.id,
        estado: 'pendiente',
        canal: 'enlace',
        metodo_firma: null,
        autorizado_en: null,
        hash_documento: null,
        fecha_revocacion: null,
        motivo_revocacion: null,
        token_expiracion: result.token_expiracion,
        created_at: new Date().toISOString(),
      })
      if (contacto) {
        setEditContacto(false)
        onContactoActualizado?.()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar enlace'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  // Bloque compartido "a dónde se envía" + corrección — visible en todos los
  // estados que ofrecen (re)enviar el enlace.
  const contactoDestino = (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      {!editContacto ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-gray-600">
            Se enviará a{' '}
            <span className="font-medium text-gray-800">{solicitanteEmail || 'correo no registrado'}</span>
            {solicitanteTelefono && (
              <>
                {' '}y WhatsApp <span className="font-medium text-gray-800">{solicitanteTelefono}</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setEmailEdit(solicitanteEmail ?? '')
              setTelEdit(solicitanteTelefono ?? '')
              setEditContacto(true)
            }}
            className="text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            Corregir contacto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Correo</label>
              <input
                type="email"
                value={emailEdit}
                onChange={(e) => setEmailEdit(e.target.value)}
                disabled={sending}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              />
            </div>
            <PhoneInput
              label="WhatsApp (opcional)"
              value={telEdit}
              onChange={setTelEdit}
              placeholder="300 123 4567"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500">
              Al enviar, el contacto corregido se guarda también en los datos del solicitante.
            </p>
            <button
              type="button"
              onClick={() => setEditContacto(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Cancelar corrección
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const handleRevocar = async () => {
    if (revocarMotivo.length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres')
      return
    }
    setRevocando(true)
    try {
      await autorizacionService.revocar(expedienteId, { motivo: revocarMotivo })
      toast.success('Autorización revocada')
      setShowRevocar(false)
      setRevocarMotivo('')
      fetchStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al revocar'
      toast.error(msg)
    } finally {
      setRevocando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <IconLoader size={16} className="animate-spin" />
          <span className="text-sm">Cargando autorizacion...</span>
        </div>
      </div>
    )
  }

  const estado = autorizacion?.estado

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconShield size={20} className="text-primary-600" />
          <h3 className="text-base font-semibold text-gray-900">Autorización Habeas Data</h3>
        </div>
        {estado && <Badge estado={estado} />}
      </div>

      {/* Sin autorizacion */}
      {!autorizacion && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            El arrendatario debe autorizar la consulta en centrales de riesgo antes de crear un estudio.
          </p>
          {contactoDestino}
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar autorizacion al arrendatario
          </button>
        </div>
      )}

      {/* Pendiente */}
      {estado === 'pendiente' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <IconClock size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Esperando firma del arrendatario</p>
              <p className="text-xs text-yellow-600 mt-1">
                Enlace enviado el {formatDate(autorizacion?.created_at)}.
                {autorizacion?.token_expiracion && (
                  <> Expira el {formatDate(autorizacion.token_expiracion)}.</>
                )}
              </p>
            </div>
          </div>
          {contactoDestino}
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Reenviar enlace
          </button>
        </div>
      )}

      {/* Autorizado */}
      {estado === 'autorizado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <IconCheck size={18} className="text-green-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-800">
                Autorizado el {formatDate(autorizacion?.autorizado_en)}
              </p>
              {autorizacion?.metodo_firma && (
                <p className="text-xs text-green-600">
                  Metodo: {METODO_LABELS[autorizacion.metodo_firma] || autorizacion.metodo_firma}
                </p>
              )}
              {autorizacion?.hash_documento && (
                <p className="text-xs text-green-600 font-mono truncate max-w-xs" title={autorizacion.hash_documento}>
                  Hash: {autorizacion.hash_documento.slice(0, 16)}...
                </p>
              )}
            </div>
          </div>

          {/* Consentimientos del solicitante: los 3 obligatorios van implícitos
              en la firma; los 3 opcionales quedan tal como él los eligió. */}
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Consentimientos otorgados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {[
                { txt: 'Tratamiento de datos personales', on: true, oblig: true },
                { txt: 'Consulta y reporte a centrales de riesgo', on: true, oblig: true },
                { txt: 'Historial de comportamiento de pago', on: true, oblig: true },
                { txt: 'Analítica y personalización', on: !!autorizacion?.consent_analitica, oblig: false },
                { txt: 'Ofertas y comunicaciones comerciales', on: !!autorizacion?.consent_comercial, oblig: false },
                { txt: 'Historial como referencia ante terceros', on: !!autorizacion?.consent_historial_referencia, oblig: false },
              ].map((c) => (
                <div key={c.txt} className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1.5 ${c.on ? 'text-gray-800' : 'text-gray-400'}`}>
                    <IconCheck size={14} className={c.on ? 'text-green-600' : 'text-gray-300'} />
                    {c.txt}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase ${c.oblig ? 'text-gray-400' : c.on ? 'text-green-600' : 'text-gray-400'}`}>
                    {c.oblig ? 'Obligatorio' : c.on ? 'Aceptado' : 'No aceptado'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Evidencia legal de la firma (colapsable) */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowEvidencia((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2"><IconShield size={14} /> Evidencia de la firma</span>
              <span className="text-xs text-gray-400">{showEvidencia ? 'Ocultar' : 'Ver'}</span>
            </button>
            {showEvidencia && (
              <dl className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <dt className="text-gray-500">Método</dt>
                  <dd className="text-gray-900 font-medium">{METODO_LABELS[autorizacion?.metodo_firma || ''] || autorizacion?.metodo_firma || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Versión de términos</dt>
                  <dd className="text-gray-900 font-medium">{autorizacion?.version_terminos || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Dirección IP</dt>
                  <dd className="text-gray-900 font-mono">{autorizacion?.ip_autorizacion || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Dispositivo (user-agent)</dt>
                  <dd className="text-gray-900 break-all">{autorizacion?.user_agent || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Hash SHA-256 del documento</dt>
                  <dd className="text-gray-900 font-mono break-all select-all">{autorizacion?.hash_documento || '—'}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Texto legal literal que el solicitante firmó */}
          {autorizacion?.texto_autorizado && (
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowTexto((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>Texto de la autorización firmada</span>
                <span className="text-xs text-gray-400">{showTexto ? 'Ocultar' : 'Ver'}</span>
              </button>
              {showTexto && (
                <div className="px-4 pb-4 max-h-72 overflow-y-auto">
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{autorizacion.texto_autorizado}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowRevocar(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
          >
            <IconAlertTriangle size={14} />
            Revocar autorizacion
          </button>

          {/* Revocar dialog */}
          {showRevocar && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-red-800">Motivo de revocacion:</p>
              <textarea
                value={revocarMotivo}
                onChange={(e) => setRevocarMotivo(e.target.value)}
                placeholder="Ingresa el motivo de la revocación (mín. 10 caracteres)"
                rows={3}
                className="w-full rounded-lg border border-red-300 p-2 text-sm focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRevocar}
                  disabled={revocando || revocarMotivo.length < 10}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {revocando && <IconLoader size={14} className="animate-spin" />}
                  Confirmar revocación
                </button>
                <button
                  onClick={() => { setShowRevocar(false); setRevocarMotivo('') }}
                  className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revocado */}
      {estado === 'revocado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <IconAlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Autorización revocada</p>
              {autorizacion?.motivo_revocacion && (
                <p className="text-xs text-red-600 mt-1">Motivo: {autorizacion.motivo_revocacion}</p>
              )}
              <p className="text-xs text-red-500 mt-1">
                Revocada el {formatDate(autorizacion?.fecha_revocacion)}
              </p>
            </div>
          </div>
          {contactoDestino}
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar nueva autorizacion
          </button>
        </div>
      )}

      {/* Expirado */}
      {estado === 'expirado' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <IconClock size={18} className="text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">El enlace de autorizacion ha expirado</p>
              <p className="text-xs text-gray-500 mt-1">
                Enviado el {formatDate(autorizacion?.created_at)}
              </p>
            </div>
          </div>
          {contactoDestino}
          <button
            onClick={handleEnviarEnlace}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin" />
            ) : (
              <IconMail size={16} />
            )}
            Enviar nueva autorizacion
          </button>
        </div>
      )}
    </div>
  )
}
