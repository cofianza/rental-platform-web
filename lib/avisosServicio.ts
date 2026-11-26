/**
 * Avisos de servicio: catálogo de servicios, niveles y destinatarios, los
 * textos sugeridos por servicio y las cuentas puras del banner (qué se oculta,
 * la hora en Colombia). Sin React, para poder probarlo con node:test.
 */

import type { AudienciaAviso, IAvisoVisible, NivelAviso, ServicioAviso } from '../types/avisosServicio'
import { CONTACTO_COFIANZA } from './constants'

const CIERRE = 'Estamos trabajando para restablecer el servicio lo antes posible. Gracias por su paciencia.'

// Los textos sugeridos solo dicen lo que la plataforma hace: los enlaces y
// códigos al prospecto (autorización, OTP, pago, coarrendatario, citas) salen
// por WhatsApp y por correo; los avisos a inmobiliarias y propietarios, por
// WhatsApp y en las notificaciones de la plataforma. Una evaluación que falla
// por las centrales no se reintenta sola.
export const SERVICIOS_AVISO: Array<{
  value: ServicioAviso
  label: string
  nivel: NivelAviso
  titulo: string
  mensaje: string
}> = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    nivel: 'parcial',
    titulo: 'Los mensajes de WhatsApp pueden no llegarle',
    mensaje:
      'En este momento los mensajes de WhatsApp presentan fallas. Los enlaces y códigos también le llegan por correo electrónico: revise su bandeja de entrada y la carpeta de spam. Si tiene cuenta, los avisos de sus estudios están en las notificaciones de la plataforma. ' +
      CIERRE,
  },
  {
    value: 'correo',
    label: 'Correo electrónico',
    nivel: 'parcial',
    titulo: 'Los correos están llegando con demora',
    mensaje:
      'Algunos correos de la plataforma pueden llegar con retraso o no llegar. Los enlaces y códigos también le llegan por WhatsApp. Si tiene cuenta, puede consultar sus estudios y notificaciones en la plataforma. ' +
      CIERRE,
  },
  {
    value: 'pagos',
    label: 'Pagos en línea',
    nivel: 'caido',
    titulo: 'Los pagos en línea no están disponibles',
    mensaje:
      `En este momento no es posible completar pagos en línea. Si ya pagó y no ve el pago reflejado, no lo repita: escríbanos a ${CONTACTO_COFIANZA.email} y lo revisamos. ` +
      CIERRE,
  },
  {
    value: 'firma',
    label: 'Firma de contratos',
    nivel: 'caido',
    titulo: 'La firma electrónica de contratos no está disponible',
    mensaje:
      'Por el momento no es posible enviar contratos a firma ni firmarlos. Los contratos ya firmados no se ven afectados. ' +
      CIERRE,
  },
  {
    value: 'evaluacion',
    label: 'Evaluación crediticia',
    nivel: 'parcial',
    titulo: 'Las evaluaciones crediticias presentan fallas',
    mensaje:
      'Las consultas a las centrales de riesgo presentan fallas y algunas evaluaciones pueden no completarse. Si una no se completa, se podrá volver a intentar cuando se restablezca el servicio. ' +
      CIERRE,
  },
  {
    value: 'identidad',
    label: 'Verificación de identidad',
    nivel: 'parcial',
    titulo: 'La verificación de identidad presenta fallas',
    mensaje:
      'La verificación de identidad (selfie) puede fallar en este momento. Si no logra completarla, intente de nuevo más tarde. ' +
      CIERRE,
  },
  {
    value: 'plataforma',
    label: 'Plataforma en general',
    nivel: 'parcial',
    titulo: 'La plataforma presenta lentitud',
    mensaje:
      'Algunas secciones pueden tardar en cargar o mostrar errores. Si una acción no se completa, inténtela de nuevo en unos minutos. ' +
      CIERRE,
  },
  {
    value: 'mantenimiento',
    label: 'Mantenimiento programado',
    nivel: 'informativo',
    titulo: 'Mantenimiento programado',
    mensaje:
      'El [día] entre las [hora] y las [hora] haremos mantenimiento a la plataforma. Durante ese tiempo algunas funciones pueden no estar disponibles. Gracias por su paciencia.',
  },
  { value: 'otro', label: 'Otro', nivel: 'parcial', titulo: '', mensaje: '' },
]

export const NIVELES_AVISO: Array<{ value: NivelAviso; label: string; ayuda: string }> = [
  { value: 'caido', label: 'Fuera de servicio', ayuda: 'No funciona. Se muestra en rojo y nadie lo puede ocultar.' },
  { value: 'parcial', label: 'Con fallas', ayuda: 'Funciona a medias o con demora. Se muestra en ámbar.' },
  { value: 'informativo', label: 'Aviso', ayuda: 'Sin falla: un mantenimiento o una novedad. Se muestra en azul.' },
]

