/**
 * EnviarFirmaPreviewModal (tarea 4.3) — pre-chequeo antes de enviar a firma.
 *
 * Muestra los firmantes derivados del expediente con el número al que le llega
 * SU código de firma por WhatsApp, y bloquea el envío si dos firmantes comparten
 * número o si a alguno le faltan datos. Así el gestor ve, ANTES de enviar, a
 * qué firmante corresponde cada celular (evita la confusión del reporte 4.3).
 *
 * Además permite CORREGIR el teléfono en línea (arrendatario → ficha del
 * solicitante; arrendador → WhatsApp de recaudo de la inmobiliaria) sin salir
 * del modal, y re-valida al vuelo vía onFirmanteUpdated.
 */

'use client'

import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader, IconWhatsapp, IconAlertTriangle, IconUser, IconBuilding2, IconShieldCheck, IconPencil, IconCheck } from '@/components/icons'
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
  /** Adenda 2 §9: primero va el correo de verificación de identidad al arrendatario. */
  biometria?: boolean
  submitting: boolean
  onConfirm: () => void
  onClose: () => void
  /** Se llama tras guardar un teléfono en línea para que el padre vuelva a
   *  pedir el preview (re-validar repetidos/faltantes). Si no se pasa, la
   *  edición en línea no se ofrece. */
  onFirmanteUpdated?: () => void | Promise<void>
}

