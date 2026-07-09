/**
 * EnviarFirmaPreviewModal (tarea 4.3) — pre-chequeo antes de enviar a firma.
 *
 * Muestra los firmantes derivados del expediente con el número al que le llega
 * SU código (OTP) por WhatsApp, y bloquea el envío si dos firmantes comparten
 * número o si a alguno le faltan datos. Así el gestor ve, ANTES de enviar, a
 * qué firmante corresponde cada celular (evita la confusión del reporte 4.3).
 *
 * Además permite CORREGIR el teléfono en línea (arrendatario → ficha del
 * solicitante; arrendador → WhatsApp de recaudo de la inmobiliaria) sin salir
 * del modal, y re-valida al vuelo vía onFirmanteUpdated.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconX, IconLoader, IconWhatsapp, IconAlertTriangle, IconUser, IconBuilding2, IconShieldCheck, IconPencil, IconCheck } from '@/components/icons'
import { solicitanteService } from '@/services/solicitanteService'
import { perfilArrendadorService } from '@/services/perfilArrendadorService'
import type { IFirmantePreview, RolFirmante } from '@/types/firma'

const ROL_META: Record<RolFirmante, { label: string; icon: typeof IconUser }> = {
  arrendatario: { label: 'Arrendatario', icon: IconUser },
  arrendador: { label: 'Arrendador', icon: IconBuilding2 },
  cofianza: { label: 'Cofianza', icon: IconShieldCheck },
}

interface Props {
  isOpen: boolean
  firmantes: IFirmantePreview[]
  puedeEnviar: boolean
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
  /** Se llama tras guardar un teléfono en línea para que el padre vuelva a
   *  pedir el preview (re-validar repetidos/faltantes). Si no se pasa, la
   *  edición en línea no se ofrece. */
  onFirmanteUpdated?: () => void | Promise<void>
}

export function EnviarFirmaPreviewModal({ isOpen, firmantes, puedeEnviar, submitting, onConfirm, onClose, onFirmanteUpdated }: Props) {
  const [editingRol, setEditingRol] = useState<RolFirmante | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingRol, setSavingRol] = useState<RolFirmante | null>(null)

  if (!isOpen) return null

  // Un firmante es editable en línea si el backend indicó su origen y no es
  // autofirma (Cofianza no tiene número). Requiere onFirmanteUpdated para
  // re-validar tras guardar.
  const esEditable = (f: IFirmantePreview) => !f.auto && !!f.origen && !!onFirmanteUpdated

  function abrirEdicion(f: IFirmantePreview) {
    setEditingRol(f.rol_firmante)
    setEditValue(f.telefono ?? '')
  }

  async function guardarTelefono(f: IFirmantePreview) {
    const nuevo = editValue.trim()
    if (!nuevo) {
      toast.error('Ingresa un número de WhatsApp')
      return
    }
    setSavingRol(f.rol_firmante)
    try {
      if (f.origen === 'solicitante' && f.origen_id) {
        await solicitanteService.updateSolicitante(f.origen_id, { telefono: nuevo })
      } else if (f.origen === 'arrendador') {
        await perfilArrendadorService.updateMe({ whatsapp_recaudo: nuevo })
      } else {
        toast.error('Este firmante no se puede editar desde aquí')
        return
      }
      toast.success('Teléfono actualizado')
      setEditingRol(null)
      await onFirmanteUpdated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el teléfono')
    } finally {
      setSavingRol(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Enviar a firma</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Cada parte recibe <strong>su propio</strong> código de firma por WhatsApp en el número indicado.
            Verifica a quién le llega cada uno antes de enviar.
          </p>

          {!puedeEnviar && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                No se puede enviar todavía: hay firmantes con el <strong>mismo número</strong> o con datos
                faltantes. Cada parte necesita un número de WhatsApp distinto. Corrige el teléfono con el
                botón de editar de cada firmante y vuelve a intentar.
              </span>
            </div>
          )}

          <ul className="space-y-2">
            {firmantes.map((f) => {
              const meta = ROL_META[f.rol_firmante]
              const Icon = meta?.icon ?? IconUser
              const problema = f.duplicado || f.falta_datos
              const editable = esEditable(f)
              const editando = editingRol === f.rol_firmante
              const guardando = savingRol === f.rol_firmante
              return (
                <li
                  key={f.rol_firmante}
                  className={`rounded-lg border px-3 py-2 ${problema ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 ${problema ? 'text-red-500' : 'text-gray-400'}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {meta?.label ?? f.rol_firmante}
                          <span className="font-normal text-gray-500"> · {f.nombre}</span>
                        </p>
                        {f.auto ? (
                          <p className="text-xs text-gray-400">Firma automática (sello institucional) — no requiere número</p>
                        ) : (
                          <p className={`text-xs flex items-center gap-1 truncate ${problema ? 'text-red-700' : 'text-gray-500'}`}>
                            <IconWhatsapp size={11} className="text-green-600 shrink-0" />
                            <span className="truncate">
                              {f.telefono ? <>Su código llega a <span className="font-medium">{f.telefono}</span></> : 'Sin teléfono'}
                              {f.duplicado && ' · repetido'}
                              {f.falta_datos && !f.telefono && ' · falta teléfono'}
                              {f.falta_datos && f.telefono && !f.email && ' · falta correo'}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    {editable && !editando && (
                      <button
                        onClick={() => abrirEdicion(f)}
                        disabled={submitting}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                      >
                        <IconPencil size={13} />
                        Editar
                      </button>
                    )}
                  </div>

                  {editable && editando && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="+57 300 000 0000"
                          autoFocus
                          disabled={guardando}
                          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
                        />
                        <button
                          onClick={() => guardarTelefono(f)}
                          disabled={guardando}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                          {guardando ? <IconLoader size={13} className="animate-spin" /> : <IconCheck size={13} />}
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingRol(null)}
                          disabled={guardando}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                      {f.origen === 'arrendador' && (
                        <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-600">
                          <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
                          <span>
                            Este es el WhatsApp de recaudo de la inmobiliaria: se usa en todos tus
                            contratos y avisos, no solo en esta firma.
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || !puedeEnviar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            title={!puedeEnviar ? 'Corrige los números repetidos o faltantes antes de enviar' : undefined}
          >
            {submitting && <IconLoader size={16} className="animate-spin" />}
            {submitting ? 'Enviando…' : 'Confirmar y enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
