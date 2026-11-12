/**
 * Datos fijos de la página de autorización: pantallas, pasos, opciones del
 * §8.2/§8.3, motivos del reporte, finalidades (paso 1) y beneficios opcionales
 * (paso 3). Son textos que lee el prospecto: cambiarlos es un cambio legal.
 */

import {
  IconActivity,
  IconSearch,
  IconBank,
  IconPhone,
  IconShield,
  IconBarChart3,
  IconDollarSign,
  IconUsers,
} from '@/components/icons'

// 'inactivo': el estudio se cerró o se rechazó (la API responde ESTUDIO_NO_ACTIVO).
// 'no_coincide': el documento escrito no es el registrado; el enlace se detuvo.
export type PageState = 'loading' | 'form' | 'signed' | 'error' | 'reportado' | 'inactivo' | 'no_coincide'
export type Paso = 1 | 2 | 3 | 'bio' | 4
export type ConsentKey = 'analitica' | 'comercial' | 'historial_referencia'
export type SituacionLaboral = 'empleado' | 'independiente' | 'pensionado' | 'otro'
export type MotivoReporte = 'no_soy_yo' | 'datos_incorrectos'

// §8.2 "Situacion laboral. Empleado, independiente, pensionado, otro.
// Presentada como seleccion simple."
// `pregunta` por situación, no un label fijo: §8.2 pide formularlo "de manera
// cordial y sin tono de interrogatorio", y preguntarle "¿Dónde trabajas?" a
// quien acaba de marcar "Pensionado" contradice lo que respondió una línea
// antes — que es exactamente lo que hace que el campo se deje en blanco.
export const SITUACIONES: Array<{ key: SituacionLaboral; label: string; pregunta: string; placeholder: string }> = [
  { key: 'empleado', label: 'Empleado', pregunta: '¿Dónde trabaja?', placeholder: 'Nombre de la empresa' },
  { key: 'independiente', label: 'Independiente', pregunta: '¿A qué se dedica?', placeholder: 'A qué se dedica' },
  { key: 'pensionado', label: 'Pensionado', pregunta: '¿Qué fondo o entidad le paga?', placeholder: 'Fondo o entidad que le paga' },
  { key: 'otro', label: 'Otro', pregunta: '¿A qué se dedica?', placeholder: 'Cuéntenos en una línea' },
]

// Validación mínima de correo, alineada con `z.email()` del backend (zod 4
// rechaza "maria@gmail", sin TLD — el error típico al teclear en un celular).
// No está para ser estricta: está para que un dedazo en el correo de un
// TERCERO no tire el resto de lo que el prospecto acaba de contar.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const MOTIVOS_REPORTE: Array<{ key: 'no_soy_yo' | 'datos_incorrectos'; label: string; sub: string }> = [
  { key: 'no_soy_yo', label: 'Yo no soy esa persona', sub: 'Este enlace llegó a manos equivocadas.' },
  { key: 'datos_incorrectos', label: 'Soy yo, pero los datos están mal', sub: 'Hay un error en el nombre o en el documento.' },
]

// Solo es cierto con el texto sin biometría: con la selfie, la imagen del rostro
// ES un dato sensible (cláusula 4.1 del texto 3.0-biometria).
export const SIN_DATOS_SENSIBLES = 'No tratamos datos sensibles ni de menores; el servicio es solo para mayores de 18 años.'
export const CON_BIOMETRIA =
  'La foto de su rostro es un dato sensible: la usamos solo para confirmar que usted es el titular del documento y no está obligado a darla. No tratamos datos de menores; el servicio es solo para mayores de 18 años.'

export const FINALIDADES = [
  {
    Icon: IconActivity,
    titulo: 'Evaluamos su estudio',
    sub: 'Riesgo, capacidad de pago y aprobación',
    detalle: [
      'Analizamos su perfil de riesgo y su comportamiento de pago para definir si podemos respaldarlo y en qué condiciones.',
      'Usamos scoring automatizado; usted tiene derecho a pedir revisión humana de cualquier decisión que lo afecte.',
    ],
  },
  {
    Icon: IconSearch,
    titulo: 'Consultamos y reportamos a centrales de riesgo',
    sub: 'Datacrédito Experian y TransUnion · Ley 1266',
    detalle: [
      'Consultamos su historial para evaluarlo y reportamos su comportamiento, positivo y negativo.',
      'Un reporte negativo solo procede con aviso previo de 20 días (Art. 12).',
      'El dato negativo permanece máximo 4 años desde el pago (Art. 13); el positivo, mientras sea vigente.',
    ],
  },
  {
    Icon: IconBank,
    titulo: 'Construimos su historial de arriendo',
    sub: 'Su cumplimiento se vuelve su reputación',
    detalle: [
      'Registramos su historial de pago en arriendos para operar como fuente y operador de información (Art. 3, Ley 1266).',
      'Su buen cumplimiento queda como referencia positiva ante inmobiliarias, afianzadoras y arrendadores.',
    ],
  },
  {
    Icon: IconPhone,
    titulo: 'Lo contactamos y gestionamos el servicio',
    sub: 'Notificaciones, cobranza y administración',
    detalle: [
      'Administramos su contrato y su fianza.',
      'Lo contactamos por llamada, WhatsApp, correo o SMS para notificaciones y cobranza.',
      'Compartimos lo necesario con encargados: proveedores, centrales de riesgo, cobranza y abogados.',
    ],
  },
  {
    Icon: IconShield,
    titulo: 'Protegemos sus datos y prevenimos fraude',
    sub: 'Seguridad y normas SARLAFT',
    detalle: [
      'Prevenimos suplantación y fraude conforme a las normas de prevención de lavado (SARLAFT).',
      'Aplicamos medidas técnicas y administrativas para proteger su información.',
      SIN_DATOS_SENSIBLES,
    ],
  },
] as const

export const BENEFICIOS: Array<{ key: ConsentKey; Icon: typeof IconBarChart3; titulo: string; desc: string }> = [
  {
    key: 'analitica',
    Icon: IconBarChart3,
    titulo: 'Analítica de su perfil',
    // B8: cada texto repite la finalidad del texto legal §5.2 (i)/(ii)/(iii), sin agregar ni recortar.
    // El resumen del paso 4 usa estos mismos títulos.
    desc: 'Cofianza hace analítica avanzada, segmentación y perfilamiento comercial con sus datos.',
  },
  {
    key: 'comercial',
    Icon: IconDollarSign,
    titulo: 'Comunicaciones comerciales',
    desc: 'Cofianza le envía comunicaciones comerciales, ofertas y mercadeo.',
  },
  {
    key: 'historial_referencia',
    Icon: IconUsers,
    titulo: 'Su historial como referencia',
    desc: 'Cofianza comparte su historial de buen pago como referencia ante terceros del ecosistema.',
  },
]
