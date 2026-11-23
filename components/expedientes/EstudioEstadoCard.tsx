/**
 * EstudioEstadoCard — resumen del estado de la evaluación crediticia para
 * propietario/inmobiliaria/admin/operador en la pestaña Resumen del expediente.
 *
 * Auto-oculto cuando no hay estudio activo. Muestra estado + resultado +
 * proveedor + fecha y CTA al tab Estudios. Mismo patrón visual que la card
 * de cita y de contrato. Usa el marco común del Resumen (TarjetaSiguientePaso).
 *
 * Para el solicitante existe EstudioSolicitanteCard que es accionable
 * (formulario, polling, reintentos). Esta es solo informativa.
 */

'use client'

import { AYUDA } from '@/lib/ayudaEstudio'
import { InfoTip } from '@/components/ui/InfoTip'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { IconAlertTriangle, IconArrowRight, IconBuilding2, IconCheck, IconClock, IconRefresh, IconX } from '@/components/icons'
import { cn } from '@/lib/utils'
import { TarjetaSiguientePaso, SeccionPaso, type TonoPaso } from './TarjetaSiguientePaso'
import { documento } from '@/components/contratos/v3/campos'
import { CONTACTO_COFIANZA_TEXTO } from './ContactoCofianzaInline'
import { estudioService } from '@/services/estudioService'
import { contratoService } from '@/services/contratoService'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'
import { formatDate } from '@/lib/constants'
import {
  ReintentarEstudioForm,
  puedeRelanzarEstudio,
  esPendienteDeEjecutar,
} from './ReintentarEstudioForm'
import { ReasignarEstudioModal } from './ReasignarEstudioModal'
import { usePuedeEditar } from '@/hooks/usePuedeEditar'
import { TarifaEstudioBlock } from './TarifaEstudioBlock'
import type { IEstudio, EstadoEstudio } from '@/types/estudio'
import { useRefrescoExpediente } from '@/components/expedientes/ExpedienteRefresco'
import { motivoCoarrendatario, textoVisible, esRolInterno, tipoFallo, textoCondicionCoarrendatario, centralDefinida, partirObservaciones } from './textoVisible'
import { MotivosRevision } from './MotivosRevision'
import { MarcarRestitucionModal } from './MarcarRestitucionModal'
import { SustitucionesEstudio } from './SustitucionesEstudio'
import { MotivoDialog } from '@/components/ui/MotivoDialog'
import { useMarcaEstudio } from '@/hooks/useMarcaEstudio'
import {
  ROTULO_EN_ESPERA,
  ROTULO_SIN_EFECTO,
  SOLICITANTE_ANTERIOR,
  TEXTO_EN_ESPERA,
  cierreDelEstudio,
  comoSePresento,
  esSalidaDelEstudio,
  estaEnVerificacion,
  evaluacionDeOtroSolicitante,
  insigniaPersona,
  papelEnElEstudio,
  personaA5dUsable,
  noCalificaEnRojo,
  rotuloCoarrendatario,
  textoCoarrendatario,
  textoVerificacionAnalista,
  titularEstudioTerminado,
  tonoPersonaA5d,
  type CierreEstudio,
} from '@/lib/personaEstudio'

