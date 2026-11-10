/**
 * SustitucionesEstudio — personas del estudio: cuántos cambios lleva, qué se
 * puede hacer ahora (sustituir, retirar, pagar, cargar a la persona nueva) y
 * el historial. Todo lo decide y lo redacta la API: los valores, el máximo de
 * cambios y los textos llegan en sus respuestas.
 */

'use client'

import { useState } from 'react'
import { IconExternalLink, IconHistory, IconLoader, IconRefresh, IconUsers, IconX } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { botonModal } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/constants'
import { useSustituciones } from '@/hooks/useSustituciones'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import type { ICotizacionSustitucion, PersonaQueSale } from '@/types/sustitucion'
import { CargarSolicitanteForm } from './CargarSolicitanteForm'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { SeccionPaso } from './TarjetaSiguientePaso'
import { SustituirPersonaModal } from './SustituirPersonaModal'

interface SustitucionesEstudioProps {
  estudioId: string
  expedienteId: string
  /** La API ya envió un resultado para este estudio: sin él no se consulta nada. */
  activo: boolean
  /** Puede hacer cambios (no es de solo lectura). */
  puedeEditar: boolean
  /** Se llama tras cada cambio, para refrescar el estudio. */
  onCambio?: () => void
}

export function SustitucionesEstudio({ estudioId, expedienteId, activo, puedeEditar, onCambio }: SustitucionesEstudioProps) {
  const version = useRefrescoExpediente()
  const { estado, cargando, error, ocupado, recargar, cotizar, crear, retirar, cancelar, cargarPersona, cargarSolicitante } = useSustituciones(estudioId, activo, version, onCambio)
  const [cotizacion, setCotizacion] = useState<ICotizacionSustitucion | null>(null)
  const [cotizando, setCotizando] = useState<PersonaQueSale['persona'] | null>(null)
  /** A quién se va a retirar por listas (el segundo firmante o el solicitante). */
  const [retiro, setRetiro] = useState<PersonaQueSale | null>(null)
  const [cancelarAbierto, setCancelarAbierto] = useState(false)

  if (!activo || cargando) return null
  if (error) {
    return (
      <SeccionPaso titulo="Personas del estudio">
        <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">No pudimos cargar los cambios de persona de este estudio.</p>
          <button type="button" onClick={recargar} className={botonModal('secondary')}>
            <IconRefresh size={16} aria-hidden="true" /> Reintentar
          </button>
        </div>
      </SeccionPaso>
    )
  }
  if (!estado) return null
  const { sustituciones, accion, accion_texto, persona, abierta, historial } = estado
  const solicitante = estado.solicitante ?? null
  // La consulta adicional por canon mayor no cambia a ninguna persona: se nombra aparte.
  const esConsulta = abierta?.motivo === 'reporte_vencido'
  const abiertaDelSolicitante = abierta?.persona === 'solicitante'
  // Sin nada que hacer ni que contar, la sección no aparece.
  if (!accion && !abierta && !accion_texto && !solicitante?.accion && !solicitante?.accion_texto && historial.length === 0) return null

  const abrirSustitucion = async (quien: PersonaQueSale['persona']) => {
    setCotizando(quien)
    const c = await cotizar(quien)
    setCotizando(null)
    if (c) setCotizacion(c)
  }
  const nombreRetiro = retiro?.persona === 'solicitante' ? solicitante?.persona?.nombre : persona?.nombre

  return (
    <SeccionPaso titulo="Personas del estudio" icono={<IconUsers size={16} />}>
      <div className="mt-2 space-y-3 text-sm">
        <p className="text-gray-600">
          Cambios de persona: <strong className="tabular-nums text-gray-900">{sustituciones.usadas}</strong> de{' '}
          <span className="tabular-nums">{sustituciones.maximo}</span>.
        </p>

        {solicitante && (solicitante.accion_texto || solicitante.accion) && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Solicitante</p>
            {solicitante.accion_texto && (puedeEditar || !solicitante.accion) && <p className="text-gray-700">{solicitante.accion_texto}</p>}
            {puedeEditar && solicitante.accion === 'sustituir' && solicitante.persona && (
              <button
                type="button"
                onClick={() => void abrirSustitucion('solicitante')}
                disabled={!!cotizando || ocupado}
                aria-busy={cotizando === 'solicitante' || undefined}
                className={botonModal(accion ? 'secondary' : 'primary', 'w-full sm:w-auto')}
              >
                {cotizando === 'solicitante' ? <IconLoader size={16} className="animate-spin" aria-hidden="true" /> : <IconUsers size={16} aria-hidden="true" />}
                {solicitante.persona.nombre && !solicitante.persona.ya_salio ? `Cambiar a ${solicitante.persona.nombre}` : 'Cargar a otro solicitante'}
              </button>
            )}
            {puedeEditar && solicitante.accion === 'retirar_por_listas' && solicitante.persona && (
              <button type="button" onClick={() => setRetiro({ persona: 'solicitante' })} disabled={ocupado} className={botonModal('primary', 'w-full sm:w-auto')}>
                <IconX size={16} aria-hidden="true" />
                {solicitante.persona.nombre ? `Retirar a ${solicitante.persona.nombre}` : 'Retirar al solicitante'}
              </button>
            )}
          </div>
        )}

        {(accion_texto || accion) && solicitante && <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Segundo firmante</p>}
        {accion_texto && (puedeEditar || !accion) && <p className="text-gray-700">{accion_texto}</p>}

        {puedeEditar && accion === 'sustituir' && persona && (
          <button type="button" onClick={() => void abrirSustitucion('coarrendatario')} disabled={!!cotizando || ocupado} aria-busy={cotizando === 'coarrendatario' || undefined} className={botonModal('primary', 'w-full sm:w-auto')}>
            {cotizando === 'coarrendatario' ? <IconLoader size={16} className="animate-spin" aria-hidden="true" /> : <IconUsers size={16} aria-hidden="true" />}
            {persona.nombre && !persona.ya_salio ? `Sustituir a ${persona.nombre}` : 'Cargar a otra persona'}
          </button>
        )}

        {puedeEditar && accion === 'retirar_por_listas' && persona && (
          <button type="button" onClick={() => setRetiro({ persona: 'coarrendatario', coarrendatario_id: persona.coarrendatario_id })} disabled={ocupado} className={botonModal('primary', 'w-full sm:w-auto')}>
            <IconX size={16} aria-hidden="true" />
            Retirar a {persona.nombre || 'esta persona'}
          </button>
        )}

        {abierta && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="font-medium text-gray-900">
              {esConsulta ? 'Consulta adicional en curso' : abiertaDelSolicitante ? 'Cambio del solicitante en curso' : 'Cambio en curso'}: {abierta.estado_texto}
            </p>
            {abierta.entra && <p className="text-gray-700">Persona cargada: {abierta.entra.nombre}. Su evaluación se hace cuando autorice.</p>}
            {abierta.url_pago && (
              <a href={abierta.url_pago} target="_blank" rel="noopener noreferrer" className={botonModal('primary', 'w-full sm:w-auto')}>
                <IconExternalLink size={16} aria-hidden="true" />
                Pagar la consulta adicional{abierta.total_cop ? ` (${formatCurrency(abierta.total_cop)})` : ''}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            )}
            {abierta.estado === 'pendiente_pago' && (
              <button type="button" onClick={recargar} className={botonModal('secondary', 'w-full sm:w-auto')}>
                <IconRefresh size={16} aria-hidden="true" />
                Ya pagué: actualizar
              </button>
            )}
            {puedeEditar && abierta.puede_cargar_persona && abiertaDelSolicitante && (
              <CargarSolicitanteForm nombreQueSale={solicitante?.persona?.nombre || null} cargar={(input) => cargarSolicitante(abierta.id, input)} />
            )}
            {puedeEditar && abierta.puede_cargar_persona && !abiertaDelSolicitante && (
              <CoarrendatarioInviteForm
                invitar={(input) => cargarPersona(expedienteId, abierta.id, input)}
                audience="gestor"
                condicionGestor
                personaNueva
                onInvited={recargar}
              />
            )}
            {/* Con el solicitante nuevo ya cargado, el estudio es de esa persona: el cambio no se cancela desde aquí. */}
            {puedeEditar && !(abiertaDelSolicitante && abierta.entra) && (
              <button type="button" onClick={() => setCancelarAbierto(true)} disabled={ocupado} className={botonModal('secondary', 'w-full sm:w-auto')}>
                {esConsulta ? 'Cancelar la consulta adicional' : 'Cancelar este cambio'}
              </button>
            )}
          </div>
        )}

        {historial.length > 0 && (
          <details className="rounded-lg border border-gray-200">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              <IconHistory size={16} aria-hidden="true" />
              Historial de cambios ({historial.length})
            </summary>
            <ul className="divide-y divide-gray-100 border-t border-gray-200">
              {historial.map((h) => (
                <li key={h.id} className="px-3 py-2">
                  <p className="text-gray-900">
                    {h.sale
                      ? `${h.estado === 'retirada' ? 'Retiro de' : 'Cambio de'} ${h.sale.nombre || 'una persona'}${h.sale.persona === 'solicitante' ? ' (solicitante)' : ''}`
                      : h.motivo_texto}
                    {h.entra ? ` por ${h.entra.nombre}` : ''}
                  </p>
                  <p className="text-xs text-gray-600">
                    {h.sale ? `${h.motivo_texto} · ` : ''}
                    {h.estado_texto} · {formatDate(h.created_at)}
                    {h.cuenta_limite ? '' : ' · no cuenta como cambio'}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {cotizacion && <SustituirPersonaModal isOpen onClose={() => setCotizacion(null)} cotizacion={cotizacion} onConfirmar={crear} />}

      <ConfirmDialog
        isOpen={!!retiro}
        onClose={() => setRetiro(null)}
        onConfirm={async () => {
          if (retiro) await retirar(retiro)
          setRetiro(null)
        }}
        title={nombreRetiro ? `Retirar a ${nombreRetiro}` : retiro?.persona === 'solicitante' ? 'Retirar al solicitante' : 'Retirar a esta persona'}
        message={
          retiro?.persona === 'solicitante'
            ? 'La persona saldrá del estudio y sus enlaces dejarán de servir. Dejará de ver el estudio cuando usted cargue a otra persona como solicitante. El retiro no tiene costo ni cuenta como cambio de persona.'
            : 'La persona saldrá del estudio y el estudio se decidirá de nuevo con quien queda. El retiro no tiene costo ni cuenta como cambio de persona.'
        }
        confirmLabel="Retirar"
        isLoading={ocupado}
      />

      <ConfirmDialog
        isOpen={cancelarAbierto}
        onClose={() => setCancelarAbierto(false)}
        onConfirm={async () => {
          if (abierta) await cancelar(abierta.id)
        }}
        title={esConsulta ? 'Cancelar la consulta adicional' : 'Cancelar el cambio de persona'}
        message={
          esConsulta
            ? abierta?.estado === 'pagada'
              ? 'La consulta adicional se cancela y Cofianza le devuelve el pago a quien pagó.'
              : 'La consulta adicional se cancela y su enlace de pago deja de servir.'
            : abiertaDelSolicitante
              ? `${
                  abierta?.estado === 'pagada' && abierta.requiere_pago
                    ? 'El cambio del solicitante se cancela y Cofianza le devuelve el pago a quien pagó.'
                    : abierta?.requiere_pago
                      ? 'El cambio del solicitante se cancela y su enlace de pago deja de servir.'
                      : 'El cambio del solicitante se cancela.'
                } ${abierta?.motivo === 'listas' ? 'Podrá abrir otro para cargar a otra persona como solicitante.' : 'El solicitante actual sigue en el estudio.'}`
              : abierta?.estado === 'pagada' && abierta.requiere_pago
              ? 'El cambio se cancela y Cofianza le devuelve el pago a quien pagó. Si ya cargó a la persona nueva, su invitación queda sin efecto y el estudio queda sin segundo firmante: la persona anterior no regresa.'
              : abierta?.requiere_pago
                ? 'El cambio se cancela y su enlace de pago deja de servir.'
                : 'El cambio de persona se cancela. Si ya cargó a la persona nueva, su invitación queda sin efecto.'
        }
        confirmLabel={esConsulta ? 'Cancelar la consulta' : 'Cancelar el cambio'}
        cancelLabel="Volver"
        variant="danger"
        isLoading={ocupado}
      />
    </SeccionPaso>
  )
}