export function EnviarFirmaPreviewModal({ isOpen, firmantes, puedeEnviar, biometria, submitting, onConfirm, onClose, onFirmanteUpdated }: Props) {
  const [editingRol, setEditingRol] = useState<RolFirmante | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingRol, setSavingRol] = useState<RolFirmante | null>(null)
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null)

  if (!isOpen) return null

  // Un firmante es editable en línea si el backend indicó su origen y no es
  // autofirma (Cofianza no tiene número). Requiere onFirmanteUpdated para
  // re-validar tras guardar.
  const esEditable = (f: IFirmantePreview) => !f.auto && !!f.origen && !!onFirmanteUpdated

  function abrirEdicion(f: IFirmantePreview) {
    setEditingRol(f.rol_firmante)
    setEditValue(f.telefono ?? '')
    setErrorEdicion(null)
  }

  async function guardarTelefono(f: IFirmantePreview) {
    const nuevo = editValue.trim()
    if (!nuevo) {
      setErrorEdicion('Escriba un número de WhatsApp.')
      return
    }
    setErrorEdicion(null)
    setSavingRol(f.rol_firmante)
    try {
      if (f.origen === 'solicitante' && f.origen_id) {
        await solicitanteService.updateSolicitante(f.origen_id, { telefono: nuevo })
      } else if (f.origen === 'arrendador') {
        await perfilArrendadorService.updateMe({ whatsapp_recaudo: nuevo })
      } else {
        setErrorEdicion('Este firmante no se puede editar desde aquí.')
        return
      }
      // El API regenera el borrador al enviar (contratos.service, enviarContratoAFirma).
      toast.success('Teléfono actualizado. Al enviar, el contrato se actualiza con este número.')
      setEditingRol(null)
      await onFirmanteUpdated?.()
    } catch (err) {
      setErrorEdicion(err instanceof Error ? err.message : 'No se pudo actualizar el teléfono. Intente de nuevo.')
    } finally {
      setSavingRol(null)
    }
  }

  function handleClose() {
    if (submitting || savingRol) return
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar a firma"
      description={
        <>
          Cada parte recibe <strong>su propio</strong> código de firma por WhatsApp en el número indicado.
          Verifique a quién le llega cada uno antes de enviar.
        </>
      }
      size="md"
      footer={
        <ModalAcciones>
          <button type="button" onClick={handleClose} disabled={submitting} className={botonModal('secondary')}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || !puedeEnviar || !!savingRol}
            aria-busy={submitting || undefined}
            aria-describedby={!puedeEnviar ? 'enviar-firma-bloqueo' : undefined}
            className={botonModal('primary')}
          >
            {submitting && <IconLoader size={16} className="animate-spin" />}
            {submitting ? 'Enviando…' : 'Confirmar y enviar'}
          </button>
        </ModalAcciones>
      }
    >
      <div className="space-y-4">
        {biometria && (
          <p className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
            Antes de firmar, al arrendatario le llega un <strong>correo para confirmar su identidad</strong>. El
            contrato sale a firma apenas lo haga.
          </p>
        )}

        {!puedeEnviar && (
          <div id="enviar-firma-bloqueo" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Todavía no se puede enviar: hay firmantes con el <strong>mismo número</strong>, con el
              <strong> mismo correo</strong> o con datos faltantes. Cada parte necesita un número de WhatsApp
              y un correo distintos. Corrija el teléfono con «Editar» en cada firmante (el correo, en la
              ficha del solicitante o en «Datos para contrato») y vuelva a intentar.
            </span>
          </div>
        )}

        <ul className="space-y-2" aria-label="Firmantes">
          {firmantes.map((f) => {
            const meta = ROL_META[f.rol_firmante]
            const Icon = meta?.icon ?? IconUser
            const problema = f.duplicado || f.correo_duplicado || f.falta_datos
            const editable = esEditable(f)
            const editando = editingRol === f.rol_firmante
            const guardando = savingRol === f.rol_firmante
            const marcas = [
              f.duplicado && 'número repetido',
              f.correo_duplicado && 'correo repetido',
              f.falta_datos && !f.telefono && 'falta teléfono',
              f.falta_datos && f.telefono && !f.email && 'falta correo',
            ].filter(Boolean) as string[]
            const inputId = `enviar-firma-tel-${f.rol_firmante}`
            return (
              <li
                key={f.rol_firmante}
                className={`rounded-lg border px-3 py-2.5 ${problema ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${problema ? 'text-red-600' : 'text-gray-500'}`} aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {meta?.label ?? f.rol_firmante}
                        <span className="font-normal text-gray-600"> · {f.nombre}</span>
                      </p>
                      {f.auto ? (
                        <p className="text-xs text-gray-600">Firma automática con sello institucional; no necesita número.</p>
                      ) : (
                        <p className={`mt-0.5 flex items-start gap-1 text-xs ${problema ? 'text-red-700' : 'text-gray-600'}`}>
                          <IconWhatsapp size={12} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />
                          <span className="min-w-0 break-words">
                            {f.telefono ? <>Su código llega a <span className="font-medium tabular-nums">{f.telefono}</span></> : 'Sin teléfono'}
                            {marcas.length > 0 && <span className="font-medium"> · {marcas.join(' · ')}</span>}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  {editable && !editando && (
                    <button
                      type="button"
                      onClick={() => abrirEdicion(f)}
                      disabled={submitting || !!savingRol}
                      aria-label={`Editar el teléfono de ${meta?.label ?? f.rol_firmante}`}
                      className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                    >
                      <IconPencil size={14} aria-hidden="true" />
                      Editar
                    </button>
                  )}
                </div>

                {/* Sin «Editar» (el API solo se lo da al titular de ese perfil):
                    decir quién lo corrige en vez de dejar la marca sin salida. */}
                {f.rol_firmante === 'arrendador' && !editable && problema && (
                  <p className="mt-1.5 text-xs text-gray-600">
                    Lo corrige el titular de la inmobiliaria o el propietario en «Datos para contrato».
                  </p>
                )}

                {editable && editando && (
                  <div className="mt-2.5">
                    <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-700">
                      Nuevo número de WhatsApp
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id={inputId}
                        type="tel"
                        value={editValue}
                        onChange={(e) => { setEditValue(e.target.value); setErrorEdicion(null) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (!guardando) void guardarTelefono(f)
                          }
                        }}
                        placeholder="+57 300 000 0000"
                        autoFocus
                        autoComplete="tel"
                        disabled={guardando}
                        aria-invalid={errorEdicion ? true : undefined}
                        aria-describedby={errorEdicion ? `${inputId}-error` : undefined}
                        className="min-h-10 min-w-0 flex-1 basis-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingRol(null)}
                        disabled={guardando}
                        className={botonModal('secondary', 'text-sm')}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => guardarTelefono(f)}
                        disabled={guardando}
                        aria-busy={guardando || undefined}
                        className={botonModal('secondary', 'text-primary-700')}
                      >
                        {guardando ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                        {guardando ? 'Guardando…' : 'Guardar número'}
                      </button>
                    </div>
                    {errorEdicion && (
                      <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-red-700">{errorEdicion}</p>
                    )}
                    {f.origen === 'arrendador' && (
                      <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-800">
                        <IconAlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          Este es el WhatsApp de recaudo de la inmobiliaria: se usa en todos sus
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
    </Modal>
  )
}