interface EstudioEstadoCardProps {
  expedienteId: string
  /** Callback para llevar al usuario a la pestaña Estudios. */
  onVerEstudios?: () => void
  /** Rol del usuario actual — para mostrar el botón "Reintentar consulta" a los
   *  gestores (inmobiliaria / propietario / admin / operador) cuando falló. */
  userRol?: string
  /** Datos del solicitante (persona evaluada) para mostrar nombre + cedula
   *  en la card. Viene del expediente padre — opcional para tolerar contextos
   *  donde aun no se cargo. */
  solicitante?: {
    nombre: string
    apellido: string
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
  /**
   * Inmueble actual del expediente. Solo lo necesita la reasignacion del §4.3,
   * para excluirlo de la lista de destinos. Opcional: sin el, la card se
   * comporta exactamente igual salvo que la lista incluye el actual (y la API
   * lo rechaza con "el expediente ya esta sobre esa propiedad").
   */
  inmuebleActualId?: string | null
  /** Se llama tras reasignar, para que el expediente se recargue. */
  onReasignado?: () => void
  /** Estudio sin propiedad: hasta qué canon queda aprobado (el botón pasa a «Vincular inmueble»). */
  canonAprobado?: number | null
  /** Estudio sin propiedad: destinación evaluada (vivienda o comercial). */
  destinacion?: string | null
  /**
   * false = la API no lo va a trasladar (estudio cerrado o rechazado, o ya
   * reservó el inmueble para su contrato): no se ofrece el botón.
   */
  reasignable?: boolean
  /**
   * P3 y Decisión 2: la evaluación fallida del coarrendatario se reintenta
   * mientras su invitación siga en pie (en revisión, o aprobado antes del
   * contrato), según `vigente` de GET /expedientes/:id/coarrendatario/ventana.
   */
  coarrendatarioVigente?: boolean
  /**
   * Estado del expediente: cerrado, el siguiente paso ya no es el contrato. La
   * decisión del analista sobre el condicionado llega en `decision_cofianza`.
   */
  expedienteEstado?: string
  /**
   * En qué quedó el estudio (no aprobable, cerrado después de estarlo, cerrado o en curso), para que lo que se
   * dice de cada persona no lo contradiga. Sin el dato, se deduce de `expedienteEstado`.
   */
  cierre?: CierreEstudio
  /** Reabierto por un reemplazo (`reapertura_abierta`): espera la evaluación de la persona nueva. */
  reaperturaAbierta?: boolean
  /** Con la reapertura: hasta cuándo debe autorizar la persona nueva (ISO, lo manda la API). */
  venceReapertura?: string | null
  /**
   * Un cambio de persona (cargar, cancelar, retirar) mueve el estado del estudio: la página recarga el
   * expediente para que el encabezado, el banner del rechazo y esta tarjeta digan lo mismo.
   */
  onExpedienteCambio?: () => void
}

// Mapeo estado → label legible. Los estados internos del flujo (pago_pendiente,
// pagado, autorizado, formulario_*, documentos_*) se agrupan para no saturar
// la card; el tab Estudios tiene el detalle fino.
export const ESTADO_LABEL: Record<EstadoEstudio, string> = {
  solicitado: 'Esperando autorización',
  pago_pendiente: 'Autorizado, esperando pago',
  pagado: 'Pagado',
  autorizado: 'Autorizado, pendiente formulario',
  formulario_enviado: 'Esperando datos del prospecto',
  formulario_completado: 'Formulario completado',
  documentos_cargados: 'Documentos cargados',
  en_proceso: 'Consultando las centrales de riesgo',
  completado: 'Completado',
  fallido: 'Consulta fallida',
  cancelado: 'Cancelado',
}

/** La reevaluación (estudio hijo) nace 'solicitado' y la decide un analista de Cofianza: no espera ninguna autorización. */
export function etiquetaEstado(estudio: Pick<IEstudio, 'estado' | 'estudio_padre_id'>): string {
  return estudio.estudio_padre_id && estudio.estado === 'solicitado'
    ? 'Reevaluación por decidir'
    : ESTADO_LABEL[estudio.estado] ?? estudio.estado
}

/**
 * El nombre del resultado de una evaluación: el mismo en esta tarjeta, la
 * pestaña Evaluación y el detalle. La decisión del analista sobre un
 * condicionado llega en `decision_cofianza` (el estudio sigue 'condicionado').
 *
 * `cierre`: con el estudio terminado, una evaluación que esperaba revisión o que
 * pasó no se nombra «En revisión», «Válido» ni «Aprobado» (reporte de Gerencia, punto 4).
 */
export function rotuloEvaluacion(e: IEstudio, esCoarrendatario = e.tipo === 'con_coarrendatario', cierre: CierreEstudio = null): string {
  // Adenda 5: la etiqueta de la persona (su papel en el estudio, o por qué no cuenta) la redacta la API.
  const persona = personaA5dUsable(e.persona_a5d)
  if (persona) return persona.etiqueta
  if (e.estado === 'completado') {
    // Adenda 3 V2 §7: el coarrendatario es válido o no califica; nunca «no aprobable».
    const coarrendatario = esCoarrendatario ? rotuloCoarrendatario(e.resultado, cierre) : null
    if (coarrendatario) return coarrendatario
    const terminado = esCoarrendatario ? null : titularEstudioTerminado(e, cierre)
    if (terminado) return terminado.rotulo
    // Con el resultado que envía la API, su nombre es el de ella (la web no lo redacta).
    if (!esCoarrendatario && e.desenlace && e.desenlace_texto) return e.desenlace_texto
    if (e.resultado === 'condicionado') {
      if (e.decision_cofianza === 'aprobado') return 'Aprobado'
      if (e.decision_cofianza === 'negado') return 'No aprobable'
      // Adenda 4 V3 §8: con la condición obligatoria, sin coarrendatario válido no se aprueba.
      if (e.condicion_coarrendatario) return e.condicion_coarrendatario.obligatoria ? 'Requiere coarrendatario' : 'Aprobado con condición'
      // U8: un nombre por situación, como la lista, la barra y las notificaciones.
      return 'En revisión de Cofianza'
    }
    if (e.resultado === 'aprobado') return 'Aprobado'
    if (e.resultado === 'rechazado') return 'No aprobable'
  }
  // Adenda 4 V3 §12: ya consultado, la decisión espera a que autorice el coarrendatario.
  if (e.estado === 'en_proceso' && e.espera_autorizacion) return 'Esperando al coarrendatario'
  return etiquetaEstado(e)
}

/** Color de la pastilla: el del resultado efectivo, para que «Aprobado» no salga en ámbar. */
export function colorEvaluacion(e: IEstudio, cierre: CierreEstudio = null, estudioAprobado = false): string {
  const persona = personaA5dUsable(e.persona_a5d)
  // Adenda 5: segundo firmante en verde; sin papel en gris, salvo cuando hay que actuar (rojo). Titular: su resultado.
  const tono = persona ? tonoPersonaA5d(persona, { estudioAprobado, cierre }) : null
  if (tono === 'exito') return 'aprobado'
  if (tono === 'alerta') return 'rechazado'
  if (tono === 'cerrada' || tono === 'neutro') return 'cancelado'
  if (!persona) {
    const rotulo = rotuloEvaluacion(e, undefined, cierre)
    if (rotulo === ROTULO_SIN_EFECTO) return 'cancelado'
    // «No califica» con el estudio aprobado o cerrado no bloquea nada: gris.
    if (rotulo === 'No califica' && !noCalificaEnRojo({ estudioAprobado, cierre })) return 'cancelado'
  }
  if (e.resultado === 'condicionado' && e.decision_cofianza === 'aprobado') return 'aprobado'
  if (e.resultado === 'condicionado' && e.decision_cofianza === 'negado') return 'rechazado'
  return e.resultado !== 'pendiente' ? e.resultado : e.estado
}

/**
 * Línea de listas restrictivas (verificación de antecedentes). El prospecto
 * nunca la ve (la API le manda `antecedentes: null`). Lenguaje claro para
 * todos: sin nombres de flags ni de proveedor. Cofianza ve qué quedó por
 * revisar; la inmobiliaria y el propietario, que lo revisa un analista.
 */
const HALLAZGO_ANTECEDENTES: Record<string, string> = {
  policia: 'Policía',
  procuraduria: 'Procuraduría',
  contraloria: 'Contraloría',
  interpol: 'Interpol',
  europol: 'Europol',
  banco_mundial: 'Banco Mundial',
  peps: 'persona expuesta políticamente',
  hallazgos_altos: 'hallazgos de nivel alto',
  nivel_alto: 'nivel de riesgo alto',
  registraduria_sin_informacion: 'Registraduría sin información',
  documento_no_vigente: 'documento no vigente',
  defuncion: 'registro de defunción',
  fuentes_con_error: 'fuentes que no respondieron',
}

/**
 * Línea de la verificación de antecedentes. El prospecto nunca la ve (la API
 * le manda `antecedentes: null`). Cofianza ve qué se encontró; la inmobiliaria
 * y el propietario, solo si hay algo que revisa un analista (sin nombres
 * técnicos ni el error del proveedor).
 */
function describirAntecedentes(a: NonNullable<IEstudio['antecedentes']>, esCofianza: boolean): string {
  if (a.estado === 'desactivado') return 'no consultadas'
  if (a.estado === 'no_verificado') return 'sin verificar: lo revisa un analista de Cofianza'
  if (a.reportado_en_listas) {
    const listas = [a.listas_vinculantes.ofac ? 'OFAC' : null, a.listas_vinculantes.onu ? 'ONU' : null].filter(Boolean).join(' y ')
    return esCofianza ? `reportado en ${listas}` : 'reportado en listas restrictivas'
  }
  if (a.flags_revision.length > 0) {
    return esCofianza
      ? `sin reporte en OFAC ni ONU; para revisar: ${a.flags_revision.map((f) => HALLAZGO_ANTECEDENTES[f] ?? f).join(', ')}`
      : 'sin reporte; hay hallazgos que revisa un analista de Cofianza'
  }
  return 'sin reporte'
}

/**
 * El motivo técnico de una verificación en listas que no se completó (lo
 * escribe la API en estudios/antecedentes.ts), en palabras y sin el nombre del
 * proveedor. Lo que no se reconoce cae en una frase general.
 */
export function motivoAntecedentesLegible(motivo: string): string {
  const m = motivo.toLowerCase()
  if (m.includes('no entrego el resultado') || m.includes('no termino la validacion')) return 'No se recibió el resultado de la verificación a tiempo.'
  if (m.includes('no respondio')) return 'El servicio de verificación no respondió a tiempo.'
  if (m.includes('tipo de documento')) return 'Este tipo de documento no se puede verificar en listas.'
  if (m.includes('sin numero de documento')) return 'Falta el número de documento: no se pudo verificar en listas.'
  if (m.includes('no pudo consultar las listas')) return 'No se pudieron consultar las listas restrictivas.'
  if (m.includes('no devolvio las listas')) return 'La verificación no devolvió el resultado de las listas.'
  if (m.includes('ilegible') || m.includes('sin bloque')) return 'La respuesta de la verificación llegó incompleta.'
  return 'No se pudo completar la verificación en listas.'
}

/**
 * Estados del titular antes de la consulta (esperan autorización o pago): lo
 * que hay que hacer ahí lo dicen la autorización y el pago, no esta tarjeta.
 */
const ESTADOS_EN_ESPERA: EstadoEstudio[] = ['solicitado', 'pago_pendiente', 'formulario_enviado']

const BURO_LABELS: Record<string, string> = {
  transunion: 'TransUnion',
  datacredito: 'DataCrédito',
  sifin: 'SIFIN',
}

const PUNTAJE_CENTRAL_AYUDA =
  'Lo da la central de riesgo consultada, de 0 a 999. No es el puntaje de Cofianza, que además mira ingresos, deudas y el canon.'

function getSiguientePaso(
  estudio: IEstudio,
  esCofianza: boolean,
  esCoarrendatario = false,
  /** Roles de Cofianza (también Gerencia): ven el nombre de la central. */
  verCentral = esCofianza,
  /** Puede reenviar o cancelar la invitación del coarrendatario (no Gerencia ni solo lectura). */
  puedeGestionar = false,
  /** El estudio terminó: ninguna evaluación dice que sigue o que la revisa un analista. */
  cierre: CierreEstudio = null,
): string {
  // Reunión con Gerencia 23-oct: a la inmobiliaria y al propietario no se les
  // dice en qué central se consultó («reserva del sumario»).
  const buro = (verCentral && BURO_LABELS[estudio.proveedor]) || 'la central de riesgo'

  // §12: "El prospecto no autoriza. El estudio expira transcurrido el plazo
  // definido. El solicitante puede reenviar la solicitud sin costo adicional
  // mientras no se haya ejecutado el motor." Va ANTES que todo lo demás: si el
  // plazo se venció, lo único accionable es reenviar, y decirle al gestor
  // "esperando al prospecto" cuando ya no va a responder lo deja esperando a él.
  // El reenvío es la tarjeta "Autorización" (AutorizacionSection), que vive en
  // el mismo tab Resumen: un segundo botón aquí sería el mismo envío dos veces.
  // Sin prometerlo aquí: según el bloqueo y el rol lo reenvía el equipo, solo
  // Cofianza o nadie (Gerencia, solo lectura); esa tarjeta dice cuál.
  if (estudio.expiracion?.expirado) {
    return estudio.expiracion.detenida
      ? 'El enlace de autorización se detuvo y la persona ya no puede firmarlo. No se consultó ninguna central de riesgo.'
      : 'La persona no autorizó dentro del plazo y el enlace venció. No se consultó ninguna central de riesgo.'
  }

  // Adenda 3 V2 §7, condicionado al estado del estudio (reporte de Gerencia, punto 4).
  if (estudio.estado === 'completado' && esCoarrendatario) return textoCoarrendatario(estudio.resultado, cierre)
  if (estudio.estado === 'completado') {
    // Estudio terminado: la evaluación que no lo negó (aprobada o en revisión) ya no lleva al contrato ni
    // la decide nadie. El resultado que envía la API y la condición del coarrendatario dicen lo suyo.
    const terminado = titularEstudioTerminado(estudio, cierre)
    if (terminado) return terminado.texto
    // Flujo §10: cuando la API manda la ruta, se le antepone su etiqueta
    // ("Aprobado automático (87 puntos)"). Cofianza ve el puntaje; la
    // inmobiliaria y el propietario la reciben sin él, y el prospecto sin
    // etiqueta (redacción por rol en la API).
    const etiqueta = estudio.ruta?.etiquetaGestor
    if (estudio.resultado === 'aprobado') {
      const base = 'Siguiente paso: crear el contrato.'
      return etiqueta ? `${etiqueta}. ${base}` : `Evaluación aprobada${verCentral ? ` por ${buro}` : ''}. ${base}`
    }
    // Adenda 2 §5: el condicionado lo decide solo un analista de Cofianza.
    if (estudio.resultado === 'condicionado') {
      if (estudio.decision_cofianza === 'aprobado') {
        return 'Aprobado por un analista de Cofianza en revisión manual. Siguiente paso: crear el contrato.'
      }
      if (estudio.decision_cofianza === 'negado') {
        return 'Un analista de Cofianza revisó el caso y no lo aprobó. El estudio no avanza al contrato.'
      }
      // Resultado que envía la API con su «qué hacer»: no está en revisión de un analista.
      if (estudio.desenlace === 'aprobado_segundo_firmante' || estudio.desenlace === 'bloqueado_listas') {
        return estudio.siguiente_accion_texto ?? ''
      }
      // Adenda 3 V2 §7: lo primero que tiene que hacer Cofianza.
      if (esCofianza && estudio.listas?.estado === 'por_confirmar') {
        return 'Coincidencia en listas restrictivas por confirmar. Ábrala en «Ver detalle» para confirmarla o descartarla antes de decidir.'
      }
      // Adenda 3 §6: aprobado con condición. No está en revisión del analista.
      // Con la obligatoria, si el coarrendatario califica decide un analista (Adenda 4 V3 §8).
      if (estudio.condicion_coarrendatario) {
        // Quien gestiona tiene arriba la tarjeta «qué sigue» con este mismo texto, el plazo y los pasos:
        // aquí se repetía palabra por palabra. Solo lectura no la ve: a ella se le deja el texto completo.
        if (!esCofianza && puedeGestionar && !esCoarrendatario && !estudio.condicion_coarrendatario.vencida) {
          return estudio.condicion_coarrendatario.obligatoria
            ? 'Requiere un coarrendatario para seguir. El plazo y qué pasa después están en «qué sigue», arriba.'
            : 'Aprobado con la condición de sumar un coarrendatario. El plazo y qué pasa después están en «qué sigue», arriba.'
        }
        const texto = textoCondicionCoarrendatario(estudio.condicion_coarrendatario)
        return esCofianza && !estudio.condicion_coarrendatario.vencida && !estudio.condicion_coarrendatario.obligatoria
          ? `${texto} No requiere decisión del analista mientras la condición esté vigente.`
          : texto
      }
      return esCofianza
        ? 'Revise el motivo y decida si lo aprueba.'
        : 'En revisión: la decide un analista de Cofianza.'
    }
    if (estudio.resultado === 'rechazado') return 'Evaluación no aprobable. El estudio no avanza al contrato.'
    return 'Evaluación completada, esperando resultado.'
  }
  if (estudio.estado === 'fallido') {
    const tipo = tipoFallo(estudio)
    if (tipo === 'no_existe') {
      // El documento del coarrendatario no se corrige desde aquí (solo el del titular).
      return esCoarrendatario
        ? `La persona no aparece en ${buro}. No es un rechazo de crédito. Si el documento está mal escrito, comuníquese con Cofianza ${CONTACTO_COFIANZA_TEXTO} para corregirlo.`
        : `La persona no aparece en ${buro}. No es un rechazo de crédito: revise que el tipo y el número de documento estén bien escritos y vuelva a consultar.`
    }
    if (tipo === 'apellido') {
      return `${buro.charAt(0).toUpperCase()}${buro.slice(1)} encontró el documento, pero el primer apellido no coincide. Escriba el primer apellido tal como figura en la Registraduría en el campo «Primer apellido» del reintento y vuelva a consultar.`
    }
    return `La consulta a ${buro} falló por un problema técnico (no es un rechazo de crédito). Vuelva a intentarla.`
  }
  if (estudio.estado === 'cancelado') {
    // Se canceló la evaluación; el estudio sigue vivo.
    return 'Evaluación cancelada.'
  }
  if (estudio.estado === 'en_proceso') {
    // Adenda 4 V3 §12: ya consultado, no se decide al titular solo mientras un coarrendatario no autorice.
    if (estudio.espera_autorizacion) {
      const hasta = new Date(estudio.espera_autorizacion.hasta).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
      const pendientes = estudio.espera_autorizacion.pendientes
      const varios = pendientes.length > 1
      const base = `Ya se consultaron las centrales. La decisión espera a que ${pendientes.join(' y ')} ${varios ? 'autoricen' : 'autorice'}, hasta el ${hasta}; después se decide con quienes hayan autorizado.`
      return puedeGestionar
        ? `${base} ${varios ? 'Si alguno no lo va a hacer, reenvíele la invitación o cancélela.' : 'Si no lo va a hacer, reenvíele la invitación o cancélela.'}`
        : base
    }
    // Pasados 10 min la consulta se cortó (p. ej. un reinicio): la API la
    // recoge en su barrido; no seguir prometiendo "minutos".
    return Date.now() - new Date(estudio.updated_at).getTime() > 10 * 60 * 1000
      ? 'La consulta a las centrales de riesgo está tardando más de lo normal. Cofianza la está revisando.'
      : 'Consultando las centrales de riesgo. El resultado llega en minutos.'
  }
  // §6.3: el orden es AUTORIZACION -> PAGO -> EJECUCION. 'solicitado' es la
  // espera de la firma; 'pago_pendiente' es la espera del cobro, ya autorizado.
  if (estudio.estado === 'solicitado') {
    return 'Esperando que el prospecto autorice la consulta en centrales de riesgo.'
  }
  if (estudio.estado === 'pago_pendiente') {
    return 'Ya autorizó. Esperando el pago del estudio: no se consulta a centrales hasta confirmarlo.'
  }
  if (estudio.estado === 'pagado') {
    // U27: pagado antes de autorizar: sin la autorización no se consulta.
    return 'Pago recibido. Falta que la persona autorice la consulta.'
  }
  if (estudio.estado === 'autorizado') {
    return 'Autorizado. Esperando que el prospecto complete el formulario con sus datos.'
  }
  if (estudio.estado === 'formulario_enviado') {
    return 'Esperando que el prospecto termine de llenar el formulario.'
  }
  // El arranque automático tras la firma y el pago pudo fallar (el timeline lo
  // dice): el gestor la ejecuta desde el formulario de abajo.
  if (estudio.estado === 'formulario_completado' || estudio.estado === 'documentos_cargados') {
    return 'Listo para consultar a las centrales de riesgo. Si la consulta no arrancó sola, ejecútela desde aquí.'
  }
  return ''
}

// Tono de la card por bloque de progreso. Para 'completado' depende del
// resultado del estudio.
function getTone(estudio: IEstudio) {
  // §12: expirado sin autorizar — ámbar, porque tiene salida (reenviar).
  if (estudio.expiracion?.expirado) return 'warning'
  if (estudio.estado === 'completado') {
    if (estudio.resultado === 'aprobado') return 'success'
    if (estudio.resultado === 'condicionado') return 'warning'
    if (estudio.resultado === 'rechazado') return 'danger'
    return 'progress'
  }
  if (estudio.estado === 'fallido') return 'danger'
  if (estudio.estado === 'cancelado') return 'muted'
  if (estudio.estado === 'en_proceso') return 'progress'
  return 'pending'
}

// El marco común del Resumen (TarjetaSiguientePaso): el color va en la banda.
const TONO_PASO: Record<string, TonoPaso> = {
  success: 'accion',
  warning: 'revision',
  danger: 'alerta',
  progress: 'neutro',
  pending: 'neutro',
  muted: 'neutro',
}

export function EstudioEstadoCard({
  expedienteId,
  onVerEstudios,
  userRol,
  solicitante,
  inmuebleActualId,
  onReasignado,
  canonAprobado,
  destinacion,
  reasignable = true,
  coarrendatarioVigente = true,
  expedienteEstado,
  cierre: cierreProp,
  reaperturaAbierta = false,
  venceReapertura = null,
  onExpedienteCambio,
}: EstudioEstadoCardProps) {
  const cierre = cierreProp !== undefined ? cierreProp : cierreDelEstudio(expedienteEstado)
  // Refresco en sitio cuando el detalle del estudio recarga.
  const version = useRefrescoExpediente()
  // Guardamos hasta 2 estudios: el del titular (tipo='individual') y el del
  // coarrendatario (tipo='con_coarrendatario'). Cuando existen los dos, los
  // mostramos en paneles separados para que cada uno muestre los datos y el
  // resultado de la persona correcta — antes el card pintaba la cedula del
  // titular sobre el score del coarrendatario y se confundian.
  const [estudioTitular, setEstudioTitular] = useState<IEstudio | null>(null)
  const [estudioCoa, setEstudioCoa] = useState<IEstudio | null>(null)
  /** La evaluación mostrada es de quien ya salió del estudio (la API la marca «Salió del estudio»). */
  const [coaSalio, setCoaSalio] = useState(false)
  const [tieneContrato, setTieneContrato] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)