export const AUDIENCIAS_AVISO: Array<{ value: AudienciaAviso; label: string; corto: string; ayuda: string }> = [
  { value: 'inmobiliaria', label: 'Inmobiliarias', corto: 'inmobiliarias', ayuda: 'Titulares y miembros de cada inmobiliaria.' },
  {
    value: 'propietario',
    label: 'Propietarios',
    corto: 'propietarios',
    ayuda: 'Arrendadores que gestionan sus inmuebles directamente.',
  },
  {
    value: 'prospecto',
    label: 'Prospectos e inquilinos',
    corto: 'prospectos',
    ayuda: 'Con cuenta y en las páginas por enlace (autorizar, pagar, verificar identidad, cargar documentos, coarrendatario, visitas).',
  },
]

export const LIMITE_TITULO = 120
export const LIMITE_MENSAJE = 600

export function plantillaDe(servicio: ServicioAviso) {
  return SERVICIOS_AVISO.find((s) => s.value === servicio) ?? SERVICIOS_AVISO[SERVICIOS_AVISO.length - 1]
}

export function etiquetaNivel(nivel: NivelAviso): string {
  return NIVELES_AVISO.find((n) => n.value === nivel)?.label ?? nivel
}

/** «inmobiliarias, propietarios y prospectos». */
export function textoAudiencia(audiencia: AudienciaAviso[]): string {
  const nombres = AUDIENCIAS_AVISO.filter((a) => audiencia.includes(a.value)).map((a) => a.corto)
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

/** El texto sugerido de mantenimiento trae [corchetes] por llenar. */
export function tieneCamposPorLlenar(texto: string): boolean {
  return /\[[^\]]*\]/.test(texto)
}

// ---------- Ocultar en el banner ----------

/** id → actualizado_en de la versión que la persona ocultó. */
export type AvisosOcultos = Record<string, string>

/**
 * Lo «fuera de servicio» no se oculta; lo demás, solo la versión que se
 * ocultó: si el administrador lo edita, vuelve a salir.
 */
export function avisosAMostrar(avisos: IAvisoVisible[], ocultos: AvisosOcultos): IAvisoVisible[] {
  return avisos.filter((a) => a.nivel === 'caido' || ocultos[a.id] !== a.actualizado_en)
}

/**
 * Reporte de la Oficina Virtual (25-nov), punto 12: en el panel el cierre se guarda en la cuenta (la API ya no manda
 * los que la persona cerró). El navegador solo es el respaldo cuando la API no lo pudo guardar, y por persona (en un
 * equipo compartido, lo que cierra una no se le oculta a otra). Las páginas públicas (prospectos sin cuenta) siguen
 * con la clave del navegador.
 */
export const CLAVE_OCULTOS_PUBLICOS = 'hp-avisos-ocultos'

/** La clave del respaldo en el navegador de lo que esta persona cerró en el panel. */
export function claveOcultosDe(usuarioId: string): string {
  return `${CLAVE_OCULTOS_PUBLICOS}:${usuarioId}`
}

/**
 * ¿El cierre que la API no guardó se recuerda en el navegador? Sí, salvo que el aviso ya no esté publicado (404) o
 * no se pueda cerrar (409, «fuera de servicio»): ahí no hay nada que recordar.
 */
export function recordarEnNavegador(statusCode: number | undefined): boolean {
  return statusCode !== 404 && statusCode !== 409
}

/** Deja solo lo de avisos que siguen vigentes, para que la lista no crezca sin fin. */
export function podarOcultos(ocultos: AvisosOcultos, vigentes: IAvisoVisible[]): AvisosOcultos {
  const ids = new Set(vigentes.map((a) => a.id))
  return Object.fromEntries(Object.entries(ocultos).filter(([id]) => ids.has(id)))
}

// ---------- Hora de Colombia para el campo «ocultar a esta hora» ----------

const BOGOTA_MS = 5 * 60 * 60 * 1000 // UTC−5, sin horario de verano

/** «2026-11-24T18:30» (hora de Colombia, del input datetime-local) → ISO con Z. */
export function bogotaLocalAIso(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null
  const t = Date.parse(`${valor}:00-05:00`)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

/** ISO → «2026-11-24T18:30» en hora de Colombia, para llenar el input. */
export function isoABogotaLocal(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t - BOGOTA_MS).toISOString().slice(0, 16)
}
