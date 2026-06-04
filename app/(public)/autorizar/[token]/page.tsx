/**
 * Página pública de autorización de tratamiento de datos (habeas data).
 * Sin login: token-gated. Re-skin del mockup "COFIANZA_Autorizacion_Datos":
 * tarjeta centrada + header de marca + 3 pasos —
 *   Paso 1: finalidades + autorización legal + aceptación (obligatorio).
 *   Paso 2: beneficios (3 consentimientos OPCIONALES con toggle).
 *   Paso 3: firma con OTP de 6 casillas + resumen.
 * Reutiliza autorizacionPublicService (getData / enviarOtp / verificarOtp / firmar).
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
} from '@/components/icons'

type PageState = 'loading' | 'form' | 'signed' | 'error'
type OtpState = 'idle' | 'sending' | 'sent'
type ConsentKey = 'analitica' | 'comercial' | 'historial_referencia'

const FINALIDADES = [
  {
    Icon: IconActivity,
    titulo: 'Evaluamos tu solicitud en segundos',
    sub: 'Riesgo, capacidad de pago y aprobación',
    detalle: [
      'Analizamos tu perfil de riesgo y comportamiento de pago para aprobar o rechazar tu fianza.',
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

  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [acepta, setAcepta] = useState(false)
  const [legalAbierto, setLegalAbierto] = useState(false)
  const [openFin, setOpenFin] = useState<number | null>(null)
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    analitica: false,
    comercial: false,
    historial_referencia: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [hashDocumento, setHashDocumento] = useState<string | null>(null)

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
        setErrorMessage(err instanceof Error ? err.message : 'Enlace inválido o expirado')
        setPageState('error')
      })
  }, [token])

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

  // De Beneficios (paso 2) a Firma (paso 3): enviamos el OTP al entrar.
  const irAFirma = useCallback(() => {
    setPaso(3)
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
      setPageState('signed')
    } catch (err) {
      const code = (err as { code?: string })?.code
      // Ya firmada/procesada (doble submit o reintento sobre una firma exitosa):
      // mostramos la pantalla de éxito en vez de un error confuso.
      if (code === 'AUTORIZACION_ESTADO_INVALIDO') {
        setPageState('signed')
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
          <h2 className="text-lg font-bold text-gray-900">Enlace no válido</h2>
          <p className="mt-1 text-sm text-gray-500">{errorMessage}</p>
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
            Tu autorización quedó registrada con firma electrónica (Ley 527/1999). Ya puedes continuar con tu
            solicitud de fianza.
          </p>
          {hashDocumento && (
            <p className="mx-auto mt-4 max-w-md break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] text-gray-400">
              Verificación: {hashDocumento}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-500">Puedes cerrar esta página.</p>
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
          <IconLock size={12} /> Seguro
        </span>
      </div>

      {/* Progreso */}
      <div className="grid grid-cols-3 gap-2 px-5 pt-4">
        {['Autorización', 'Beneficios', 'Firma'].map((label, i) => {
          const on = paso >= i + 1
          return (
            <div key={label}>
              <div className={cn('h-1.5 rounded-full', on ? 'bg-primary-600' : 'bg-gray-200')} />
              <p className={cn('mt-1 text-[11px] font-bold', on ? 'text-primary-700' : 'text-gray-400')}>
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
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Autoriza el uso de tus datos</h1>
              <p className="mt-1 text-sm text-gray-500">
                Para estudiar tu solicitud y actuar como tu fiador, {data.solicitante.nombre}, necesitamos tratar
                tus datos. Toca cada punto para ver el detalle:
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
              <span className="text-gray-500">Solicitante:</span>{' '}
              <span className="font-semibold text-gray-900">
                {data.solicitante.nombre} {data.solicitante.apellido}
              </span>
              {' · '}
              <span className="text-gray-500">Expediente:</span>{' '}
              <span className="font-semibold text-gray-900">{data.expediente.numero_expediente}</span>
              <div className="mt-0.5">
                <span className="text-gray-500">Inmueble:</span>{' '}
                <span className="font-medium text-gray-900">
                  {data.expediente.inmueble.direccion}, {data.expediente.inmueble.ciudad}
                </span>
              </div>
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

            {/* Autorización legal completa */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setLegalAbierto((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700"
              >
                Ver autorización legal completa
                <IconChevronDown
                  size={16}
                  className={cn('text-gray-400 transition-transform', legalAbierto && 'rotate-180')}
                />
              </button>
              {legalAbierto && (
                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
                  {data.texto_legal}
                  <p className="mt-2 text-[11px] text-gray-400">Versión: {data.version_terminos}</p>
                </div>
              )}
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

        {/* ── Paso 2: Beneficios (opcional) ── */}
        {paso === 2 && (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-coral-600">
              Paso 2 · Opcional
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Saca más de tu cuenta</h2>
              <p className="mt-1 text-sm text-gray-500">
                Dos permisos opcionales que trabajan a tu favor. Tú eliges cuáles encender — y los cambias cuando
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
              onClick={() => setPaso(1)}
              className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ── Paso 3: Firma ── */}
        {paso === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <IconShieldCheck size={28} />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">Firma con tu código</h2>
              <p className="mt-1 text-sm text-gray-500">
                Te enviamos un código de 6 dígitos a tu{' '}
                <strong className="text-gray-700">
                  {data?.solicitante.telefono_masked
                    ? `WhatsApp ${data.solicitante.telefono_masked}`
                    : 'WhatsApp'}
                </strong>{' '}
                y a tu correo. Ingrésalo para firmar.
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
              onClick={() => setPaso(2)}
              className="mx-auto block text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
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