  const fetchEstudios = useCallback(async () => {
    try {
      const [res, contratos, coaVigente] = await Promise.all([
        estudioService.getEstudiosForExpediente(expedienteId, 1, 10),
        // Los mismos parámetros que ContratoEstadoCard: comparten la petición.
        contratoService.getContratosForExpediente(expedienteId, { limit: 20 }).catch(() => null),
        // El coarrendatario vigente (la misma petición que su tarjeta). undefined = no se pudo leer.
        coarrendatarioService.getDelExpediente(expedienteId).catch((): ICoarrendatario | null | undefined => undefined),
      ])
      setTieneContrato(!!contratos?.data.some((c) => c.estado !== 'cancelado'))
      const activos = res.data.filter((e) => e.estado !== 'cancelado')
      const candidatos = activos.length > 0 ? activos : res.data

      const masReciente = (lista: IEstudio[]) =>
        lista
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          ?? null

      const titular = masReciente(candidatos.filter((e) => e.tipo !== 'con_coarrendatario'))
      setEstudioTitular(titular)
      const coa = elegirEvaluacionCoarrendatario(res.data, candidatos, coaVigente)
      setEstudioCoa(coa.estudio)
      setCoaSalio(coa.salio)
      setErrorCarga(false)
    } catch {
      // Se conserva lo último cargado: vaciarlo borraba la evaluación del
      // Resumen sin aviso y, de paso, detenía el polling del «en proceso».
      setErrorCarga(true)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchEstudios() }, [fetchEstudios, version])

  // Polling suave mientras alguno este en_proceso para que el propietario vea
  // el resultado en cuanto entre, sin recargar la pagina.
  useEffect(() => {
    const enProceso = estudioTitular?.estado === 'en_proceso' || estudioCoa?.estado === 'en_proceso'
    if (!enProceso) return
    const id = setInterval(fetchEstudios, 8000)
    return () => clearInterval(id)
  }, [estudioTitular?.estado, estudioCoa?.estado, fetchEstudios])

  // Sin marcador gris: la tarjeta aparece cuando hay algo que decir.
  if (loading) return null
  // Antes de la consulta, la autorización y el pago dicen qué falta (debajo).
  const titularVisible = !!estudioTitular && !ESTADOS_EN_ESPERA.includes(estudioTitular.estado)
  if (!titularVisible && !estudioCoa) {
    if (!errorCarga) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">No pudimos cargar la evaluación crediticia de este estudio.</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchEstudios()
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <IconRefresh size={16} /> Reintentar
        </button>
      </div>
    )
  }

