/**
 * Página pública de autorización de tratamiento de datos (habeas data).
 * Sin login: token-gated. Tarjeta centrada + header de marca + 4 pasos —
 *   Paso 1: §8.1 confirmación de identidad (el prospecto ESCRIBE su número de
 *           documento y la API lo compara con la ficha sin revelarlo; si no
 *           coincide, el enlace se detiene) → finalidades + autorización legal
 *           + aceptación (obligatorio). El resto del paso NO se muestra hasta
 *           que el prospecto confirma quién es: confirmar antes de leer qué
 *           autoriza es el orden lógico del §8.1, y de paso deja de aterrizar
 *           en un muro legal.
 *   Paso 2: §8.2 laboral + ingreso y §8.3 solo/acompañado ("Sobre ti").
 *   Paso 3: beneficios (3 consentimientos OPCIONALES con toggle).
 *   Paso 'bio': cotejo biométrico AucoFace — SOLO si el backend lo pide
 *           (AUCO_BIOMETRIA_ENABLED). Política Anexo A + §14.
 *   Paso 4: confirmación + resumen. SIN OTP (Adenda 1 §7, Gerencia 07/09/2026:
 *           "No se implementa OTP en el flujo de autorización del estudio").
 *           La aceptación por casilla es la firma (Decreto 1377/2013, art. 7).
 *
 * EL PASO 'bio' VA ANTES DE LA FIRMA Y DESPUÉS DE LA ACEPTACIÓN, y ese orden
 * es legal, no estético: la foto del rostro es dato sensible (Ley 1581 art. 5)
 * y no se puede capturar antes de que el prospecto acepte el texto que la
 * declara — el texto que se le presenta en el paso 1 ya es la versión
 * 3.0-biometria cuando el interruptor está encendido.
 *
 * Sin OTP el orden de los pasos ya no lo dicta un reloj; se conserva porque
 * §8.2/§8.3 son opcionales y la confirmación final debe ser lo último.
 *
 * Todo lo de "Sobre ti" es OPCIONAL y el botón Continuar nunca se deshabilita:
 * el propio documento señala §8.2 como el punto de mayor abandono, y lo único
 * irrecuperable de esta pantalla es la firma.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { autorizacionPublicService } from '@/services/autorizacionService'
import type { IAutorizacionPublicData, IPagoProspecto, IPerfilProspectoInput } from '@/types/autorizacion'
import { esErrorTransitorio, mensajeParaProspecto } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import {
  IconShieldCheck,
  IconLock,
  IconActivity,
  IconSearch,
  IconBank,
  IconPhone,
  IconShield,
  IconBarChart3,
  IconDollarSign,
  IconUsers,
  IconChevronDown,
  IconCheck,
  IconLoader,
  IconAlertTriangle,
  IconId,
  IconUserCheck,
  IconUserX,
  IconBuilding2,
  IconUser, IconArrowLeft, IconArrowRight, IconRefresh } from '@/components/icons'
import { CapturaBiometrica } from '@/components/public/CapturaBiometrica'
import { Modal } from '@/components/ui/Modal'

// 'inactivo': el estudio se cerró o se rechazó (la API responde ESTUDIO_NO_ACTIVO).
// 'no_coincide': el documento escrito no es el registrado; el enlace se detuvo.
type PageState = 'loading' | 'form' | 'signed' | 'error' | 'reportado' | 'inactivo' | 'no_coincide'
type Paso = 1 | 2 | 3 | 'bio' | 4
type ConsentKey = 'analitica' | 'comercial' | 'historial_referencia'
type SituacionLaboral = 'empleado' | 'independiente' | 'pensionado' | 'otro'

// §8.2 "Situacion laboral. Empleado, independiente, pensionado, otro.
// Presentada como seleccion simple."
// `pregunta` por situación, no un label fijo: §8.2 pide formularlo "de manera
// cordial y sin tono de interrogatorio", y preguntarle "¿Dónde trabajas?" a
// quien acaba de marcar "Pensionado" contradice lo que respondió una línea
// antes — que es exactamente lo que hace que el campo se deje en blanco.
const SITUACIONES: Array<{ key: SituacionLaboral; label: string; pregunta: string; placeholder: string }> = [
  { key: 'empleado', label: 'Empleado', pregunta: '¿Dónde trabajas?', placeholder: 'Nombre de la empresa' },
  { key: 'independiente', label: 'Independiente', pregunta: '¿A qué te dedicas?', placeholder: 'A qué te dedicas' },
  { key: 'pensionado', label: 'Pensionado', pregunta: '¿Qué fondo o entidad te paga?', placeholder: 'Fondo o entidad que te paga' },
  { key: 'otro', label: 'Otro', pregunta: '¿A qué te dedicas?', placeholder: 'Cuéntanos en una línea' },
]

// Validación mínima de correo, alineada con `z.email()` del backend (zod 4
// rechaza "maria@gmail", sin TLD — el error típico al teclear en un celular).
// No está para ser estricta: está para que un dedazo en el correo de un
// TERCERO no tire el resto de lo que el prospecto acaba de contar.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const MOTIVOS_REPORTE: Array<{ key: 'no_soy_yo' | 'datos_incorrectos'; label: string; sub: string }> = [
  { key: 'no_soy_yo', label: 'Yo no soy esa persona', sub: 'Este enlace llegó a manos equivocadas.' },
  { key: 'datos_incorrectos', label: 'Soy yo, pero los datos están mal', sub: 'Hay un error en el nombre o en el documento.' },
]

// Solo es cierto con el texto sin biometría: con la selfie, la imagen del rostro
// ES un dato sensible (cláusula 4.1 del texto 3.0-biometria).
const SIN_DATOS_SENSIBLES = 'No tratamos datos sensibles ni de menores; el servicio es solo para mayores de 18 años.'
const CON_BIOMETRIA =
  'La foto de tu rostro es un dato sensible: la usamos solo para confirmar que eres el titular del documento y no estás obligado a darla. No tratamos datos de menores; el servicio es solo para mayores de 18 años.'

const FINALIDADES = [
  {
    Icon: IconActivity,
    titulo: 'Evaluamos tu estudio en segundos',
    sub: 'Riesgo, capacidad de pago y aprobación',
    detalle: [
      'Analizamos tu perfil de riesgo y tu comportamiento de pago para definir si podemos respaldarte y en qué condiciones.',
      'Usamos scoring automatizado; tienes derecho a pedir revisión humana de cualquier decisión que te afecte.',
    ],
  },
  {
    Icon: IconSearch,
    titulo: 'Consultamos y reportamos a centrales de riesgo',
    sub: 'Datacrédito Experian y TransUnion · Ley 1266',
    detalle: [
      'Consultamos tu historial para evaluarte y reportamos tu comportamiento, positivo y negativo.',
      'Un reporte negativo solo procede con aviso previo de 20 días (Art. 12).',
      'El dato negativo permanece máximo 4 años desde el pago (Art. 13); el positivo, mientras sea vigente.',
    ],
  },
  {
    Icon: IconBank,
    titulo: 'Construimos tu historial de arriendo',
    sub: 'Tu cumplimiento se vuelve tu reputación',
    detalle: [
      'Registramos tu historial de pago en arriendos para operar como fuente y operador de información (Art. 3, Ley 1266).',
      'Tu buen cumplimiento queda como referencia positiva ante inmobiliarias, afianzadoras y arrendadores.',
    ],
  },
  {
    Icon: IconPhone,
    titulo: 'Te contactamos y gestionamos el servicio',
    sub: 'Notificaciones, cobranza y administración',
    detalle: [
      'Administramos tu contrato y tu fianza.',
      'Te contactamos por llamada, WhatsApp, correo o SMS para notificaciones y cobranza.',
      'Compartimos lo necesario con encargados: proveedores, centrales de riesgo, cobranza y abogados.',
    ],
  },
  {
    Icon: IconShield,
    titulo: 'Protegemos tus datos y prevenimos fraude',
    sub: 'Seguridad y normas SARLAFT',
    detalle: [
      'Prevenimos suplantación y fraude conforme a las normas de prevención de lavado (SARLAFT).',
      'Aplicamos medidas técnicas y administrativas para proteger tu información.',
      SIN_DATOS_SENSIBLES,
    ],
  },
] as const

const BENEFICIOS: Array<{ key: ConsentKey; Icon: typeof IconBarChart3; titulo: string; desc: string }> = [
  {
    key: 'analitica',
    Icon: IconBarChart3,
    titulo: 'Tu perfil, a tu medida',
    desc: 'Deja que Cofianza analice tu perfil para ofrecerte productos y condiciones pensados para ti, no genéricos. Incluye analítica, segmentación y perfilamiento comercial.',
  },
  {
    key: 'comercial',
    Icon: IconDollarSign,
    titulo: 'Ofertas que sí te sirven',
    desc: 'Oportunidades de arriendo, descuentos para tu hogar y beneficios de aliados. Comunicaciones comerciales de Cofianza y sus aliados, por el medio que prefieras.',
  },
  {
    key: 'historial_referencia',
    Icon: IconUsers,
    titulo: 'Tu historial te abre puertas',
    desc: 'Autoriza a Cofianza a compartir tu historial de buen pago como referencia con inmobiliarias, afianzadoras y arrendadores del ecosistema que evalúen tu solicitud.',
  },
]

export default function AutorizarPage() {
  const params = useParams()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<IAutorizacionPublicData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  // Un corte de datos no es un enlace muerto: con error transitorio la
  // pantalla ofrece "Reintentar" en vez de "pide otro enlace".
  const [reintentable, setReintentable] = useState(false)

  // 'bio' no es un número para no renumerar los cuatro pasos existentes: el
  // cotejo es condicional y, apagado el interruptor, el flujo es idéntico al
  // de siempre.
  const [paso, setPaso] = useState<Paso>(1)
  // §8.1: gatea el resto del paso 1. Solo se enciende cuando la API confirmó
  // que el documento escrito es el de la ficha; el mismo número viaja con la
  // firma, que lo vuelve a comparar.
  const [identidadOk, setIdentidadOk] = useState(false)
  const [documento, setDocumento] = useState('')
  const [verificandoDoc, setVerificandoDoc] = useState(false)
  const [documentoError, setDocumentoError] = useState('')
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [reporteMotivo, setReporteMotivo] = useState<'no_soy_yo' | 'datos_incorrectos'>('no_soy_yo')
  const [reporteDetalle, setReporteDetalle] = useState('')
  const [reportando, setReportando] = useState(false)
  // §12: el error del reporte se muestra DENTRO del modal. La pantalla
  // "Detuvimos el proceso" sólo se pinta cuando el servidor lo confirmó.
  const [reporteError, setReporteError] = useState('')
  // §8.2 / §8.3 — todo opcional.
  const [situacion, setSituacion] = useState<SituacionLaboral | null>(null)
  // Política Anexo A.3/A.4: solo se pregunta al independiente.
  const [tieneRut, setTieneRut] = useState<boolean | null>(null)
  const [dondeLabora, setDondeLabora] = useState('')
  const [ingreso, setIngreso] = useState('')
  const [presentacion, setPresentacion] = useState<'solo' | 'acompanado' | null>(null)
  const [coaNombre, setCoaNombre] = useState('')
  const [coaApellido, setCoaApellido] = useState('')
  const [coaEmail, setCoaEmail] = useState('')
  const [coaTelefono, setCoaTelefono] = useState('')
  // Se enciende al intentar continuar, no al teclear: nadie quiere ver
  // "revisa el correo" cuando lleva escrita una sola letra.
  const [coaEmailError, setCoaEmailError] = useState(false)
  // §8.4: "la casilla de aceptación no puede venir marcada por defecto".
  // Este `false` es normativo — no lo cambies a true ni lo derives de nada.
  const [acepta, setAcepta] = useState(false)
  const [openFin, setOpenFin] = useState<number | null>(null)
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    analitica: false,
    comercial: false,
    historial_referencia: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [hashDocumento, setHashDocumento] = useState<string | null>(null)
  // §6.3: tras firmar, en la opción C todavía falta el pago. Lo dice el backend.
  const [pagoRequerido, setPagoRequerido] = useState(false)

  // Al reabrir un enlace ya firmado no sabemos si le falta pagar: lo pregunta.
  const sincronizarPago = useCallback(async (t: string) => {
    try {
      const p = await autorizacionPublicService.getPago(t)
      setPago(p)
      setPagoRequerido(p.estado !== 'no_aplica' && p.estado !== 'completado')
    } catch {
      // Sin respuesta dejamos la pantalla de exito tal cual: es el respaldo
      // por correo/WhatsApp, no una pantalla de error.
    }
  }, [])
  // Tras firmar, el enlace de pago lo crea el orquestador fire-and-forget: la
  // pantalla lo espera aqui en vez de mandar al prospecto a buscar un correo.
  const [pago, setPago] = useState<IPagoProspecto | null>(null)
  // Se agotó la espera y el enlace sigue "preparando": deja de prometerlo ya.
  const [esperaAgotada, setEsperaAgotada] = useState(false)

  const cargar = useCallback(() => {
    setPageState('loading')
    setReintentable(false)
    autorizacionPublicService
      .getData(token)
      .then((result) => {
        setData(result)
        setPageState('form')
      })
      .catch((err) => {
        // Reabrir el enlace es un gesto normalísimo: vive en el chat de
        // WhatsApp. Si ya se firmó, esta pantalla es la de éxito, no una
        // alerta roja. Y NUNCA se renderiza err.message: es texto de servidor
        // sin tildes y con el nombre interno del enum ("estado: expirado").
        const code = (err as { code?: string })?.code
        if (code === 'AUTORIZACION_YA_FIRMADA') {
          setPageState('signed')
          void sincronizarPago(token)
          return
        }
        if (code === 'ESTUDIO_NO_ACTIVO') {
          setPageState('inactivo')
          return
        }
        const transitorio = esErrorTransitorio(err)
        setReintentable(transitorio)
        setErrorMessage(
          transitorio
            ? mensajeParaProspecto(err, 'No pudimos abrir tu autorización en este momento.')
            : code === 'AUTORIZACION_EXPIRADA' ||
                code === 'AUTORIZACION_ESTADO_INVALIDO' ||
                code === 'AUTORIZACION_NOT_FOUND'
              ? 'Este enlace ya no está activo. Pídele uno nuevo a quien te lo envió.'
              : 'No pudimos abrir tu autorización. Pídele un enlace nuevo a quien te lo envió.',
        )
        setPageState('error')
      })
  }, [token, sincronizarPago])

  useEffect(() => {
    cargar()
  }, [cargar])

  // "Atrás" del celular: cada paso es una entrada del historial. Sin esto el
  // gesto de volver sacaba al prospecto de la página y perdía lo que llevaba.
  // Pasar del paso 1 exige identidad confirmada y casilla marcada también por
  // aquí: tras recargar (estado en blanco) el historial conserva las entradas
  // de los pasos 2-4, y "Adelante" no puede saltarse la aceptación.
  const irAPaso = useCallback((p: Paso) => {
    window.history.pushState({ paso: p }, '')
    setPaso(p)
  }, [])
  const volverPaso = useCallback(() => window.history.back(), [])
  useEffect(() => {
    // La entrada actual siempre es el paso 1 (una recarga conserva el estado
    // del historial de la entrada en la que estaba).
    window.history.replaceState({ ...window.history.state, paso: 1 }, '')
  }, [])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const p = ((e.state as { paso?: Paso } | null)?.paso ?? 1) as Paso
      setPaso(p !== 1 && !(identidadOk && acepta) ? 1 : p)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [identidadOk, acepta])

  // El paso 1 mide varios miles de px (texto legal íntegro + acordeones) y el
  // botón vive al fondo: sin este reset, al pasar al paso 2 el navegador clampa
  // el scroll al nuevo alto y el prospecto aterriza en el PIE — no llega a ver
  // ninguna de las preguntas del §8.2, justo el bloque de mayor abandono.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [paso])

  // De Beneficios (o de Identidad) a Confirmar (paso 4). Adenda 1 §7: ya no
  // hay OTP en esta etapa; el paso 4 solo confirma lo aceptado en el paso 1.
  const irAFirma = useCallback(() => {
    irAPaso(4)
    setErrorMessage('')
  }, [irAPaso])

  // Salida del paso 3. Si el backend pide biometría, se intercala el cotejo
  // antes de la confirmación final.
  const salirDeBeneficios = useCallback(() => {
    if (data?.biometria?.requerida && data.biometria.estado !== 'verificada') {
      irAPaso('bio')
      return
    }
    irAFirma()
  }, [data?.biometria?.requerida, data?.biometria?.estado, irAFirma, irAPaso])

  // Barra de progreso: 4 tramos, o 5 cuando el backend pide el cotejo. El
  // índice traduce el paso 'bio' a su posición para poder compararlo.
  const conBiometria = !!data?.biometria?.requerida
  const pasosBarra = conBiometria
    ? ['Autorización', 'Sobre ti', 'Permisos', 'Identidad', 'Confirmar']
    : ['Autorización', 'Sobre ti', 'Permisos', 'Confirmar']
  const pasoIndice = paso === 'bio' ? 4 : paso === 4 && conBiometria ? 5 : paso

  // PASO 5 → backend. Una sola llamada al salir de "Sobre ti", con la
  // confirmación de identidad incluida. Best-effort a propósito: lo que el
  // prospecto cuenta aquí no alimenta ninguna decisión (Política V4.1 §4.2),
  // así que un fallo de red NO puede impedirle firmar.
  //
  // El silencio del catch cubre red y 5xx, NO errores de validación: los tres
  // bloques del §8 viajan en un solo POST y el backend rechazaba el body
  // entero, así que un correo mal tecleado del co-arrendatario borraba también
  // la identidad, lo laboral y el ingreso. Ahora hay dos defensas: este chequeo
  // en el campo (el prospecto ve el dedazo y lo corrige) y `.catch(undefined)`
  // por campo en perfilProspectoSchema (un campo malo se cae solo).
  async function guardarPerfilYSeguir() {
    if (presentacion === 'acompanado' && coaEmail.trim() && !EMAIL_RE.test(coaEmail.trim())) {
      setCoaEmailError(true)
      return
    }
    setCoaEmailError(false)
    irAPaso(3)
    const ingresoNum = Number(ingreso.replace(/\D/g, ''))
    const perfil: IPerfilProspectoInput = {
      ...(situacion ? { situacion_laboral: situacion } : {}),
      ...(situacion === 'independiente' && tieneRut !== null ? { tiene_rut: tieneRut } : {}),
      ...(dondeLabora.trim() ? { donde_labora: dondeLabora.trim() } : {}),
      ...(ingresoNum > 0 ? { ingreso_declarado_cop: ingresoNum } : {}),
      ...(presentacion ? { presentacion } : {}),
      ...(presentacion === 'acompanado' && coaNombre.trim() && coaApellido.trim() && (coaEmail.trim() || coaTelefono.trim())
        ? {
            coarrendatario: {
              nombre: coaNombre.trim(),
              apellido: coaApellido.trim(),
              ...(coaEmail.trim() ? { email: coaEmail.trim() } : {}),
              ...(coaTelefono.trim() ? { telefono: coaTelefono.trim() } : {}),
            },
          }
        : {}),
    }
    // UN reintento: un corte de datos móviles no debería perder en silencio lo
    // que el prospecto acaba de contar. Sigue sin bloquear la firma.
    try {
      await autorizacionPublicService.guardarPerfil(token, perfil)
    } catch {
      try {
        await autorizacionPublicService.guardarPerfil(token, perfil)
      } catch {
        // Silencioso y deliberado: ver el comentario de arriba.
      }
    }
  }

  // §8.1: "Se muestran el nombre y el documento registrados para que el
  // prospecto los confirme o corrija." El número NO se muestra (ni los últimos
  // dígitos: serían media respuesta para quien reciba el enlace reenviado); se
  // escribe y la API lo compara. Un error de digitación en la ficha ya no
  // termina consultando a un tercero: si no coincide, el enlace se detiene y
  // el gestor corrige y reenvía (mismo camino que "los datos están mal").
  async function handleConfirmarIdentidad(e: React.FormEvent) {
    e.preventDefault()
    if (verificandoDoc || !documento.trim()) return
    setVerificandoDoc(true)
    setDocumentoError('')
    try {
      const { coincide } = await autorizacionPublicService.confirmarIdentidad(token, documento.trim())
      if (coincide) setIdentidadOk(true)
      else setPageState('no_coincide')
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setPageState('inactivo')
        return
      }
      if (code === 'AUTORIZACION_EXPIRADA' || code === 'AUTORIZACION_NO_VIGENTE' || code === 'AUTORIZACION_NOT_FOUND') {
        setErrorMessage('Este enlace ya no está activo. Pídele uno nuevo a quien te lo envió.')
        setData(null)
        setPageState('error')
        return
      }
      setDocumentoError(mensajeParaProspecto(err, 'No pudimos revisar tu documento. Inténtalo otra vez.'))
    } finally {
      setVerificandoDoc(false)
    }
  }

  // §8.1 + §12: "El prospecto reporta que no es él. El estudio se detiene, se
  // marca para revisión y se notifica al solicitante y a Cofianza."
  //
  // NO hay una opción de "corregir" el documento aquí, y no es un olvido: ese
  // número es el que la firma congela como documento del aceptante y el que el
  // backend compara contra lo que se manda al buró. Si el portador del enlace
  // pudiera reescribirlo, cualquiera podría hacer que se consulte a un tercero
  // que jamás autorizó. Corregir = detener y avisar; el gestor arregla la ficha
  // y reenvía el enlace.
  async function handleReportar() {
    setReportando(true)
    setReporteError('')
    try {
      await autorizacionPublicService.reportarIdentidad(token, {
        motivo: reporteMotivo,
        ...(reporteDetalle.trim() ? { detalle: reporteDetalle.trim() } : {}),
      })
      setReporteAbierto(false)
      setPageState('reportado')
    } catch (err) {
      // ÚNICO punto de esta pantalla donde el silencio es inaceptable: la
      // pantalla "Detuvimos el proceso" afirma tres cosas (el enlace murió,
      // nadie consultará tus datos, Cofianza ya fue avisada) y ninguna es
      // cierta si el POST no llegó. Con datos móviles inestables, un 5xx o un
      // 429 del limitador por IP (las operadoras comparten CGNAT), la
      // autorización sigue 'pendiente' y FIRMABLE — justo el caso del §12 que
      // esto existe para frenar. Sólo estos códigos significan que el enlace
      // ya está muerto de todos modos; con cualquier otro el modal se queda
      // abierto y se puede reintentar.
      const code = (err as { code?: string })?.code
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setReporteAbierto(false)
        setPageState('inactivo')
        return
      }
      if (
        code === 'AUTORIZACION_EXPIRADA' ||
        code === 'AUTORIZACION_NO_VIGENTE' ||
        code === 'AUTORIZACION_NOT_FOUND'
      ) {
        setReporteAbierto(false)
        setPageState('reportado')
        return
      }
      setReporteError('No pudimos registrar tu reporte. Revisa tu conexión e inténtalo otra vez.')
    } finally {
      setReportando(false)
    }
  }

  // Adenda 1 §7: la aceptación por casilla ES la autorización. El backend
  // congela texto, versión, documento, IP, fecha y dispositivo (§8.4).
  async function handleConfirmarYFirmar() {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      const result = await autorizacionPublicService.firmar(token, {
        metodo_firma: 'casilla',
        // §8.1: el mismo documento que la API ya aceptó en el paso 1; la firma
        // lo vuelve a comparar (un POST directo no se salta la confirmación).
        numero_documento: documento.trim(),
        consentimientos_opcionales: consents,
      })
      setHashDocumento(result.hash_documento)
      setPagoRequerido(!!result.pago_requerido)
      setPageState('signed')
    } catch (err) {
      const code = (err as { code?: string })?.code
      // Ya firmada (doble submit o reintento sobre una firma exitosa): pantalla
      // de éxito. OJO: solo para YA_FIRMADA — un enlace invalidado/expirado
      // (NO_VIGENTE) NO es éxito: mostrar "firmado" haría creer al solicitante
      // que terminó cuando nada va a correr.
      // Sólo YA_FIRMADA. ESTADO_INVALIDO estaba aquí también y podía significar
      // 'revocado': habría mostrado "firmado" sobre un enlace que ya no corre.
      if (code === 'AUTORIZACION_YA_FIRMADA') {
        setPageState('signed')
        void sincronizarPago(token)
        return
      }
      if (code === 'ESTUDIO_NO_ACTIVO') {
        setPageState('inactivo')
        return
      }
      if (code === 'DOCUMENTO_NO_COINCIDE') {
        setPageState('no_coincide')
        return
      }
      if (code === 'AUTORIZACION_NO_VIGENTE' || code === 'AUTORIZACION_EXPIRADA') {
        setErrorMessage('Este enlace ya no está vigente. Pide que te reenvíen uno nuevo desde el estudio.')
        setData(null) // pantalla terminal: sin datos no se vuelve a pintar el paso 4 con su boton
        setPageState('error')
        return
      }
      // Aquí no hay a quién preguntarle: el prospecto no tiene sesión ni
      // soporte. Un 429 del limitador por IP o un 5xx crudo lo dejaban sin
      // saber si fue culpa suya.
      setErrorMessage(mensajeParaProspecto(err, 'No pudimos registrar tu autorización. Inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (pageState !== 'signed' || !pagoRequerido) return
    let intentos = 0
    let vivo = true
    const consultar = async () => {
      try {
        const p = await autorizacionPublicService.getPago(token)
        if (!vivo) return
        setPago(p)
        // Todo menos 'preparando' es definitivo para esta pantalla.
        if (p.payment_link_url || p.estado !== 'preparando') return true
      } catch {
        // silencioso: la pantalla ya muestra el respaldo por correo/WhatsApp
      }
      return false
    }
    // 3 minutos: el API pasa a 'sin_enlace' a los 2 de la firma.
    const id = setInterval(async () => {
      intentos += 1
      const listo = await consultar()
      if (listo || intentos >= 45) {
        clearInterval(id)
        if (!listo && vivo) setEsperaAgotada(true)
      }
    }, 4000)
    void consultar()
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [pageState, pagoRequerido, token])

  // ── Pantallas de estado ────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader size={28} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (pageState === 'error' && !data) {
    return (
      <Card>
        <div className="px-6 py-10 text-center">
          <div
            className={cn(
              'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
              reintentable ? 'bg-amber-100' : 'bg-red-100',
            )}
          >
            <IconAlertTriangle size={24} className={reintentable ? 'text-amber-600' : 'text-red-600'} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {reintentable ? 'No pudimos cargar la página' : 'Este enlace no está disponible'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{errorMessage}</p>
          {reintentable && (
            <button
              type="button"
              onClick={cargar}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-800"
            >
              <IconRefresh size={16} /> Reintentar
            </button>
          )}
        </div>
      </Card>
    )
  }

  // §12: cierre neutro. Ni "rechazado" ni culpa — el §13 prohíbe esa palabra
  // en pantallas del prospecto.
  if (pageState === 'reportado') {
    return (
      <Card>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <IconUserX size={28} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Detuvimos el proceso</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            Gracias por avisarnos. Este enlace ya no sirve y <strong>nadie va a consultar tus datos</strong> con
            él. El equipo de Cofianza ya fue notificado y revisará el caso.
          </p>
          <p className="mt-4 text-sm text-gray-500">Puedes cerrar esta página.</p>
        </div>
      </Card>
    )
  }

  // Estudio cancelado o cerrado mientras el enlace seguía en el chat: nada que
  // firmar. Neutro a propósito (§13: ni "rechazado" ni culpa).
  if (pageState === 'inactivo') {
    return (
      <Card>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <IconShield size={28} className="text-gray-500" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Este estudio ya no está activo</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            No hay nada que autorizar con este enlace y no vamos a consultar tus datos con él. Si tienes dudas,
            escríbele a quien te lo envió.
          </p>
          <p className="mt-4 text-sm text-gray-500">Puedes cerrar esta página.</p>
        </div>
      </Card>
    )
  }

  // §8.1: el documento escrito no es el registrado. Puede ser un error en la
  // ficha o en lo que se escribió; en los dos casos se detiene, sin revelar
  // cuál es el número registrado.
  if (pageState === 'no_coincide') {
    return (
      <Card>
        <div className="px-6 py-10 text-center" role="status">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <IconUserX size={28} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">El documento no coincide</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            El número que escribiste no es el que tenemos registrado. Para no consultar los datos de otra
            persona, <strong>detuvimos el proceso</strong> y le avisamos a quien te envió el enlace: revisará los
            datos y te enviará uno nuevo.
          </p>
          <p className="mt-4 text-sm text-gray-500">Puedes cerrar esta página.</p>
        </div>
      </Card>
    )
  }

  if (pageState === 'signed') {
    return (
      <Card>
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <IconCheck size={30} className="text-primary-700" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">¡Autorización firmada!</h2>
          <p className="mt-1 text-sm text-gray-500">
            Tu autorización quedó registrada con firma electrónica (Ley 527/1999).
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Si quieres revocarla, escríbenos a{' '}
            <a href="mailto:hola@cofianza.co" className="font-medium text-primary-700 underline">
              hola@cofianza.co
            </a>
            .
          </p>
          {/* El SHA-256 completo a la vista se leía como un error de la
              página. Sigue disponible (es su soporte legal), pero plegado. */}
          {hashDocumento && (
            <details className="mx-auto mt-4 max-w-md text-left">
              <summary className="cursor-pointer text-xs text-gray-500">Ver código de verificación</summary>
              <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-500">
                {hashDocumento}
              </p>
            </details>
          )}
          {/* Cada estado del cobro dice qué sigue. Antes, si el enlace no se
              generaba (sin correo, tope de canon, pasarela caída) o el pago
              estaba en proceso por PSE, la pantalla decía "estamos preparando
              tu enlace" para siempre. */}
          {pagoRequerido ? (
            <div className="mt-5">
              {pago?.payment_link_url ? (
                <>
                  <p className="mb-3 text-sm text-gray-600">
                    Falta un paso: pagar el estudio. Tu evaluación arranca apenas se confirme el pago.
                  </p>
                  <a
                    href={pago.payment_link_url}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-primary-700 px-5 py-3 text-base font-semibold text-white hover:bg-primary-800 sm:w-auto"
                  >
                    Pagar {pago.monto_formateado ?? 'el estudio'} ahora
                  </a>
                  <p className="mt-2 text-xs text-gray-500">
                    También te lo enviamos por correo y WhatsApp por si prefieres pagarlo después.
                  </p>
                </>
              ) : pago?.estado === 'completado' ? (
                <p className="text-sm font-medium text-primary-700">
                  Tu pago ya está registrado y tu evaluación está en marcha. No tienes que hacer nada más.
                </p>
              ) : pago?.estado === 'procesando' ? (
                <p className="text-sm text-gray-600">
                  Tu pago está en proceso. Apenas el banco lo confirme arrancamos tu evaluación:{' '}
                  <strong>no necesitas pagar de nuevo.</strong>
                </p>
              ) : pago?.estado === 'sin_enlace' ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                  El enlace para pagar el estudio no se generó automáticamente. Pídeselo a quien te envió este
                  enlace: cuando lo genere te llegará por correo y WhatsApp. No tienes que volver a autorizar.
                </p>
              ) : esperaAgotada ? (
                <p className="text-sm text-gray-600">
                  Tu enlace de pago está tardando más de lo normal. Te llegará por correo y WhatsApp; también
                  puedes recargar esta página en unos minutos.
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <IconLoader size={16} className="shrink-0 animate-spin" />
                  Estamos preparando tu enlace de pago{pago?.monto_formateado ? ` de ${pago.monto_formateado}` : ''}…
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No tienes que hacer nada más aquí. Quien te envió este enlace te contará cómo avanza tu estudio.
              Puedes cerrar esta página.
            </p>
          )}
        </div>
      </Card>
    )
  }

  const resumen = [
    { txt: 'Tratamiento de datos personales', lock: 'Obligatorio', on: true },
    { txt: 'Consulta y reporte a centrales de riesgo', lock: 'Obligatorio', on: true },
    { txt: 'Historial de comportamiento de pago', lock: 'Obligatorio', on: true },
    { txt: 'Analítica y personalización', lock: 'Opcional', on: consents.analitica },
    { txt: 'Ofertas y comunicaciones comerciales', lock: 'Opcional', on: consents.comercial },
    { txt: 'Historial como referencia ante terceros', lock: 'Opcional', on: consents.historial_referencia },
  ]

  return (
    <Card>
      {/* Header de marca */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-white">
            <IconShieldCheck size={18} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Autorización de datos</p>
            <p className="text-[11px] text-gray-500">Cofianza S.A.S. · NIT 902.038.122</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
          <IconLock size={12} /> Conexión protegida
        </span>
      </div>

      {/* Progreso. El paso de identidad solo existe si el backend lo pide, así
          que la barra tiene 4 o 5 tramos según el interruptor — pintar cinco
          siempre le prometería al prospecto un paso que no va a ver. */}
      <div className={cn('grid gap-1.5 px-5 pt-4', pasosBarra.length === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
        {pasosBarra.map((label, i) => {
          const on = pasoIndice >= i + 1
          return (
            <div key={label}>
              <div className={cn('h-1.5 rounded-full', on ? 'bg-primary-600' : 'bg-gray-200')} />
              <p className={cn('mt-1 text-[10px] font-bold leading-tight', on ? 'text-primary-700' : 'text-gray-500')}>
                {i + 1} · {label}
              </p>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-5">
        {/* ── Paso 1: Autorización ── */}
        {paso === 1 && data && (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
              <IconShieldCheck size={13} /> Paso 1 · Obligatorio
            </span>
            {/*
              §8.1 Confirmación de identidad. Va PRIMERO y gatea el resto del
              paso: confirmar quién eres antes de leer qué autorizas es el orden
              lógico, y así el prospecto no aterriza en un muro legal.

              El número NO se muestra: el prospecto lo escribe y la API lo
              compara (handleConfirmarIdentidad). §12: "la confirmación de
              identidad y el registro del documento aceptante son la defensa"
              contra un enlace reenviado a un tercero.
            */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <IconId size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-extrabold tracking-tight text-gray-900">¿Eres tú?</h1>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Estos son los datos registrados en tu estudio.
                  </p>
                  <p className="mt-2 truncate text-base font-bold text-gray-900">
                    {data.solicitante.nombre} {data.solicitante.apellido}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Inmueble: {data.expediente.inmueble.direccion}, {data.expediente.inmueble.ciudad}
                  </p>
                </div>
              </div>

              {identidadOk ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary-700">
                  <IconUserCheck size={14} /> Confirmaste que eres tú
                </p>
              ) : (
                <form onSubmit={handleConfirmarIdentidad} className="mt-4 space-y-2" noValidate>
                  <label htmlFor="numero-documento" className="block text-sm font-bold text-gray-900">
                    Escribe tu número de {tipoDocumentoLabel(data.solicitante.tipo_documento)}
                  </label>
                  <input
                    id="numero-documento"
                    type="text"
                    inputMode={data.solicitante.tipo_documento === 'pasaporte' ? 'text' : 'numeric'}
                    autoComplete="off"
                    value={documento}
                    maxLength={30}
                    onChange={(e) => {
                      setDocumento(e.target.value)
                      if (documentoError) setDocumentoError('')
                    }}
                    aria-describedby="numero-documento-ayuda"
                    aria-invalid={!!documentoError}
                    disabled={verificandoDoc}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                    placeholder="Ej.: 1023456789"
                  />
                  <p id="numero-documento-ayuda" className="text-xs leading-relaxed text-gray-500">
                    Lo comparamos con el que registró quien te envió este enlace; por tu seguridad no te lo
                    mostramos. Si no coincide, detenemos el proceso para no consultar los datos de otra persona.
                  </p>
                  {documentoError && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {documentoError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={verificandoDoc || !documento.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verificandoDoc && <IconLoader size={18} className="animate-spin" />}
                    {verificandoDoc ? 'Revisando…' : 'Sí, soy yo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReporteAbierto(true)}
                    className="w-full py-2 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-700"
                  >
                    Estos datos no corresponden
                  </button>
                </form>
              )}
            </div>

            {identidadOk && (
            <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Autoriza el uso de tus datos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Para hacer tu estudio y actuar como tu fiador, {data.solicitante.nombre}, necesitamos tratar
                tus datos. Toca cada punto para ver el detalle:
              </p>
            </div>

            {/* Finalidades (acordeones) */}
            <div className="space-y-2.5">
              {FINALIDADES.map((f, i) => {
                const open = openFin === i
                return (
                  <div key={f.titulo} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenFin(open ? null : i)}
                      className="flex w-full items-center gap-3 p-3.5 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <f.Icon size={17} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-gray-900">{f.titulo}</span>
                        <span className="block text-[11px] text-gray-500">{f.sub}</span>
                      </span>
                      <IconChevronDown
                        size={16}
                        className={cn('shrink-0 text-gray-500 transition-transform', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <ul className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                        {f.detalle.map((d) => (
                          <li key={d} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                            <span>{d === SIN_DATOS_SENSIBLES && conBiometria ? CON_BIOMETRIA : d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>

            {/*
              Autorización legal completa, SIEMPRE visible.
              Flujo del módulo de estudios §8.4: "El texto de la autorización
              debe estar visible en la pantalla, no oculto tras un enlace".
              Antes vivía tras un desplegable "Ver autorización legal completa".
              No volver a esconderlo tras un botón, un modal ni un enlace.
            */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Autorización legal completa</h2>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Este es el texto íntegro que estás aceptando. Versión {data.version_terminos}.
                </p>
              </div>
              <div className="whitespace-pre-wrap bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                {data.texto_legal}
              </div>
            </div>

            {/* Ley 1581 art. 8 + Decreto 1377 art. 9: el titular revoca ante Cofianza, por este canal. */}
            <p className="text-xs leading-relaxed text-gray-500">
              Puedes revocar esta autorización cuando quieras escribiéndonos a{' '}
              <a href="mailto:hola@cofianza.co" className="font-medium text-primary-700 underline">
                hola@cofianza.co
              </a>
              . La revocación la haces tú, ante Cofianza.
            </p>

            {/* Aceptación */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
              <input
                type="checkbox"
                checked={acepta}
                onChange={(e) => setAcepta(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                <strong>He leído, comprendido y acepto</strong> la autorización de tratamiento de datos y la
                Política de Privacidad de Cofianza S.A.S.
              </span>
            </label>

            <button
              type="button"
              onClick={() => irAPaso(2)}
              disabled={!acepta}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Acepto y continúo <IconArrowRight size={16} />
            </button>
            </div>
            )}
          </div>
        )}


        {/* ── Paso 2: Sobre ti (§8.2 laboral/ingreso + §8.3 solo o acompañado) ── */}
        {paso === 2 && (
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-700">
              Paso 2 · Opcional
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Cuéntanos un poco de ti</h2>
              <p className="mt-1 text-sm text-gray-500">
                Con esto encontramos la mejor opción para tu caso. Si prefieres no responder algo, déjalo en
                blanco y sigue.
              </p>
            </div>

            {/* §8.2 Situación laboral — selección simple */}
            <div>
              <p className="text-sm font-bold text-gray-900">¿Cuál es tu situación hoy?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SITUACIONES.map((sit) => {
                  const on = situacion === sit.key
                  return (
                    <button
                      key={sit.key}
                      type="button"
                      onClick={() => setSituacion(on ? null : sit.key)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                        on
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-700',
                      )}
                    >
                      {sit.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {situacion === 'independiente' && (
              <div>
                <p className="text-sm font-bold text-gray-900">¿Tienes RUT activo?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([true, false] as const).map((v) => {
                    const on = tieneRut === v
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTieneRut(on ? null : v)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                          on
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-white text-gray-700',
                        )}
                      >
                        {v ? 'Sí' : 'No'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* §8.2 Dónde labora */}
            <div>
              <label htmlFor="donde-labora" className="text-sm font-bold text-gray-900">
                {SITUACIONES.find((x) => x.key === situacion)?.pregunta ?? '¿Dónde trabajas?'}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
                <IconBuilding2 size={16} className="shrink-0 text-gray-500" />
                <input
                  id="donde-labora"
                  type="text"
                  value={dondeLabora}
                  maxLength={200}
                  onChange={(e) => setDondeLabora(e.target.value)}
                  placeholder={SITUACIONES.find((x) => x.key === situacion)?.placeholder || 'Empresa o actividad'}
                  className="w-full border-0 bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/*
              §8.2 Ingresos. La redacción es literal del documento ("en lugar de
              'cuánto gana', usar una fórmula como '¿Cuánto recibes al mes,
              aproximadamente?'") y la nota explica para qué se usa.

              La promesa está ACOTADA a propósito: "esta cifra", no "tus
              ingresos". El comprobante de ingresos sigue siendo un documento
              del expediente que la inmobiliaria puede descargar; prometer más
              sería incumplible y verificable.
            */}
            <div>
              <label htmlFor="ingreso" className="text-sm font-bold text-gray-900">
                ¿Cuánto recibes al mes, aproximadamente?
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
                <span className="shrink-0 text-base font-bold text-gray-500">$</span>
                <input
                  id="ingreso"
                  type="text"
                  inputMode="numeric"
                  value={ingreso}
                  onChange={(e) => {
                    // 9 dígitos: por encima el schema (max 1.000.000.000) rechazaría el campo.
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                    setIngreso(digits ? Number(digits).toLocaleString('es-CO') : '')
                  }}
                  placeholder="0"
                  className="w-full border-0 bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
                />
              </div>
              <p className="mt-2 flex gap-2 rounded-lg bg-primary-50 p-3 text-xs leading-relaxed text-primary-800">
                <IconLock size={14} className="mt-0.5 shrink-0 text-primary-600" />
                <span>
                  Nos ayuda a encontrar la mejor opción para ti. <strong>Esta cifra no se la mostramos a la
                  inmobiliaria</strong>: la ve solo el equipo de Cofianza.
                </span>
              </p>
            </div>

            {/* §8.3 Solo o acompañado */}
            <div>
              <p className="text-sm font-bold text-gray-900">¿Presentas el estudio solo o acompañado?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { key: 'solo' as const, Icon: IconUser, label: 'Solo' },
                  { key: 'acompanado' as const, Icon: IconUsers, label: 'Con alguien más' },
                ].map((op) => {
                  const on = presentacion === op.key
                  return (
                    <button
                      key={op.key}
                      type="button"
                      onClick={() => setPresentacion(on ? null : op.key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-semibold transition-colors',
                        on
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-700',
                      )}
                    >
                      <op.Icon size={20} />
                      {op.label}
                    </button>
                  )
                })}
              </div>

              {/* El mensaje que rompe la objeción más frecuente del mercado (§8.3).
                  Alineado con la plantilla de WhatsApp que ya está en producción
                  ("no eres fiador ni codeudor"). */}
              <p className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs leading-relaxed text-primary-800">
                Un co-arrendatario <strong>no necesita tener finca raíz</strong>. No es fiador ni codeudor:
                respondemos por los dos como un solo arrendatario.
              </p>

              {presentacion === 'acompanado' && (
                <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {/* La promesa anterior ("tú no tienes que repetir nada") no
                      era verificable: si el estudio queda condicionado, la card
                      del co-arrendatario sí le pide la cédula. Prometemos solo
                      lo que la card cumple. */}
                  <p className="text-xs text-gray-500">
                    Déjanos sus datos. Cuando avancemos con tu estudio solo te pediremos su cédula: sus datos
                    ya quedan guardados.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={coaNombre}
                      maxLength={100}
                      onChange={(e) => setCoaNombre(e.target.value)}
                      placeholder="Nombre"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={coaApellido}
                      maxLength={100}
                      onChange={(e) => setCoaApellido(e.target.value)}
                      placeholder="Apellido"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <input
                    type="email"
                    value={coaEmail}
                    maxLength={120}
                    onChange={(e) => {
                      setCoaEmail(e.target.value)
                      if (coaEmailError) setCoaEmailError(false)
                    }}
                    placeholder="Su correo"
                    className={cn(
                      'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500',
                      coaEmailError ? 'border-red-300' : 'border-gray-200',
                    )}
                  />
                  {coaEmailError && (
                    <p className="text-xs text-red-600">
                      Revisa este correo: parece incompleto. También puedes borrarlo y dejarnos solo su
                      WhatsApp.
                    </p>
                  )}
                  <input
                    type="tel"
                    inputMode="tel"
                    value={coaTelefono}
                    maxLength={20}
                    onChange={(e) => setCoaTelefono(e.target.value)}
                    placeholder="Su WhatsApp (opcional)"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>

            {/* Nunca deshabilitado: §8.2 es, según el propio documento, donde
                más gente abandona. Todo aquí es opcional. */}
            <button
              type="button"
              onClick={guardarPerfilYSeguir}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800"
            >
              Continuar <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={volverPaso}
              className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600"
            >
              <IconArrowLeft size={14} /> Volver
            </button>
          </div>
        )}

        {/* ── Paso 3: Beneficios (opcional) ── */}
        {paso === 3 && (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-700">
              Paso 3 · Opcional
            </span>
            <div>
              {/* "Tu cuenta" hacía dudar al prospecto: llegó por un enlace de
                  WhatsApp y no tiene ninguna cuenta creada. */}
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Permisos opcionales a tu favor</h2>
              <p className="mt-1 text-sm text-gray-500">
                {BENEFICIOS.length === 3 ? 'Tres' : BENEFICIOS.length} permisos opcionales que trabajan a tu favor. Tú eliges cuáles encender — y los cambias cuando
                quieras. Tu fianza funciona igual, los actives o no.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs font-medium text-primary-800">
              <IconCheck size={14} className="shrink-0 text-primary-600" />
              Nada se activa sin tu permiso. Enciende solo lo que te sirva.
            </div>

            <div className="space-y-3">
              {BENEFICIOS.map((b) => {
                const on = consents[b.key]
                return (
                  <div key={b.key} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <b.Icon size={17} />
                      </span>
                      <div className="flex-1">
                        <p id={`ben-${b.key}-t`} className="text-sm font-bold text-gray-900">{b.titulo}</p>
                      </div>
                      <Toggle
                        on={on}
                        onClick={() => setConsents((c) => ({ ...c, [b.key]: !c[b.key] }))}
                        labelledBy={`ben-${b.key}-t`}
                        describedBy={`ben-${b.key}-d`}
                      />
                    </div>
                    <p id={`ben-${b.key}-d`} className="mt-2 text-xs leading-relaxed text-gray-500">{b.desc}</p>
                    <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Opcional
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-600">
              No marcar estas opciones no condiciona, limita ni restringe el acceso a los servicios de Cofianza.
            </p>

            <button
              type="button"
              onClick={salirDeBeneficios}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800"
            >
              Continuar <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={volverPaso}
              className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600"
            >
              <IconArrowLeft size={14} /> Volver
            </button>
          </div>
        )}

        {/* ── Paso 'bio': verificación de identidad (Política Anexo A + §14).
            El componente NUNCA bloquea: `onContinuar` se dispara igual si el
            cotejo falla o si el prospecto ejerce su derecho a negarse. ── */}
        {paso === 'bio' && (
          <CapturaBiometrica
            token={token}
            estadoPrevio={data?.biometria?.estado ?? null}
            onContinuar={irAFirma}
            onVolver={volverPaso}
          />
        )}

        {/* ── Paso 4: Confirmar (Adenda 1 §7: sin OTP) ── */}
        {paso === 4 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <IconShieldCheck size={28} />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Confirma tu autorización</h2>
              <p className="mt-1 text-sm text-gray-500">
                Revisa el resumen y confirma. Con eso queda autorizada la consulta y arranca tu estudio.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800">
              <IconShieldCheck size={14} className="mt-0.5 shrink-0 text-primary-600" />
              Al confirmar aceptas el texto que leíste en el paso 1. Tu aceptación queda registrada con fecha, hora,
              dispositivo y documento (Decreto 1377 de 2013, art. 7).
            </div>

            {/* Resumen */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                Resumen de tu autorización
              </p>
              <ul className="space-y-2">
                {resumen.map((r) => (
                  <li key={r.txt} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded',
                        r.on ? 'bg-primary-700 text-white' : 'border border-gray-300 text-transparent',
                      )}
                    >
                      <IconCheck size={11} />
                    </span>
                    <span className="flex-1 text-gray-700">{r.txt}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{r.lock}</span>
                  </li>
                ))}
              </ul>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
            )}

            <button
              type="button"
              onClick={handleConfirmarYFirmar}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <IconLoader size={20} className="animate-spin" />}
              {submitting ? 'Registrando…' : 'Confirmar y autorizar'}
            </button>

            <button
              type="button"
              onClick={volverPaso}
              className="mx-auto inline-flex min-h-11 items-center gap-1 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-600"
            >
              <IconArrowLeft size={14} /> Volver
            </button>
          </div>
        )}
      </div>

      {/*
        §8.1 "Si los datos no corresponden a esa persona, debe existir una
        opcion para reportarlo y detener el proceso." Modal propio (nunca
        window.confirm) porque hace falta elegir motivo y poder escribir.
      */}
      <Modal
        isOpen={reporteAbierto}
        onClose={() => !reportando && setReporteAbierto(false)}
        title="¿Qué pasa con estos datos?"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Si algo no cuadra, detenemos el proceso ahora mismo y avisamos a Cofianza. No se consultará ninguna
            central de riesgo.
          </p>
          {MOTIVOS_REPORTE.map((m) => {
            const on = reporteMotivo === m.key
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setReporteMotivo(m.key)}
                className={cn(
                  'block w-full rounded-xl border p-3 text-left transition-colors',
                  on ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white',
                )}
              >
                <span className={cn('block text-sm font-bold', on ? 'text-primary-800' : 'text-gray-900')}>
                  {m.label}
                </span>
                <span className="block text-xs text-gray-500">{m.sub}</span>
              </button>
            )
          })}
          {/* text-base, no text-sm: Safari iOS amplía la página al enfocar
              cualquier campo con font-size < 16px, y el modal es fixed inset-0
              — queda cortado por los lados y el zoom no se deshace solo. */}
          <textarea
            value={reporteDetalle}
            maxLength={500}
            rows={3}
            onChange={(e) => setReporteDetalle(e.target.value)}
            placeholder="¿Quieres contarnos algo más? (opcional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
          {reporteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{reporteError}</div>
          )}
          <button
            type="button"
            onClick={handleReportar}
            disabled={reportando}
            className="w-full rounded-lg bg-primary-700 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            {reportando ? 'Enviando…' : 'Detener y avisar a Cofianza'}
          </button>
          <button
            type="button"
            onClick={() => setReporteAbierto(false)}
            disabled={reportando}
            className="mx-auto flex min-h-11 items-center px-4 text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </Card>
  )
}

// Con nombre accesible: sin él, el lector de pantalla anunciaba tres veces
// "interruptor, desactivado" sin decir qué se autorizaba (Ley 1581).
function Toggle({
  on,
  onClick,
  labelledBy,
  describedBy,
}: {
  on: boolean
  onClick: () => void
  labelledBy?: string
  describedBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        on ? 'bg-primary-600' : 'bg-gray-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

// "Escribe tu número de …" del paso 1 (enum tipo_documento de la API).
const TIPO_DOCUMENTO_TEXTO: Record<string, string> = {
  cc: 'cédula de ciudadanía',
  ce: 'cédula de extranjería',
  ti: 'tarjeta de identidad',
  pasaporte: 'pasaporte',
  ppt: 'PPT',
  pep: 'PEP',
  nit: 'NIT',
}

function tipoDocumentoLabel(tipo: string | null | undefined): string {
  return TIPO_DOCUMENTO_TEXTO[tipo ?? ''] ?? 'documento'
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{children}</div>
    </div>
  )
}
