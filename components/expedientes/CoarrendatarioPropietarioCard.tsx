/**
 * CoarrendatarioPropietarioCard — visible para propietario / inmobiliaria /
 * administrador / operador_analista en el resumen del expediente.
 *
 * Muestra a quién invitó el solicitante, en qué estado está la invitación y,
 * si el estudio del coarrendatario ya terminó, su resultado y score.
 *
 * Visibilidad:
 *   - Aparece desde estado='condicionado' en adelante (también en
 *     'aprobado' y 'rechazado' para que quede el rastro de quién acompañó).
 *   - Sin coarrendatario, el formulario para invitarlo solo si el API abre la
 *     ventana: en revisión o, desde la Decisión 2 (2026-09-25), aprobado antes
 *     del contrato; nunca en el canal del propietario directo
 *     (Decisión 4). Si no, no se muestra.
 *   - Adenda 3 V2 §6.1: también antes de la decisión del titular, si el API
 *     abre la ventana (coarrendatario desde el inicio).
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { toast } from 'sonner'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario, type IVentanaCoarrendatario } from '@/services/coarrendatarioService'
import { estudioService } from '@/services/estudioService'
import { EstudioDetailModal } from './EstudioDetailModal'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { cn } from '@/lib/utils'
import {
  TEXTO_ENLACE_VENCIDO_REAPERTURA,
  cierreDelEstudio,
  comoSePresento,
  insigniaPersona,
  papelEnElEstudio,
  personaA5dUsable,
  tonoPersonaA5d,
  type CierreEstudio,
} from '@/lib/personaEstudio'
import { CoarrendatarioReenviarInvitacion } from './CoarrendatarioReenviarInvitacion'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import type { IEstudio } from '@/types/estudio'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { IconEye, IconInfo, IconLoader, IconRefresh, IconUsers } from '@/components/icons'
import { TarjetaSiguientePaso, SeccionPaso, type TonoPaso } from './TarjetaSiguientePaso'
import { textoVisible, esRolInterno, tipoFallo } from './textoVisible'
import { CONTACTO_COFIANZA_TEXTO } from './ContactoCofianzaInline'
import { sinEscribanos } from './ContratoSegundoFirmanteAviso'

interface CoarrendatarioPropietarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  /**
   * Se dispara cuando el estudio del coarrendatario COMPLETA: la ponderación
   * del backend puede haber movido el expediente a aprobado/rechazado solo,
   * y sin refrescar al padre la página seguiría ofreciendo "Aprobar
   * expediente" sobre un estado que ya no existe (400 al pulsarlo).
   */
  onEstudioCompletado?: () => void
  /** Aprobado con la condición de sumar un coarrendatario: invitarlo es lo que falta (botón principal). */
  conCondicion?: boolean
  /** El estudio espera un segundo firmante («aprobado con segundo firmante» o la condición de coarrendatario). */
  pideSegundoFirmante?: boolean
  /** En qué quedó el estudio (para el detalle de la evaluación). Sin el dato, se deduce de `expedienteEstado`. */
  cierre?: CierreEstudio
  /**
   * El estudio no aprobable se reabrió por el cambio de persona (`reapertura_abierta`): cancelar la invitación o
   * dejar vencer el enlace cierra el cambio y lo devuelve a no aprobable.
   */
  reaperturaAbierta?: boolean
  /** Tras cancelar la invitación con la reapertura abierta, el estudio cambia: la página recarga el expediente. */
  onExpedienteCambio?: () => void
}

/** Antes de que se decida al titular (Adenda 3 V2 §6.1). */
const PREVIOS_A_LA_DECISION = ['borrador', 'en_revision', 'informacion_incompleta']

/** La insignia de la persona con el color del tono de la tarjeta. */
const INSIGNIA_TONO: Record<TonoPaso, string> = {
  accion: 'border-primary-300 text-primary-900',
  revision: 'border-amber-300 text-amber-900',
  alerta: 'border-red-300 text-red-800',
  neutro: 'border-gray-300 text-gray-700',
}

