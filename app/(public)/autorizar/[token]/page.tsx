/**
 * Página pública de autorización de tratamiento de datos (habeas data).
 * Sin login: token-gated. Tarjeta centrada + header de marca + 4 pasos —
 *   Paso 1: §8.1 confirmación de identidad → finalidades + autorización legal
 *           + aceptación (obligatorio). El resto del paso NO se muestra hasta
 *           que el prospecto confirma quién es: confirmar antes de leer qué
 *           autoriza es el orden lógico del §8.1, y de paso deja de aterrizar
 *           en un muro legal.
 *   Paso 2: §8.2 laboral + ingreso y §8.3 solo/acompañado ("Sobre ti").
 *   Paso 3: beneficios (3 consentimientos OPCIONALES con toggle).
 *   Paso 4: firma con OTP de 6 casillas + resumen.
 *
 * POR QUÉ §8.2/§8.3 VAN ANTES DE LA FIRMA Y NO DESPUÉS: el OTP se dispara al
 * ENTRAR al paso de firma (irAFirma) y caduca a los 5 minutos. Un formulario
 * después de ese disparo llevaría al prospecto a firmar con OTP_EXPIRADO.
 *
 * Todo lo de "Sobre ti" es OPCIONAL y el botón Continuar nunca se deshabilita:
 * el propio documento señala §8.2 como el punto de mayor abandono, y lo único
 * irrecuperable de esta pantalla es la firma.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { autorizacionPublicService } from '@/services/autorizacionService'
import type { IAutorizacionPublicData } from '@/types/autorizacion'
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
  IconUser,
} from '@/components/icons'
import { Modal } from '@/components/ui/Modal'

type PageState = 'loading' | 'form' | 'signed' | 'error' | 'reportado'
type OtpState = 'idle' | 'sending' | 'sent'
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

const FINALIDADES = [
  {
    Icon: IconActivity,
    titulo: 'Evaluamos tu solicitud en segundos',
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
      'No tratamos datos sensibles ni de menores; el servicio es solo para mayores de 18 años.',
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

  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1)
  // §8.1: gatea el resto del paso 1. Es un acto de UI (no premarcado) y viaja
  // al backend como `identidad_confirmada: true`.
  const [identidadOk, setIdentidadOk] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const [reporteMotivo, setReporteMotivo] = useState<'no_soy_yo' | 'datos_incorrectos'>('no_soy_yo')
  const [reporteDetalle, setReporteDetalle] = useState('')
  const [reportando, setReportando] = useState(false)
  // §12: el error del reporte se muestra DENTRO del modal. La pantalla
  // "Detuvimos el proceso" sólo se pinta cuando el servidor lo confirmó.
  const [reporteError, setReporteError] = useState('')
  // §8.2 / §8.3 — todo opcional.
  const [situacion, setSituacion] = useState<SituacionLaboral | null>(null)
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

  const [otpState, setOtpState] = useState<OtpState>('idle')
  // Una casilla por posición (array de 6). Evita el desalineado del modelo string
  // compactado: cada índice de casilla corresponde 1:1 con su dígito.
  const [otpDigits, setOtpDigits] = useState<string[]>(() => ['', '', '', '', '', ''])
  const [otpCooldown, setOtpCooldown] = useState(0)
  // Marca si el código actual YA fue verificado en el backend. Evita re-verificar
  // en un reintento de firma (re-verificar un OTP ya consumido falla y atasca).
  const [otpVerified, setOtpVerified] = useState(false)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  const otpCodigo = otpDigits.join('')
  const otpCompleto = otpDigits.every((d) => d !== '')

  useEffect(() => {
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
          return
        }
        setErrorMessage(
          code === 'AUTORIZACION_EXPIRADA' ||
            code === 'AUTORIZACION_ESTADO_INVALIDO' ||
            code === 'AUTORIZACION_NOT_FOUND'
            ? 'Este enlace ya no está activo. Pídele uno nuevo a quien te lo envió.'
            : 'No pudimos abrir tu solicitud en este momento. Vuelve a intentarlo en un rato.',
        )
        setPageState('error')
      })
  }, [token])

  // El paso 1 mide varios miles de px (texto legal íntegro + acordeones) y el
  // botón vive al fondo: sin este reset, al pasar al paso 2 el navegador clampa
  // el scroll al nuevo alto y el prospecto aterriza en el PIE — no llega a ver
  // ninguna de las preguntas del §8.2, justo el bloque de mayor abandono.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [paso])

  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [otpCooldown])

  const handleEnviarOtp = useCallback(async () => {
    setOtpState('sending')
    setErrorMessage('')
    // Un código nuevo invalida el anterior: limpiamos input y estado de verificación.
    setOtpDigits(['', '', '', '', '', ''])
    setOtpVerified(false)
    try {
      await autorizacionPublicService.enviarOtp(token)
      setOtpState('sent')
      setOtpCooldown(60)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al enviar el código')
      setOtpState('idle')
    }
  }, [token])

  // De Beneficios (paso 3) a Firma (paso 4): enviamos el OTP al entrar. Es el
  // ÚNICO disparador del OTP y por eso nada que pida escribir va después.
  const irAFirma = useCallback(() => {
    setPaso(4)
    if (otpState === 'idle') void handleEnviarOtp()
  }, [otpState, handleEnviarOtp])

  function setOtpDigit(i: number, val: string) {
    const d = val.replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const next = [...prev]
      next[i] = d
      return next
    })
    if (d && i < 5) otpRefs.current[i + 1]?.focus()
  }
  function onOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    // Backspace en casilla vacía: retrocede a la anterior (que sí tiene dígito).
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }
  function onOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      e.preventDefault()
      const next = ['', '', '', '', '', '']
      for (let k = 0; k < pasted.length; k++) next[k] = pasted[k]
      setOtpDigits(next)
      otpRefs.current[Math.min(pasted.length, 5)]?.focus()
    }
  }

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
    setPaso(3)
    const ingresoNum = Number(ingreso.replace(/\D/g, ''))
    try {
      await autorizacionPublicService.guardarPerfil(token, {
        identidad_confirmada: true,
        ...(situacion ? { situacion_laboral: situacion } : {}),
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
      })
    } catch {
      // Silencioso y deliberado: ver el comentario de arriba.
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

  async function handleConfirmarYFirmar() {
    if (!otpCompleto || submitting) return
    setSubmitting(true)
    setErrorMessage('')
    try {
      // Verificar solo si este código aún no se verificó. Si una firma previa
      // falló por algo transitorio, el OTP ya quedó verificado en el backend;
      // re-verificarlo daría "no hay código pendiente" y dejaría al usuario atascado.
      if (!otpVerified) {
        await autorizacionPublicService.verificarOtp(token, otpCodigo)
        setOtpVerified(true)
      }
      const result = await autorizacionPublicService.firmar(token, {
        metodo_firma: 'otp',
        codigo_otp: otpCodigo,
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
        return
      }
      if (code === 'AUTORIZACION_NO_VIGENTE' || code === 'AUTORIZACION_EXPIRADA') {
        setErrorMessage('Este enlace ya no está vigente. Pide que te reenvíen uno nuevo desde el expediente.')
        setPageState('error')
        return
      }
      // El OTP ya no sirve (expiró / no hay pendiente): forzamos re-verificación
      // y sugerimos reenviar.
      if (code === 'OTP_EXPIRADO' || code === 'OTP_NOT_FOUND' || code === 'OTP_NO_VERIFICADO') {
        setOtpVerified(false)
      }
      setErrorMessage(err instanceof Error ? err.message : 'Código incorrecto o error al firmar')
    } finally {
      setSubmitting(false)
    }
  }

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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <IconAlertTriangle size={24} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Este enlace no está disponible</h2>
          <p className="mt-1 text-sm text-gray-500">{errorMessage}</p>
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
          <p className="mt-4 text-sm text-gray-400">Puedes cerrar esta página.</p>
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
            {pagoRequerido
              ? ' Te acabamos de enviar por correo y WhatsApp el enlace para pagar el estudio: tu evaluación se ejecuta apenas se confirme el pago.'
              : ' Ya puedes continuar con tu solicitud de fianza.'}
          </p>
          {hashDocumento && (
            <p className="mx-auto mt-4 max-w-md break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-400">
              Verificación: {hashDocumento}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            {pagoRequerido ? 'Revisa tu correo y tu WhatsApp para completar el pago.' : 'Puedes cerrar esta página.'}
          </p>
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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
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

      {/* Progreso */}
      <div className="grid grid-cols-4 gap-1.5 px-5 pt-4">
        {['Autorización', 'Sobre ti', 'Beneficios', 'Firma'].map((label, i) => {
          const on = paso >= i + 1
          return (
            <div key={label}>
              <div className={cn('h-1.5 rounded-full', on ? 'bg-primary-600' : 'bg-gray-200')} />
              <p className={cn('mt-1 text-[10px] font-bold leading-tight', on ? 'text-primary-700' : 'text-gray-400')}>
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

              El documento va ENMASCARADO (últimos 4). §12: "el enlace es único
              y personal [...] la confirmación de identidad y el registro del
              documento aceptante son la defensa" contra un enlace reenviado a
              un tercero — mostrar el número completo le regalaría la respuesta
              al impostor.
            */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <IconId size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-extrabold tracking-tight text-gray-900">¿Eres tú?</h1>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Estos son los datos con los que nos llegó tu solicitud.
                  </p>
                  <p className="mt-2 truncate text-base font-bold text-gray-900">
                    {data.solicitante.nombre} {data.solicitante.apellido}
                  </p>
                  {data.solicitante.numero_documento_masked && (
                    <p className="text-sm font-medium text-gray-500">
                      {(data.solicitante.tipo_documento || 'Documento').toUpperCase()}{' '}
                      {data.solicitante.numero_documento_masked}
                    </p>
                  )}
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
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIdentidadOk(true)}
                    className="w-full rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700"
                  >
                    Sí, soy yo
                  </button>
                  <button
                    type="button"
                    onClick={() => setReporteAbierto(true)}
                    className="w-full py-2 text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-700"
                  >
                    Estos datos no corresponden
                  </button>
                </div>
              )}
            </div>

            {identidadOk && (
            <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Autoriza el uso de tus datos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Para estudiar tu solicitud y actuar como tu fiador, {data.solicitante.nombre}, necesitamos tratar
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
                        className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')}
                      />
                    </button>
                    {open && (
                      <ul className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                        {f.detalle.map((d) => (
                          <li key={d} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                            <span>{d}</span>
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
              onClick={() => setPaso(2)}
              disabled={!acepta}
              className="w-full rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Acepto y continúo →
            </button>
            </div>
            )}
          </div>
        )}


        {/* ── Paso 2: Sobre ti (§8.2 laboral/ingreso + §8.3 solo o acompañado) ── */}
        {paso === 2 && (
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-600">
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

            {/* §8.2 Dónde labora */}
            <div>
              <label htmlFor="donde-labora" className="text-sm font-bold text-gray-900">
                {SITUACIONES.find((x) => x.key === situacion)?.pregunta ?? '¿Dónde trabajas?'}
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
                <IconBuilding2 size={16} className="shrink-0 text-gray-400" />
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
                <span className="shrink-0 text-base font-bold text-gray-400">$</span>
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
              <p className="text-sm font-bold text-gray-900">¿Presentas la solicitud solo o acompañado?</p>
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
                  <p className="text-xs text-gray-500">
                    Déjanos sus datos. Cuando avancemos con tu estudio le enviaremos su propia solicitud a su
                    correo — tú no tienes que repetir nada.
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
              className="w-full rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700"
            >
              Continuar →
            </button>
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ── Paso 3: Beneficios (opcional) ── */}
        {paso === 3 && (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-600">
              Paso 3 · Opcional
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Saca más de tu cuenta</h2>
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
                        <p className="text-sm font-bold text-gray-900">{b.titulo}</p>
                      </div>
                      <Toggle on={on} onClick={() => setConsents((c) => ({ ...c, [b.key]: !c[b.key] }))} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">{b.desc}</p>
                    <span className="mt-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Opcional
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-gray-400">
              No marcar estas opciones no condiciona, limita ni restringe el acceso a los servicios de Cofianza.
            </p>

            <button
              type="button"
              onClick={irAFirma}
              className="w-full rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700"
            >
              Continuar →
            </button>
            <button
              type="button"
              onClick={() => setPaso(2)}
              className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ── Paso 4: Firma ── */}
        {paso === 4 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <IconShieldCheck size={28} />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Firma con tu código</h2>
              <p className="mt-1 text-sm text-gray-500">
                {data?.solicitante.telefono_masked ? (
                  <>
                    Te enviamos un código de 6 dígitos a tu{' '}
                    <strong className="text-gray-700">WhatsApp {data.solicitante.telefono_masked}</strong>{' '}
                    y a tu correo. Ingrésalo para firmar.
                  </>
                ) : (
                  <>
                    Te enviamos un código de 6 dígitos a tu{' '}
                    <strong className="text-gray-700">correo</strong>. Ingrésalo para firmar.
                  </>
                )}
              </p>
            </div>

            {otpState === 'sending' ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <IconLoader size={16} className="animate-spin text-primary-600" /> Enviando código…
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpDigits[i] ?? ''}
                      onChange={(e) => setOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => onOtpKeyDown(i, e)}
                      onPaste={i === 0 ? onOtpPaste : undefined}
                      className="h-12 w-11 rounded-xl border border-gray-300 text-center text-2xl font-bold text-gray-900 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-gray-400">
                  ¿No recibiste el código?{' '}
                  <button
                    type="button"
                    onClick={handleEnviarOtp}
                    disabled={otpCooldown > 0}
                    className="font-semibold text-primary-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                  >
                    {otpCooldown > 0 ? `Reenviar en ${otpCooldown}s` : 'Reenviar'}
                  </button>
                </p>
              </>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800">
              <IconShieldCheck size={14} className="mt-0.5 shrink-0 text-primary-600" />
              Al confirmar, este código actúa como tu firma electrónica con plena validez legal (Ley 527/1999 y
              Decreto 2364/2012).
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
                        r.on ? 'bg-primary-600 text-white' : 'border border-gray-300 text-transparent',
                      )}
                    >
                      <IconCheck size={11} />
                    </span>
                    <span className="flex-1 text-gray-700">{r.txt}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{r.lock}</span>
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
              disabled={!otpCompleto || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <IconLoader size={20} className="animate-spin" />}
              {submitting ? 'Firmando…' : 'Confirmar y firmar'}
            </button>

            <button
              type="button"
              onClick={() => setPaso(3)}
              className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← Volver
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
            className="w-full rounded-lg bg-primary-600 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {reportando ? 'Enviando…' : 'Detener y avisar a Cofianza'}
          </button>
          <button
            type="button"
            onClick={() => setReporteAbierto(false)}
            disabled={reportando}
            className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </Card>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">{children}</div>
    </div>
  )
}
