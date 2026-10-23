/**
 * BLQ §3: corrección CIEGA del documento del prospecto. Muestra solo lo que
 * registró la inmobiliaria y el campo nuevo; lo que digitó el prospecto nunca
 * llega a la web (§3.2). Exige la fuente contra la que se verificó (§3.4). No
 * reenvía el enlace: es otro paso (§4.4).
 *
 * Reunión con Gerencia 23-oct: también corrige el nombre mal escrito (lo
 * escribió el gestor, no es ciego). Corregir solo el nombre no gasta
 * corrección; el documento vacío queda como está.
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { IconLoader } from '@/components/icons'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { autorizacionService } from '@/services/autorizacionService'
import { ApiClientError } from '@/lib/api'
import type { FuenteVerificacion } from '@/types/autorizacion'
import { EVENTO_BLOQUEOS } from './BloqueosPendientesBanner'
// Los mismos tipos con los que se registra al prospecto (sin NIT: Adenda de precios §6.1).
import { TIPO_DOCUMENTO_OPTIONS as TIPOS } from './wizard/constants'
import { documento } from '@/components/contratos/v3/campos'

const FUENTES: { value: FuenteVerificacion; label: string }[] = [
  { value: 'documento_fisico', label: 'Documento físico' },
  { value: 'copia_documento', label: 'Copia del documento' },
  { value: 'confirmacion_telefonica', label: 'Confirmación telefónica con el prospecto' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  expedienteId: string
  tipoActual?: string | null
  numeroActual?: string | null
  /** Sin nombre (undefined): solo se corrige el documento. */
  nombreActual?: string | null
  apellidoActual?: string | null
  /** null/undefined = la API no lo pudo contar (o es anterior al bloque 2). */
  correccionesRestantes?: number | null
  onCorregido?: () => void
}