  // Reporte de Gerencia, punto 11: la evaluación de quien ya fue reemplazado no lleva el nombre del solicitante actual.
  const titularSolicitante =
    estudioTitular && evaluacionDeOtroSolicitante(estudioTitular.datos_formulario, solicitante?.numero_documento, personaA5dUsable(estudioTitular.persona_a5d))
      ? { nombre: SOLICITANTE_ANTERIOR, apellido: '' }
      : (solicitante ?? null)
  const coaSolicitante = estudioCoa ? getCoarrendatarioFromEstudio(estudioCoa) : null

  return (
    <div className="space-y-3">
      {estudioTitular && titularVisible && (
        <EstudioPanel
          estudio={estudioTitular}
          etiqueta="Titular"
          persona={titularSolicitante}
          segundoFirmante={
            estudioCoa?.estado === 'completado' && !coaSalio && coaSolicitante ? `${coaSolicitante.nombre} ${coaSolicitante.apellido ?? ''}`.trim() : null
          }
          tieneContrato={tieneContrato}
          expedienteId={expedienteId}
          expedienteEstado={expedienteEstado}
          cierre={cierre}
          reaperturaAbierta={reaperturaAbierta}
          venceReapertura={venceReapertura}
          onExpedienteCambio={onExpedienteCambio}
          onVerEstudios={onVerEstudios}
          userRol={userRol}
          onRetried={fetchEstudios}
          inmuebleActualId={inmuebleActualId}
          canonAprobado={canonAprobado}
          destinacion={destinacion}
          onReasignado={reasignable ? () => {
            fetchEstudios()
            onReasignado?.()
          } : undefined}
        />
      )}
      {estudioCoa && (
        <EstudioPanel
          estudio={estudioCoa}
          etiqueta="Coarrendatario"
          persona={coaSolicitante}
          onVerEstudios={onVerEstudios}
          userRol={userRol}
          onRetried={fetchEstudios}
          // Quien ya salió del estudio no se vuelve a consultar.
          sinReintento={!coarrendatarioVigente || coaSalio}
          expedienteEstado={expedienteEstado}
          cierre={cierre}
          // La reasignacion NO se ofrece desde el panel del coarrendatario: lo
          // que se mueve es el INMUEBLE DEL EXPEDIENTE, que es uno solo y ya
          // arrastra los dos estudios. Dos botones para el mismo traslado solo
          // servirian para que el gestor crea que son dos cosas distintas.
        />
      )}
    </div>
  )
}

