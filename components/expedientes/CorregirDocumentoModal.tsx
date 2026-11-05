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
import { Modal, ModalAcciones, botonModal } from '@/components/ui/Modal'
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
  /** Reenvía el enlace desde el aviso de éxito (la corrección vence el anterior). */
  onReenviar?: () => void
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
  onReenviar,
}: Props) {
  const conNombre = nombreActual !== undefined
  const [nombre, setNombre] = useState(nombreActual ?? '')
  const [apellido, setApellido] = useState(apellidoActual ?? '')
  const [tipo, setTipo] = useState<string>(() => (TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc'))
  const [numero, setNumero] = useState('')
  const [fuente, setFuente] = useState<FuenteVerificacion | ''>('')
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const reiniciarYCerrar = () => {
    setTipo(TIPOS.some((t) => t.value === tipoActual) ? tipoActual! : 'cc')
    setNumero('')
    setNombre(nombreActual ?? '')
    setApellido(apellidoActual ?? '')
    setFuente('')
    setConfirmar(false)
    onClose()
  }
  // Con el guardado en curso, la X, Escape y Cancelar no cierran: daría a entender que se canceló.
  const cerrar = () => {
    if (guardando) return
    reiniciarYCerrar()
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
        onReenviar ? { duration: 10000, action: { label: 'Reenviar enlace', onClick: onReenviar } } : undefined,
      )
      window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
      reiniciarYCerrar()
      onCorregido?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron corregir los datos.')
      // El límite cerró el estudio: refrescar para que se vea.
      if (err instanceof ApiClientError && err.code === 'LIMITE_CORRECCIONES_DOCUMENTO') {
        window.dispatchEvent(new Event(EVENTO_BLOQUEOS))
        reiniciarYCerrar()
        onCorregido?.()
      }
    } finally {
      setGuardando(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido || guardando) return
    // La última corrección del documento y la que pasa el límite se confirman aparte.
    if (cambiaDoc && restantes != null && restantes <= 1) setConfirmar(true)
    else void guardar()
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !confirmar}
        onClose={cerrar}
        title="Corregir datos del prospecto"
        description="Verifique los datos con el prospecto antes de corregirlos: si la persona es otra, cree un estudio nuevo."
        size="md"
        closeOnBackdrop={false}
        footer={
          <div className="space-y-2">
            {!valido && (
              <p id="corregir-falta" role="status" className="text-sm text-gray-600">
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
            <ModalAcciones>
              <button type="button" onClick={cerrar} disabled={guardando} className={botonModal('secondary')}>
                Cancelar
              </button>
              <button
                type="submit"
                form="corregir-documento-form"
                disabled={guardando || !valido}
                aria-busy={guardando || undefined}
                aria-describedby={!valido ? 'corregir-falta' : undefined}
                className={botonModal('primary')}
              >
                {guardando && <IconLoader size={16} className="animate-spin" />}
                Guardar corrección
              </button>
            </ModalAcciones>
          </div>
        }
      >
        <form id="corregir-documento-form" onSubmit={onSubmit} className="space-y-5" noValidate>
          {conNombre && (
            <section className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="corregir-nombre" className="mb-1 block text-sm font-medium text-gray-700">
                    Nombres
                  </label>
                  <input
                    id="corregir-nombre"
                    autoComplete="off"
                    value={nombre}
                    maxLength={100}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={guardando}
                    aria-describedby="corregir-nombre-ayuda"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="corregir-apellido" className="mb-1 block text-sm font-medium text-gray-700">
                    Apellidos
                  </label>
                  <input
                    id="corregir-apellido"
                    autoComplete="off"
                    value={apellido}
                    maxLength={100}
                    onChange={(e) => setApellido(e.target.value)}
                    disabled={guardando}
                    aria-describedby="corregir-nombre-ayuda"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <p id="corregir-nombre-ayuda" className="text-xs text-gray-600">
                Escríbalos tal como aparecen en la cédula: las centrales de riesgo cotejan el apellido.
              </p>
            </section>
          )}

          <section className="space-y-3">
            <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <dt className="text-sm text-gray-600">Documento registrado</dt>
              <dd className="font-mono text-sm font-semibold text-gray-900">{documento(tipoActual || '', numeroActual || '—')}</dd>
            </dl>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label htmlFor="corregir-doc-tipo" className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de documento
                </label>
                <select
                  id="corregir-doc-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={guardando || sinCorreccionesDoc}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="corregir-doc-numero" className="mb-1 block text-sm font-medium text-gray-700">
                  Número correcto <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <input
                  id="corregir-doc-numero"
                  inputMode={tipo === 'pasaporte' ? 'text' : 'numeric'}
                  autoComplete="off"
                  value={numero}
                  maxLength={20}
                  onChange={(e) => setNumero(e.target.value.replace(/[^\w]/g, ''))}
                  disabled={guardando || sinCorreccionesDoc}
                  aria-describedby="corregir-doc-ayuda"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </div>
            </div>
            <div id="corregir-doc-ayuda" className="space-y-1 text-xs text-gray-600">
              <p>
                {sinCorreccionesDoc
                  ? 'Ya usó todas las correcciones del documento en este estudio: aquí solo puede corregir el nombre.'
                  : conNombre
                    ? 'Si el documento está bien, deje el número vacío.'
                    : 'Escriba el documento correcto.'}
                {restantes != null && restantes > 0 && (
                  <>
                    {' '}
                    {restantes === 1 ? 'Le queda 1 corrección del documento.' : `Le quedan ${restantes} correcciones del documento.`}
                    {conNombre && ' Corregir solo el nombre no gasta corrección.'}
                  </>
                )}
              </p>
              <p>
                Si el prospecto tiene un enlace vigente, dejará de funcionar: después de corregir tendrá que reenviárselo,
                y ese reenvío cuenta dentro de los permitidos.
              </p>
            </div>
          </section>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              ¿Contra qué verificó los datos? <span className="text-red-600" aria-hidden="true">*</span>
            </legend>
            <div className="space-y-2">
              {FUENTES.map((f) => (
                <label
                  key={f.value}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    fuente === f.value ? 'border-primary-500 bg-primary-50 text-gray-900' : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="corregir-doc-fuente"
                    value={f.value}
                    checked={fuente === f.value}
                    onChange={() => setFuente(f.value)}
                    disabled={guardando}
                    required
                    className="h-4 w-4 shrink-0 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
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