export function CorregirDocumentoModal({
  isOpen,
  onClose,
  expedienteId,
  tipoActual,
  numeroActual,
  nombreActual,
  apellidoActual,
  correccionesRestantes,
  onCorregido,
}: Props) {
  const conNombre = nombreActual !== undefined
  const [nombre, setNombre] = useState(nombreActual ?? '')
  const [apellido, setApellido] = useState(apellidoActual ?? '')
  const [tipo, setTipo] = useState<string>(() => (TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc'))
  const [numero, setNumero] = useState('')
  const [fuente, setFuente] = useState<FuenteVerificacion | ''>('')
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    setTipo(TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc')
    setNumero('')
    setNombre(nombreActual ?? '')
    setApellido(apellidoActual ?? '')
    setFuente('')
    setConfirmar(false)
    onClose()
  }

  const restantes = correccionesRestantes ?? null
  const sinCorreccionesDoc = restantes === 0
  const cambiaNombre =
    conNombre && (nombre.trim() !== (nombreActual ?? '').trim() || apellido.trim() !== (apellidoActual ?? '').trim())
  // Cambiar solo el tipo también es corregir el documento: exige el número.
  const tipoInicial = TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc'
  const cambiaDoc = numero.trim().length > 0 || tipo !== tipoInicial
  const docValido = !cambiaDoc || numero.trim().length >= 5
  // Solo se exige si se cambia el nombre (una ficha vieja sin apellido no bloquea corregir el documento).
  const nombreCompleto = !cambiaNombre || (!!nombre.trim() && !!apellido.trim())
  const valido = !!fuente && (cambiaNombre || cambiaDoc) && docValido && nombreCompleto

  const guardar = async () => {
    if (!fuente) return
    setGuardando(true)
    try {
      const r = await autorizacionService.corregirDocumento(expedienteId, {
        ...(cambiaDoc ? { tipo_documento: tipo, numero_documento: numero.trim() } : {}),
        ...(cambiaNombre ? { nombre: nombre.trim(), apellido: apellido.trim() } : {}),
        fuente_verificacion: fuente,
      })
      toast.success(
        `Datos corregidos. Ahora reenvíe el enlace al prospecto.${
          !cambiaDoc
            ? ''
            : r.correcciones_restantes === 0
            ? ' Ya no le quedan correcciones: si vuelve a fallar, deberá crear un estudio nuevo.'
            : r.correcciones_restantes === 1
              ? ' Le queda 1 corrección.'
              : ` Le quedan ${r.correcciones_restantes} correcciones.`
        }`,
      )
      window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
      cerrar()
      onCorregido?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron corregir los datos.')
      // El límite cerró el estudio: refrescar para que se vea.
      if (err instanceof ApiClientError && err.code === 'LIMITE_CORRECCIONES_DOCUMENTO') {
        window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
        cerrar()
        onCorregido?.()
      }
    } finally {
      setGuardando(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    // La última corrección del documento y la que pasa el límite se confirman aparte.
    if (cambiaDoc && restantes != null && restantes <= 1) setConfirmar(true)
    else void guardar()
  }

  return (
    <>
      <Modal isOpen={isOpen && !confirmar} onClose={cerrar} title={conNombre ? 'Corregir datos del prospecto' : 'Corregir documento'} size="md" closeOnBackdrop={false}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {conNombre && (
          <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="corregir-nombre" className="mb-1 block text-xs font-medium text-gray-600">
                Nombres
              </label>
              <input
                id="corregir-nombre"
                autoComplete="off"
                value={nombre}
                maxLength={100}
                onChange={(e) => setNombre(e.target.value)}
                disabled={guardando}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="corregir-apellido" className="mb-1 block text-xs font-medium text-gray-600">
                Apellidos
              </label>
              <input
                id="corregir-apellido"
                autoComplete="off"
                value={apellido}
                maxLength={100}
                onChange={(e) => setApellido(e.target.value)}
                disabled={guardando}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Escríbalos tal como aparecen en la cédula: las centrales de riesgo cotejan el apellido.
          </p>
          </>
          )}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="text-xs text-gray-500">Documento registrado</p>
            <p className="font-mono font-semibold text-gray-900">
              {documento(tipoActual || '', numeroActual || '—')}
            </p>
          </div>
          <p className="text-xs text-gray-600">
            {sinCorreccionesDoc
              ? 'Ya usó todas las correcciones del documento en este estudio: aquí solo puede corregir el nombre.'
              : conNombre
                ? 'Si el documento está bien, deje el número vacío. Verifíquelo con el prospecto antes de corregirlo: si la persona es otra, cree un estudio nuevo.'
                : 'Verifique el documento con el prospecto antes de corregirlo: si la persona es otra, cree un estudio nuevo.'}
          </p>
          <p className="text-xs text-gray-600">
            Si el prospecto tiene un enlace vigente, dejará de funcionar: después de corregir tendrá que reenviárselo,
            y ese reenvío cuenta dentro de los permitidos.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <label htmlFor="corregir-doc-tipo" className="mb-1 block text-xs font-medium text-gray-600">
                Tipo de documento
              </label>
              <select
                id="corregir-doc-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled={guardando || sinCorreccionesDoc}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="corregir-doc-numero" className="mb-1 block text-xs font-medium text-gray-600">
                Número correcto <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                id="corregir-doc-numero"
                inputMode={tipo === 'pasaporte' ? 'text' : 'numeric'}
                autoComplete="off"
                value={numero}
                maxLength={20}
                onChange={(e) => setNumero(e.target.value.replace(/[^\w]/g, ''))}
                disabled={guardando || sinCorreccionesDoc}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-gray-600">¿Contra qué verificó los datos?</legend>
            <div className="space-y-1.5">
              {FUENTES.map((f) => (
                <label key={f.value} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="corregir-doc-fuente"
                    value={f.value}
                    checked={fuente === f.value}
                    onChange={() => setFuente(f.value)}
                    disabled={guardando}
                    required
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
          {restantes != null && restantes > 0 && (
            <p className="text-xs text-gray-600">
              {restantes === 1 ? 'Le queda 1 corrección del documento.' : `Le quedan ${restantes} correcciones del documento.`}{' '}
              {conNombre && 'Corregir solo el nombre no gasta corrección.'}
            </p>
          )}
          {!valido && (
            <p className="text-xs text-gray-500">
              {!nombreCompleto
                ? 'Escriba nombres y apellidos.'
                : !docValido
                  ? 'El número de documento debe tener al menos 5 caracteres.'
                  : !cambiaNombre && !cambiaDoc
                    ? !conNombre
                      ? 'Escriba el documento correcto.'
                      : sinCorreccionesDoc
                        ? 'Cambie el nombre.'
                        : 'Cambie el nombre o escriba el documento correcto.'
                    : 'Elija contra qué verificó los datos.'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !valido}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {guardando && <IconLoader size={14} className="animate-spin" />}
              Guardar corrección
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={isOpen && confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={guardar}
        variant={restantes === 0 ? 'danger' : 'default'}
        title={restantes === 0 ? 'Se cerrará el estudio' : 'Última corrección'}
        message={
          restantes === 0
            ? 'Ya usó todas las correcciones del documento. Si continúa, el estudio se cerrará y deberá crear uno nuevo.'
            : 'Es la última corrección permitida. Si el documento vuelve a quedar mal, no podrá corregirlo otra vez y deberá crear un estudio nuevo.'
        }
        confirmLabel={restantes === 0 ? 'Cerrar el estudio' : 'Guardar corrección'}
      />
    </>
  )
}