// ── Panel individual (titular o coarrendatario) ────────────────────

interface EstudioPanelProps {
  estudio: IEstudio
  etiqueta: 'Titular' | 'Coarrendatario'
  persona: {
    nombre: string
    apellido?: string
    tipo_documento?: string | null
    numero_documento?: string | null
  } | null
  onVerEstudios?: () => void
  userRol?: string
  onRetried?: () => void
  /** Presente solo en el panel del titular: habilita la reasignacion (§4.3). */
  inmuebleActualId?: string | null
  canonAprobado?: number | null
  destinacion?: string | null
  /** Solo titular: pedir una autorización nueva si firmó con otro documento. */
  expedienteId?: string
  onReasignado?: () => void
  /** Solo titular: nombre del segundo firmante ya evaluado, si lo hay (a quién puede corresponder una marca). */
  segundoFirmante?: string | null
  /** Coarrendatario con el estudio ya resuelto: su evaluación ya no se reintenta (P3). */
  sinReintento?: boolean
  /** Solo titular: ya hay contrato (o el estudio se cerró): no se dice «generar contrato». */
  tieneContrato?: boolean
  expedienteEstado?: string
  cierre?: CierreEstudio
  /** Solo titular: el estudio se reabrió por un reemplazo y espera a la persona nueva. */
  reaperturaAbierta?: boolean
  venceReapertura?: string | null
  /** Solo titular: tras un cambio de persona, la página recarga el expediente. */
  onExpedienteCambio?: () => void
}

/** La insignia de la persona con el color del tono de la tarjeta. */
const INSIGNIA_TONO: Record<string, string> = {
  success: 'border-primary-300 text-primary-900',
  warning: 'border-amber-300 text-amber-900',
  danger: 'border-red-300 text-red-800',
  progress: 'border-gray-300 text-gray-700',
  pending: 'border-gray-300 text-gray-700',
  muted: 'border-gray-300 text-gray-700',
}