const TIPO_DOC_LABEL: Record<string, string> = {
  cc: 'CC',
  ce: 'CE',
  ppt: 'PPT',
  pep: 'PEP',
  ti: 'TI',
  pasaporte: 'Pasaporte',
  nit: 'NIT',
}

export function CoarrendatarioPropietarioCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onEstudioCompletado,
  conCondicion = false,
  pideSegundoFirmante = false,
  cierre: cierreProp,
  reaperturaAbierta = false,
  onExpedienteCambio,
}: CoarrendatarioPropietarioCardProps) {
  const cierre = cierreProp !== undefined ? cierreProp : cierreDelEstudio(expedienteEstado)
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)
  // Primera carga fallida: sin esto se ofrecía invitar aunque ya hubiera uno.
  const [errorCarga, setErrorCarga] = useState(false)
  const [estudioFull, setEstudioFull] = useState<IEstudio | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Gerencia y el miembro 'solo_lectura' entran aquí con rol 'inmobiliaria':
  // ven la card (es lectura) pero no las acciones, que el API les niega.
  const puedeEditar = usePuedeEditar()

  const coaLoadedRef = useRef(false)
  // Detecta la transición a estudio completado UNA vez, para avisar al padre.
  const estudioCompletadoNotificadoRef = useRef(false)
  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      const primeraCarga = !coaLoadedRef.current
      setCoa(data)
      coaLoadedRef.current = true
      setErrorCarga(false)
      if (data?.estudio?.estado === 'completado' && !estudioCompletadoNotificadoRef.current) {
        estudioCompletadoNotificadoRef.current = true
        // Solo si se completó MIENTRAS se miraba (polling). Si ya venía completado,
        // el padre ya tiene el dato: avisarle lo recargaba, esta tarjeta se volvía
        // a montar y avisaba otra vez → recargas sin fin.
        if (!primeraCarga) onEstudioCompletado?.()
      }
    } catch {
      // No borrar la card por un error transitorio del polling (502 / red
      // móvil): solo la dejamos en null si nunca llegó a cargar.
      if (!coaLoadedRef.current) {
        setCoa(null)
        setErrorCarga(true)
      }
    } finally {
      setLoading(false)
    }
  }, [expedienteId, onEstudioCompletado])

  useEffect(() => { fetchCoa() }, [fetchCoa, version])

  // Si se puede invitar y si la invitación sigue en pie (en revisión, o aprobado
  // antes del contrato). undefined = cargando; null = no se pudo leer (se cae a
  // la regla de antes: solo en revisión).
  const [ventana, setVentana] = useState<IVentanaCoarrendatario | null | undefined>(undefined)
  const fetchVentana = useCallback(() => {
    coarrendatarioService.getVentana(expedienteId).then(setVentana, () => setVentana(null))
  }, [expedienteId])
  const antesDeLaDecision = PREVIOS_A_LA_DECISION.includes(expedienteEstado)
  // También con el estudio ya resuelto: la ventana trae lo que la API dice de la
  // prima, que el aviso del coarrendatario evaluado necesita (ahí no se puede invitar).
  const ventanaAplica =
    expedienteEstado === 'condicionado' || expedienteEstado === 'aprobado' || expedienteEstado === 'rechazado' || expedienteEstado === 'cerrado' || antesDeLaDecision
  useEffect(() => {
    if (ventanaAplica) fetchVentana()
    else setVentana(null)
  }, [fetchVentana, version, ventanaAplica])
  const vigente = ventana?.vigente ?? expedienteEstado === 'condicionado'

  // Polling sutil mientras la invitación está pendiente o la evaluación en
  // proceso, para que el propietario vea el avance sin recargar. Una invitación
  // vencida ya no cambia sola (reenviarla llama a fetchCoa). La evaluación
  // 'fallido' sí se sigue mirando: el reintento se hace en otra tarjeta.
  // Con la pestaña oculta no se consulta.
  useEffect(() => {
    if (!coa) return
    const enEspera =
      (coa.estado === 'pendiente_aceptacion' && !invitacionVencida(coa) && vigente) ||
      (coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado')
    if (!enEspera) return
    const id = setInterval(() => { if (!document.hidden) fetchCoa() }, 8000)
    return () => clearInterval(id)
  }, [coa, fetchCoa, vigente])

  const esRolValido =
    userRol === 'propietario' ||
    userRol === 'inmobiliaria' ||
    userRol === 'administrador' ||
    userRol === 'operador_analista'

  // Canal del propietario directo: el motivo de la API. A Cofianza, sin «Escríbanos» (D4, 11-nov).
  const motivoCanal =
    ventana?.puede_invitar === false && ventana.codigo === 'COARRENDATARIO_CANAL_PROPIETARIO' && ventana.motivo
      ? esRolInterno(userRol)
        ? sinEscribanos(ventana.motivo)
        : ventana.motivo
      : null

  if (loading || ventana === undefined) return null
  if (!esRolValido) return null
  // Aparece de la fase 'condicionado' en adelante y, con el coarrendatario desde
  // el inicio (el API abre la ventana), también antes de decidir al titular.
  if (
    !(antesDeLaDecision && ventana?.vigente) &&
    expedienteEstado !== 'condicionado' &&
    expedienteEstado !== 'aprobado' &&
    expedienteEstado !== 'rechazado' &&
    expedienteEstado !== 'cerrado'
  ) {
    return null
  }
  // Sin coarrendatario aún: el gestor (inmobiliaria / propietario / admin /
  // operador) puede invitarlo directamente — útil cuando es la inmobiliaria la
  // que lleva el expediente. Solo con la ventana abierta (en revisión, o
  // aprobado antes del contrato); si no, no hay
  // nada que mostrar.
  if (!coa && errorCarga) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos cargar el coarrendatario de este estudio.</p>
        <button
          type="button"
          onClick={() => void fetchCoa()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }
  if (!coa) {
    // La API indica que cargar a esta persona pasa por un cambio de persona: se hace desde la
    // tarjeta de la evaluación («Personas del estudio»), donde se avisa el valor antes de confirmar.
    if (ventana?.cobra_consulta_adicional) return null
    // Propietario directo: la API no abre el segundo firmante (su contrato todavía no lo incluye). Se dice por
    // qué solo donde el estudio lo pide («aprobado con segundo firmante» o la condición), no en todo aprobado.
    if (motivoCanal && pideSegundoFirmante) {
      return (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 sm:p-5">
          <IconInfo size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">Segundo firmante (coarrendatario)</p>
            <p className="mt-0.5">{motivoCanal}</p>
          </div>
        </div>
      )
    }
    if (!(ventana?.puede_invitar ?? expedienteEstado === 'condicionado') || !puedeEditar) return null
    return (
      <CoarrendatarioInviteForm
        invitar={(input) => coarrendatarioService.invitar(expedienteId, input)}
        audience="gestor"
        aprobado={expedienteEstado === 'aprobado'}
        beneficioPrima={ventana?.beneficio_prima?.completo}
        antesDeLaDecision={antesDeLaDecision}
        condicionGestor={conCondicion}
        onInvited={() => { fetchCoa(); fetchVentana() }}
      />
    )
  }

  const handleVerDetalle = async () => {
    if (!coa.estudio_id) return
    setLoadingDetail(true)
    try {
      const full = await estudioService.getEstudioById(coa.estudio_id)
      setEstudioFull(full)
      setShowDetail(true)
    } catch {
      // Aqui no habia ni catch: el error subia y el boton quedaba girando.
      toast.error('No se pudo abrir el detalle de la evaluación. Intente de nuevo.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const tipoLabel = TIPO_DOC_LABEL[coa.tipo_documento] ?? coa.tipo_documento.toUpperCase()
  const fechaInvitacion = formatFecha(coa.created_at)
  const fechaAceptacion = coa.aceptado_at ? formatFecha(coa.aceptado_at) : null
  // Resultado del estudio: lo mostramos en cuanto el estudio embebido terminó
  // ('completado'), sin depender de que el campo coa.estado haya ganado la
  // carrera contra la transición del expediente.
  const estudioTerminado = coa.estudio && coa.estudio.estado === 'completado' ? coa.estudio : null
  // Adenda 5: el papel de la persona en el estudio, su etiqueta y su texto (lo redacta la API), como el panel
  // de la evaluación. Sin él (reporte de Gerencia, punto 4), esta tarjeta no repite un resultado que pueda
  // contradecir a ese panel: solo dice en qué va la invitación.
  const personaA5d = estudioTerminado ? personaA5dUsable(estudioTerminado.persona_a5d) : null
  const estado = estadoInvitacion(estudioTerminado ? { ...coa, estado: 'estudio_completado' } : coa, !vigente, antesDeLaDecision, reaperturaAbierta)
  const tonoA5d = personaA5d ? tonoPersonaA5d(personaA5d, { estudioAprobado: expedienteEstado === 'aprobado', cierre }) : null
  // Reapertura con el enlace vencido: el cambio se cerró; reenviar ya no sirve.
  const reenviable = !(reaperturaAbierta && invitacionVencida(coa))
  const tono: TonoPaso = !personaA5d
    ? estado.tono
    : tonoA5d === 'exito'
      ? 'accion'
      : tonoA5d === 'alerta'
        ? 'alerta'
        : tonoA5d
          ? 'neutro'
          : estudioTerminado?.resultado === 'aprobado'
            ? 'accion'
            : estudioTerminado?.resultado === 'condicionado'
              ? 'revision'
              : 'neutro'
  const papel = personaA5d ? papelEnElEstudio(personaA5d) : null
  const insignia = personaA5d ? insigniaPersona(personaA5d) : null
  const sePresento = personaA5d ? comoSePresento(personaA5d, true) : null
  const externo = !esRolInterno(userRol)

  return (
    <>
      <TarjetaSiguientePaso
        tono={tono}
        icono={<IconUsers size={18} />}
        titulo={
          personaA5d ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="min-w-0 break-words">
                {`${coa.nombre} ${coa.apellido}`.trim() || 'Coarrendatario'}
                {papel && ` · ${papel}`}
              </span>
              {insignia && <span className={cn('rounded-full border bg-white px-2 py-0.5 text-xs font-medium', INSIGNIA_TONO[tono])}>{insignia}</span>}
              <InfoTip texto={AYUDA.coarrendatario} lado="derecha" />
              {sePresento && <span className="basis-full text-xs font-normal text-gray-600">{sePresento}</span>}
            </span>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              <span>Coarrendatario: {estado.label}</span>
              <InfoTip texto={AYUDA.coarrendatario} lado="derecha" />
            </span>
          )
        }
        descripcion={<p>{personaA5d ? personaA5d.texto : estado.mensaje}</p>}
      >
        {/* Canal del propietario directo con un coarrendatario todavía en curso: la invitación ya no se puede
            aceptar y su evaluación no entra al contrato. Se dice por qué. */}
        {motivoCanal && coarrendatarioEnCurso(coa) && (
          <div role="status" className="flex items-start gap-2 border-b border-gray-100 px-4 py-3 text-sm text-gray-700 sm:px-5">
            <IconInfo size={16} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
            <span>{motivoCanal}</span>
          </div>
        )}

        {/* Datos del invitado */}
        <div className="px-4 py-4 sm:px-5">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <DatoCoa label="Nombre" value={`${coa.nombre} ${coa.apellido}`.trim()} />
            <DatoCoa label="Documento" value={`${tipoLabel} ${coa.numero_documento}`} />
            <DatoCoa label="Correo" value={coa.email} />
            <DatoCoa label="Teléfono" value={coa.telefono || '—'} />
            <DatoCoa label="Invitación enviada" value={fechaInvitacion} />
            {fechaAceptacion && <DatoCoa label="Aceptó el" value={fechaAceptacion} />}
          </dl>
        </div>

        {/* Resultado de la evaluación: puntaje, fecha, observaciones y el detalle. Solo con el estado de la persona
            que manda la API: sin él, el resultado lo dice el panel de la evaluación (un solo lugar). */}
        {estudioTerminado && personaA5d && (
          <SeccionPaso titulo="Resultado de la evaluación">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                {estudioTerminado.score !== null && estudioTerminado.score !== undefined && (
                  <p>
                    Puntaje de la central: <strong className="tabular-nums">{estudioTerminado.score}</strong>
                  </p>
                )}
                {estudioTerminado.fecha_completado && (
                  <p className="text-gray-600">Completado el {formatFecha(estudioTerminado.fecha_completado)}</p>
                )}
                {textoVisible(estudioTerminado.observaciones, { externo }) && (
                  <p className="whitespace-pre-wrap text-gray-600">
                    {textoVisible(estudioTerminado.observaciones, { externo })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleVerDetalle}
                disabled={loadingDetail}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
              >
                {loadingDetail ? <IconLoader size={16} className="animate-spin" /> : <IconEye size={16} />}
                {loadingDetail ? 'Cargando…' : 'Ver detalle'}
              </button>
            </div>
          </SeccionPaso>
        )}

        {/* Invitación pendiente: corregir y reenviar, o cancelar para invitar a
            otra persona (P4). Con la ventana cerrada ya no rige (P3). El key
            remonta el form cuando los datos guardados cambian. */}
        {coa.estado === 'pendiente_aceptacion' && puedeEditar && vigente && reenviable && (
          <div className="px-4 py-4 sm:px-5">
            <CoarrendatarioReenviarInvitacion
              key={coa.updated_at}
              expedienteId={expedienteId}
              coa={coa}
              reaperturaAbierta={reaperturaAbierta}
              onCambio={() => {
                void fetchCoa()
                // Cancelada con la reapertura abierta, el estudio vuelve a no aprobable: encabezado y banner también.
                if (reaperturaAbierta) onExpedienteCambio?.()
              }}
              embebido
            />
          </div>
        )}
      </TarjetaSiguientePaso>

      <EstudioDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        estudio={estudioFull}
        readOnly={userRol === 'propietario' || userRol === 'inmobiliaria'}
        cierre={cierre}
        estudioAprobado={expedienteEstado === 'aprobado'}
        solicitante={{
          nombre: coa.nombre,
          apellido: coa.apellido,
          tipo_documento: coa.tipo_documento,
          numero_documento: coa.numero_documento,
        }}
      />
    </>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────

function DatoCoa({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-gray-900" title={value}>{value}</dd>
    </div>
  )
}

/** En qué va la invitación: título y mensaje de la banda de la tarjeta. */
function estadoInvitacion(
  coa: ICoarrendatario,
  sinEfecto: boolean,
  antesDeLaDecision: boolean,
  /** Estudio reabierto por este cambio de persona (punto 5 del reporte). */
  reapertura = false,
): { tono: TonoPaso; label: string; mensaje: string } {
  const fallida = coa.estudio?.estado === 'fallido'
  const fallo = coa.estudio ? tipoFallo(coa.estudio) : 'tecnico'
  const cfg: Record<ICoarrendatario['estado'], { tono: TonoPaso; label: string; mensaje: string }> = {
    // P3: con el estudio ya decidido, la invitación pendiente ya no se puede aceptar.
    pendiente_aceptacion: sinEfecto
      ? {
          tono: 'neutro',
          label: 'Invitación sin efecto',
          mensaje: 'El estudio ya se resolvió sin coarrendatario, así que esta invitación ya no se puede aceptar.',
        }
      : invitacionVencida(coa)
      ? {
          tono: 'revision',
          label: 'Invitación vencida',
          mensaje: reapertura
            ? TEXTO_ENLACE_VENCIDO_REAPERTURA
            : `Venció el ${formatFecha(coa.token_expiracion)} sin respuesta y el enlace ya no sirve. Reenvíela para que le llegue uno nuevo.`,
        }
      : {
          tono: 'neutro',
          label: 'Esperando respuesta',
          mensaje: antesDeLaDecision
            ? 'La invitación fue enviada. Su evaluación corre apenas autorice (con el estudio pagado); si no lo va a hacer, cancele la invitación.'
            : 'La invitación fue enviada por correo. Cuando la persona acepte, dispararemos su evaluación crediticia.',
        },
    // Salió del estudio (cambio de persona): la API no la vuelve a mostrar; si llega, se dice sin motivo.
    retirado: {
      tono: 'neutro',
      label: 'Ya no hace parte del estudio',
      mensaje: 'Esta persona ya no hace parte del estudio.',
    },
    aceptado: {
      tono: fallida ? 'alerta' : 'neutro',
      label: 'Aceptó la invitación',
      // P2: sin evaluación terminada no entra al contrato ni al certificado.
      mensaje: fallida
        ? fallo !== 'tecnico'
          ? `Su evaluación no se completó: ${fallo === 'no_existe' ? 'la persona no aparece en la central consultada' : 'el primer apellido no coincide con el de la central'}. No es un rechazo; ${
              sinEfecto
                ? 'el estudio ya se resolvió sin él y no entra al contrato ni al certificado.'
                : fallo === 'no_existe'
                  ? `si el documento está mal escrito, comuníquese con Cofianza ${CONTACTO_COFIANZA_TEXTO} para corregirlo.`
                  : 'corrija el primer apellido y vuelva a consultar en la tarjeta «Evaluación del coarrendatario» del Resumen.'
            }`
          : sinEfecto
          ? 'Su evaluación falló por un problema técnico y el estudio ya se resolvió sin él: no entra al contrato ni al certificado.'
          : 'Su evaluación falló por un problema técnico (no es un rechazo). Mientras no se complete no entra al contrato ni al certificado. Reinténtela en la tarjeta «Evaluación del coarrendatario» de la evaluación crediticia.'
        : coa.estudio?.estado === 'en_proceso'
          ? 'Estamos consultando su historial en las centrales de riesgo. Le avisaremos cuando termine.'
          : coa.estudio?.estado === 'pago_pendiente'
          ? 'Autorizó. Su evaluación corre apenas el estudio esté pagado, y el estudio se decide con los dos.'
          : antesDeLaDecision
          ? 'Autorizó. Su evaluación está por correr, y el estudio se decide con los dos.'
          : 'Procesando su evaluación crediticia.',
    },
    rechazado_invitacion: {
      tono: 'alerta',
      label: 'Declinó la invitación',
      mensaje: 'La persona invitada declinó. El solicitante puede invitar a alguien más.',
    },
    estudio_completado: {
      tono: 'neutro',
      label: 'Evaluación completada',
      // El resultado va en un solo lugar (punto 4 del reporte): el panel de la evaluación del Resumen.
      mensaje: 'La evaluación del coarrendatario terminó. Su resultado está en la evaluación crediticia del estudio.',
    },
  }
  return cfg[coa.estado]
}

/** Cómo salió su evaluación, con las palabras de la Adenda 3 V2 §7: válido, en revisión o no califica. */
/** El enlace de la invitación expira (7 días); reenviarla renueva la fecha. */
/** Invitación viva o evaluación sin terminar. */
function coarrendatarioEnCurso(coa: ICoarrendatario): boolean {
  if (coa.estado === 'pendiente_aceptacion') return !invitacionVencida(coa)
  return coa.estado === 'aceptado' && coa.estudio?.estado !== 'completado'
}

function invitacionVencida(coa: ICoarrendatario): boolean {
  return coa.estado === 'pendiente_aceptacion' && new Date(coa.token_expiracion) < new Date()
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