function EstudioPanel({
  estudio,
  etiqueta,
  persona,
  onVerEstudios,
  userRol,
  onRetried,
  inmuebleActualId,
  canonAprobado,
  destinacion,
  onReasignado,
  expedienteId,
  segundoFirmante,
  sinReintento,
  tieneContrato = false,
  expedienteEstado,
  cierre = null,
  reaperturaAbierta = false,
  venceReapertura = null,
  onExpedienteCambio,
}: EstudioPanelProps) {
  const [reasignarAbierto, setReasignarAbierto] = useState(false)
  const [marcaAbierta, setMarcaAbierta] = useState(false)
  const [retiroAbierto, setRetiroAbierto] = useState(false)
  // La API dice si quien mira puede marcar (solo en la evaluación del titular) y si ya hay una marca.
  const restitucion = etiqueta === 'Titular' ? estudio.restitucion : undefined
  // Con contrato o con el estudio cerrado la API no admite la marca: no se ofrece.
  const puedeMarcar = !!restitucion?.puede_marcar && !tieneContrato && expedienteEstado !== 'cerrado'
  const { retirar: retirarMarca, guardando: retirandoMarca } = useMarcaEstudio(estudio.id, onRetried)
  // `userRol` no distingue al miembro 'solo_lectura' de una inmobiliaria: entra
  // como rol 'inmobiliaria' y hasta aquí veía Reintentar y Reasignar, dos
  // mutaciones que el API le niega. Gerencia no llega a esGestor.
  const puedeEditar = usePuedeEditar()
  // Quien gestiona el estudio, aunque sea de solo lectura (ve; no cambia).
  const rolGestor = userRol === 'inmobiliaria' || userRol === 'propietario' || userRol === 'administrador' || userRol === 'operador_analista'
  const esGestor = rolGestor && puedeEditar
  const puedeReintentar = esGestor && !sinReintento && !estudio.espera_autorizacion && puedeRelanzarEstudio(estudio)
  // Portabilidad §4.3: un estudio COMPLETADO (ya ejecutado) se puede llevar a
  // otra propiedad sin volver a cobrar. El caso natural es el candidato que
  // perdio el inmueble porque otro fue aprobado primero (§4.2 ya se lo avisa
  // en el timeline). Se ofrece solo al gestor y solo desde el panel del
  // titular.
  //
  // Los cuatro roles de `esGestor` entran, PROPIETARIO INCLUIDO: la ruta
  // /reasignar usa roleGuard con esa misma lista (antes pedia
  // expedientes:update, que el propietario no tiene, y el boton lo llevaba a un
  // 403 seco despues de elegir la propiedad — un callejon sin salida dentro de
  // una promesa comercial). Si esa lista cambia, esta condicion cambia con ella.
  //
  // No se filtra ademas por resultado ni por pago: el §4.3 solo pide "pagado y
  // ejecutado", y el pago lo verifica la API contra `pagos` (fallando cerrado).
  // Esconder el boton por una condicion que aqui no se puede comprobar dejaria
  // al gestor sin saber por que no aparece.
  // Adenda 3 §6: con la condición en pie la API responde 409 (el puntaje
  // objetivo depende del canon de este inmueble).
  const puedeReasignar =
    esGestor && onReasignado != null && estudio.estado === 'completado' && !estudio.condicion_coarrendatario
  const esCofianza = userRol === 'administrador' || userRol === 'operador_analista' || userRol === 'gerencia_consulta'

  const esCoarrendatario = etiqueta === 'Coarrendatario'
  // Adenda 5: el papel de la persona en el estudio, su etiqueta y su texto los redacta la API.
  const personaA5d = personaA5dUsable(estudio.persona_a5d)
  // La decisión del analista sobre el condicionado del titular (como rotuloEvaluacion).
  const decisionAnalista =
    etiqueta === 'Titular' && estudio.estado === 'completado' && estudio.resultado === 'condicionado'
      ? estudio.decision_cofianza
      : null
  // Sin persona_a5d, el estudio reabierto por un reemplazo: la evaluación del titular espera a la persona nueva.
  const reabierto = reaperturaAbierta && etiqueta === 'Titular' && !personaA5d && estudio.estado === 'completado'
  const rotulo = reabierto ? ROTULO_EN_ESPERA : rotuloEvaluacion(estudio, esCoarrendatario, cierre)
  // Adenda 5: segundo firmante en verde; sin papel en gris, salvo «No pasó» y «No califica» (rojo).
  const contextoTono = { estudioAprobado: expedienteEstado === 'aprobado', cierre }
  const tonoA5d = personaA5d ? tonoPersonaA5d(personaA5d, contextoTono) : null
  const tone = tonoA5d === 'exito'
    ? 'success'
    : tonoA5d === 'alerta'
      ? 'danger'
      : tonoA5d === 'cerrada'
        ? 'muted'
        : tonoA5d === 'neutro' || reabierto
          ? 'progress'
          : !personaA5d && (rotulo === ROTULO_SIN_EFECTO || (rotulo === 'No califica' && !noCalificaEnRojo(contextoTono)))
            ? 'muted'
            : decisionAnalista === 'aprobado'
              ? 'success'
              : decisionAnalista === 'negado'
                ? 'danger'
                : getTone(estudio)

  // No aprobable o fallida: una X, no el visto de las aprobadas.
  // En revisión, en espera o consultando: un reloj; el visto solo para lo aprobado.
  const iconNode = tone === 'danger' || tone === 'muted'
    ? <IconX size={18} />
    : tone === 'success'
      ? <IconCheck size={18} />
      : <IconClock size={18} />

  const esAnalista = userRol === 'administrador' || userRol === 'operador_analista'
  // La persona «En verificación»: al analista se le dice qué hacer, no el texto para quien gestiona.
  const verificaAnalista = esAnalista && estaEnVerificacion(personaA5d)
  const siguientePasoBase = verificaAnalista
    ? textoVerificacionAnalista(estudio.listas?.estado)
    : personaA5d
      ? personaA5d.texto
      : reabierto
        ? TEXTO_EN_ESPERA
        : sinReintento && estudio.estado === 'fallido'
          ? 'La consulta falló y el estudio ya se resolvió: esta evaluación ya no se reintenta.'
          : getSiguientePaso(estudio, esAnalista, esCoarrendatario, esRolInterno(userRol), esGestor, cierre)
  // Estudio sin propiedad: antes del contrato va la vinculación del inmueble.
  // Con contrato, con el estudio cerrado o no aprobable ya no es el siguiente paso.
  const siguientePaso =
    tieneContrato || expedienteEstado === 'cerrado' || cierre !== null
      ? siguientePasoBase.replace(' Siguiente paso: crear el contrato.', '')
      : destinacion && !inmuebleActualId
        ? siguientePasoBase.replace('Siguiente paso: crear el contrato.', 'Siguiente paso: vincular el inmueble.')
        : siguientePasoBase
  // Texto de la API: sin citas a documentos para nadie, y sin datos internos
  // del modelo para quien no es de Cofianza.
  const interno = esRolInterno(userRol)
  const visible = (t: string | null | undefined) => textoVisible(t, { externo: !interno })
  const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido ?? ''}`.trim() : ''
  // Adenda 5: «{Nombre} · Titular del estudio»; la insignia solo si la etiqueta dice algo más que el papel.
  const papel = personaA5d ? papelEnElEstudio(personaA5d) : null
  const insignia = personaA5d ? insigniaPersona(personaA5d) : null
  const sePresento = personaA5d ? comoSePresento(personaA5d, esCoarrendatario) : null
  const mostrarPorQueRevision =
    (rotulo === 'En revisión de Cofianza' || rotulo === 'En revisión' || estaEnVerificacion(personaA5d)) && !!visible(estudio.observaciones)
  const mostrarFallo = estudio.estado === 'fallido' && !!visible(estudio.observaciones)

  return (
    <TarjetaSiguientePaso
      tono={TONO_PASO[tone]}
      icono={iconNode}
      titulo={
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {personaA5d ? (
            <>
              <span className="min-w-0 break-words">
                {nombreCompleto || 'Persona evaluada'}
                {papel && ` · ${papel}`}
              </span>
              {insignia && (
                <span className={cn('rounded-full border bg-white px-2 py-0.5 text-xs font-medium', INSIGNIA_TONO[tone])}>{insignia}</span>
              )}
            </>
          ) : (
            <span>
              {esCoarrendatario ? 'Evaluación del coarrendatario' : 'Evaluación crediticia del titular'}: {rotulo}
            </span>
          )}
          <InfoTip texto={AYUDA.evaluacion} lado="derecha" />
          {estudio.expiracion?.expirado && (
            <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900">
              {estudio.expiracion.detenida ? 'Enlace detenido' : 'Expirado'}
            </span>
          )}
          {sePresento && <span className="basis-full text-xs font-normal text-gray-600">{sePresento}</span>}
        </span>
      }
      descripcion={
        siguientePaso || mostrarPorQueRevision || mostrarFallo ? (
          <div className="space-y-2">
            {siguientePaso && <p>{siguientePaso}</p>}
            {/* El motivo de la revisión (R2, R4, listas, identidad, puntaje de la
                central…): antes solo se veía abriendo el detalle. Compara con el
                rótulo de rotuloEvaluacion (antes con «Condicionado», que ya no sale). */}
            {/* Una viñeta por motivo; el resumen de la central va aparte: no es un motivo. */}
            {mostrarPorQueRevision && (
              <MotivosRevision titulo="Por qué está en revisión:" {...partirObservaciones(visible(estudio.observaciones))} />
            )}
            {/* Motivo real del fallo. El texto de arriba es genérico para
                cualquier error; el backend guarda en `observaciones` la causa
                concreta (documento no encontrado, apellido que no coincide con
                Registraduría, buró caído…). Sin esto había que ir a la base de
                datos para saber qué corregir. */}
            {mostrarFallo && (
              <p>
                <span className="font-semibold">Respuesta de la consulta:</span> {visible(estudio.observaciones)}
              </p>
            )}
          </div>
        ) : undefined
      }
    >
      {/* Los datos de la evaluación, en pares etiqueta-valor */}
      <div className="px-4 py-4 sm:px-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {/* Adenda 5: la insignia es de la persona; el resultado del estudio sigue a la vista. */}
          {/* Reabierto, «Se decide de nuevo…» ya lo dicen la franja y el texto de la persona: no una tercera vez. */}
          {personaA5d && estudio.desenlace && estudio.desenlace_texto && !reaperturaAbierta &&
            estudio.desenlace_texto.trim() !== personaA5d.texto.trim() && (
            <Dato etiqueta="Resultado del estudio">{estudio.desenlace_texto}</Dato>
          )}
          {persona && (
            <Dato etiqueta="Persona evaluada">
              {nombreCompleto}
              {persona.numero_documento && (
                <span className="block text-gray-600">
                  {persona.tipo_documento ? documento(persona.tipo_documento, persona.numero_documento) : persona.numero_documento}
                </span>
              )}
            </Dato>
          )}
          {typeof estudio.score === 'number' && estudio.score > 0 && (
            <Dato
              etiqueta={
                <span className="inline-flex items-center gap-1">
                  Puntaje de la central
                  <InfoTip texto={PUNTAJE_CENTRAL_AYUDA} etiqueta="Qué es el puntaje de la central" />
                </span>
              }
            >
              <span className="text-base font-semibold tabular-nums">{estudio.score}</span>
            </Dato>
          )}
          {/* El tipo ya lo dice el título (titular o coarrendatario). */}
          {interno && centralDefinida(estudio) && (
            <Dato etiqueta="Central consultada">{BURO_LABELS[estudio.proveedor] || estudio.proveedor}</Dato>
          )}
          <Dato etiqueta="Fechas">
            Solicitada el {formatDate(estudio.fecha_solicitud)}
            {estudio.fecha_completado && (
              <span className="block text-gray-600">Completada el {formatDate(estudio.fecha_completado)}</span>
            )}
          </Dato>
          {estudio.antecedentes && (
            <Dato etiqueta="Listas restrictivas" className="sm:col-span-2">
              <div
                className={cn(
                  'flex items-start gap-1.5',
                  estudio.antecedentes.reportado_en_listas
                    ? 'text-red-800'
                    : estudio.antecedentes.estado !== 'verificado' || estudio.antecedentes.flags_revision.length > 0
                      ? 'text-amber-900'
                      : 'text-gray-900',
                )}
              >
                {(estudio.antecedentes.reportado_en_listas ||
                  estudio.antecedentes.estado !== 'verificado' ||
                  estudio.antecedentes.flags_revision.length > 0) && (
                  <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  {primeraMayuscula(describirAntecedentes(estudio.antecedentes, esCofianza))}
                  {/* El motivo, solo para Cofianza, a la vista (en un title no se veía en táctil): en
                      palabras, y el texto técnico del proveedor detrás de «Ver detalle técnico». */}
                  {esCofianza && estudio.antecedentes.motivo && (
                    <div className="mt-0.5 text-xs text-gray-600">
                      {motivoAntecedentesLegible(estudio.antecedentes.motivo)}
                      <details className="mt-0.5">
                        <summary className="inline-flex min-h-10 cursor-pointer items-center rounded text-gray-600 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-primary-600">
                          Ver detalle técnico
                        </summary>
                        <span className="block break-words font-mono text-[11px] text-gray-600">{estudio.antecedentes.motivo}</span>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </Dato>
          )}
          {visible(estudio.motivo_rechazo) && (
            <Dato etiqueta="Motivo" className="sm:col-span-2">
              <span className="text-red-800">
                {estudio.tipo === 'con_coarrendatario' ? motivoCoarrendatario(visible(estudio.motivo_rechazo)) : visible(estudio.motivo_rechazo)}
              </span>
            </Dato>
          )}
          {visible(estudio.condiciones) && (
            <Dato etiqueta="Condiciones" className="sm:col-span-2">
              <span className="text-amber-900">{visible(estudio.condiciones)}</span>
            </Dato>
          )}
        </dl>
        {/* La tarifa es una sola por arriendo: se ve y se negocia en el titular (P35). */}
        {etiqueta === 'Titular' && <TarifaEstudioBlock estudio={estudio} />}
      </div>

      {puedeReintentar && (
        <SeccionPaso titulo={esPendienteDeEjecutar(estudio) ? 'Ejecutar la consulta' : 'Volver a consultar'}>
          <ReintentarEstudioForm
            // key: el form inicializa su estado de forma lazy, así que sin
            // esto el documento quedaría del estudio anterior.
            key={estudio.id}
            estudioId={estudio.id}
            persona={persona}
            esTitular={etiqueta === 'Titular'}
            expedienteId={expedienteId}
            esPrimeraEjecucion={esPendienteDeEjecutar(estudio)}
            onRetried={onRetried}
          />
        </SeccionPaso>
      )}

      {restitucion?.marca && (
        <p role="status" className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:mx-5">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            Marca de restitución registrada el {new Date(restitucion.marca.marcada_en).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} sobre{' '}
            {restitucion.marca.persona === 'solicitante' ? 'el titular' : 'el segundo firmante'}. Soporte: {restitucion.marca.soporte}. Motivo:{' '}
            {restitucion.marca.motivo}
          </span>
        </p>
      )}

      {(puedeReasignar || onVerEstudios || puedeMarcar) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          {onVerEstudios && (
            <button
              type="button"
              onClick={onVerEstudios}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Ver detalle de la evaluación
              <IconArrowRight size={16} />
            </button>
          )}
          {puedeReasignar && (
            <button
              type="button"
              onClick={() => setReasignarAbierto(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <IconBuilding2 size={16} />
              {inmuebleActualId ? 'Reasignar a otra propiedad' : 'Vincular inmueble'}
            </button>
          )}
          {puedeMarcar && (
            <button
              type="button"
              onClick={() => (restitucion?.marca ? setRetiroAbierto(true) : setMarcaAbierta(true))}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <IconAlertTriangle size={16} />
              {restitucion?.marca ? 'Retirar marca de restitución' : 'Marcar restitución'}
            </button>
          )}
        </div>
      )}

      {/* Cambios de personas del estudio: la API dice qué se puede hacer, cuánto cuesta y cuántos quedan. */}
      {etiqueta === 'Titular' && expedienteId && rolGestor && (
        <SustitucionesEstudio
          estudioId={estudio.id}
          expedienteId={expedienteId}
          activo={!!estudio.desenlace && estudio.estado === 'completado'}
          puedeEditar={puedeEditar}
          onCambio={() => {
            onRetried?.()
            onExpedienteCambio?.()
          }}
          estudioRechazado={cierre === 'no_aprobable'}
          reaperturaAbierta={reaperturaAbierta}
          venceReapertura={venceReapertura}
        />
      )}

      {puedeMarcar && restitucion && (
        <>
          <MarcarRestitucionModal
            isOpen={marcaAbierta}
            onClose={() => setMarcaAbierta(false)}
            estudioId={estudio.id}
            ayuda={restitucion.ayuda}
            titular={nombreCompleto}
            segundoFirmante={segundoFirmante}
            onGuardado={onRetried}
          />
          <MotivoDialog
            isOpen={retiroAbierto}
            onClose={() => setRetiroAbierto(false)}
            onConfirm={async (motivo) => {
              const ok = await retirarMarca(motivo)
              if (ok) setRetiroAbierto(false)
              return ok
            }}
            title="Retirar la marca de restitución"
            descripcion="El estudio se decide de nuevo sin la marca. El retiro queda en el registro con su motivo."
            confirmLabel="Retirar marca"
            isLoading={retirandoMarca}
            minLength={10}
          />
        </>
      )}

      {puedeReasignar && (
        <ReasignarEstudioModal
          isOpen={reasignarAbierto}
          onClose={() => setReasignarAbierto(false)}
          estudioId={estudio.id}
          inmuebleActualId={inmuebleActualId}
          canonEvaluado={estudio.canon_evaluado}
          canonHabilitado={estudio.desenlace ? (estudio.canon_habilitado_cop ?? null) : undefined}
          sinReevaluacion={estudio.hasta_canon === true}
          canonAprobado={canonAprobado}
          destinacion={destinacion}
          expedienteId={expedienteId}
          onReasignado={onReasignado}
        />
      )}
    </TarjetaSiguientePaso>
  )
}

/** Un par etiqueta-valor de la evaluación. */
function Dato({ etiqueta, children, className }: { etiqueta: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-gray-600">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{children}</dd>
    </div>
  )
}

const primeraMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/**
 * La evaluación del coarrendatario que va en la tarjeta: la del VIGENTE (el
 * `estudio_id` de GET /expedientes/:id/coarrendatario, que ya excluye a quien
 * salió o declinó), no la última. Sin vigente evaluado, solo la que la API marca
 * «Salió del estudio» (y se muestra como tal); nunca la de quien salió como si
 * fuera el coarrendatario actual. Sin poder leer el vigente, la más reciente,
 * como antes.
 */
function elegirEvaluacionCoarrendatario(
  todas: IEstudio[],
  candidatos: IEstudio[],
  vigente: ICoarrendatario | null | undefined,
): { estudio: IEstudio | null; salio: boolean } {
  const masReciente = (lista: IEstudio[]) =>
    lista.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null
  const delCoa = (e: IEstudio) => e.tipo === 'con_coarrendatario'
  if (vigente === undefined) return { estudio: masReciente(candidatos.filter(delCoa)), salio: false }
  const delVigente = vigente?.estudio_id ? todas.find((e) => delCoa(e) && e.id === vigente.estudio_id) ?? null : null
  if (delVigente) return { estudio: delVigente, salio: false }
  const salida = masReciente(todas.filter((e) => delCoa(e) && esSalidaDelEstudio(personaA5dUsable(e.persona_a5d))))
  return { estudio: salida, salio: !!salida }
}

/**
 * Para estudios tipo='con_coarrendatario' los datos de la persona evaluada
 * viajan en `datos_formulario` (los escribe el backend al disparar el estudio
 * tras la aceptacion). Mismo patron que EstudiosSection.
 */
function getCoarrendatarioFromEstudio(
  estudio: IEstudio,
): { nombre: string; apellido?: string; tipo_documento?: string | null; numero_documento?: string | null } | null {
  const datos = (estudio.datos_formulario || {}) as {
    nombre_completo?: string
    apellido?: string
    tipo_documento?: string
    numero_documento?: string
  }
  const completo = (datos.nombre_completo || '').trim()
  if (!completo && !datos.numero_documento) return null
  const idx = completo.indexOf(' ')
  return {
    nombre: idx === -1 ? completo : completo.slice(0, idx),
    // Preferir el apellido capturado en su propio campo al invitar: partir
    // nombre_completo por el primer espacio convierte el segundo NOMBRE en
    // apellido ('Juan Carlos Pérez' → apellido 'Carlos Pérez'), y el form de
    // reintento propondría 'Carlos' como primer apellido → código 10 de
    // DataCrédito con consulta facturada perdida.
    apellido: datos.apellido || (idx === -1 ? '' : completo.slice(idx + 1)),
    tipo_documento: datos.tipo_documento ?? null,
    numero_documento: datos.numero_documento ?? null,
  }
}
