/**
 * <MeInteresaCTA> — botón "Me interesa este inmueble" con 4 ramas de UX:
 *   1) No autenticado → abre un formulario corto (nombre, WhatsApp, correo +
 *      autorización) que registra el interés como lead y avisa al anunciante.
 *      NO se piden datos personales (cédula, etc.) en este paso.
 *   2) Autenticado pero NO solicitante → botón deshabilitado con título.
 *   3) Solicitante con expediente activo sobre este inmueble → link "Ver mi solicitud →".
 *   4) Solicitante sin expediente activo → abre modal con fecha + notas;
 *      al enviar crea expediente + cita en cadena.
 *
 * Variants: 'primary' (CTA principal en card) | 'sticky' (mobile bottom bar).
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { IconLoader, IconCheck } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { expedienteService } from '@/services/expedienteService'
import { registrarInteres, registrarInteresPublico } from '@/services/publicPropertiesService'
import { citaService } from '@/services/citaService'
import SlotSelector, {
  formatSlotHora,
  formatFechaCompleta,
} from '@/components/citas/SlotSelector'

type Variant = 'primary' | 'sticky'

interface MeInteresaCTAProps {
  inmuebleId: string
  variant?: Variant
}

interface ExpedienteActivo {
  id: string
  numero: string
  estado: string
}

export function MeInteresaCTA({ inmuebleId, variant = 'primary' }: MeInteresaCTAProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  const [expedienteActivo, setExpedienteActivo] = useState<ExpedienteActivo | null>(null)
  const [isCheckingExpediente, setIsCheckingExpediente] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [fechaPropuesta, setFechaPropuesta] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Formulario de interesado para visitantes SIN cuenta (lead).
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadNombre, setLeadNombre] = useState('')
  const [leadTelefono, setLeadTelefono] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadMensaje, setLeadMensaje] = useState('')
  const [leadAcepta, setLeadAcepta] = useState(false)
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadEnviado, setLeadEnviado] = useState(false)

  const isSolicitante = user?.rol === 'solicitante'

  // Detectar expediente activo al montar / al cambiar auth o inmueble.
  useEffect(() => {
    if (!isInitialized) return
    if (!isAuthenticated || !isSolicitante) {
      setExpedienteActivo(null)
      return
    }
    let cancelled = false
    setIsCheckingExpediente(true)
    expedienteService
      .miExpedientePorInmueble(inmuebleId)
      .then((res) => {
        if (cancelled) return
        setExpedienteActivo(res.expediente)
      })
      .catch(() => {
        if (cancelled) return
        // Falla de red/auth: tratamos como "no hay expediente". El usuario
        // podrá intentar y el backend rechazará con 409 si realmente existe.
        setExpedienteActivo(null)
      })
      .finally(() => {
        if (!cancelled) setIsCheckingExpediente(false)
      })
    return () => {
      cancelled = true
    }
  }, [isInitialized, isAuthenticated, isSolicitante, inmuebleId])

  // Auto-apertura del modal cuando venimos de /registro/solicitante con ?agendar=1.
  // Espera a que el check de expediente termine para decidir bien. Si ya hay
  // expediente activo, no abre modal (la rama "Ver mi solicitud" toma control).
  // Limpia el query param con router.replace para que cerrar el modal no lo
  // re-abra en loops de re-render.
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !isSolicitante) return
    if (isCheckingExpediente) return
    if (expedienteActivo) return
    if (searchParams.get('agendar') !== '1') return

    setShowModal(true)
    router.replace(pathname, { scroll: false })
  }, [
    isInitialized,
    isAuthenticated,
    isSolicitante,
    isCheckingExpediente,
    expedienteActivo,
    searchParams,
    router,
    pathname,
  ])

  // ── Handlers ──────────────────────────────────────────

  // Visitante sin cuenta → abre el formulario corto de interés (lead), en vez
  // de mandarlo a registro. Los datos del estudio se piden después, si avanza.
  const handleVisitanteClick = useCallback(() => {
    setShowLeadModal(true)
  }, [])

  const closeLeadModal = () => {
    if (leadSubmitting) return
    setShowLeadModal(false)
    setLeadEnviado(false)
  }

  const handleLeadSubmit = async () => {
    if (leadNombre.trim().length < 2) {
      toast.error('Ingresa tu nombre')
      return
    }
    const tel = leadTelefono.replace(/\s+/g, '').trim()
    if (!/^\+?\d{7,15}$/.test(tel)) {
      toast.error('Ingresa un WhatsApp válido, con código de país (ej. +57…).')
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(leadEmail.trim())) {
      toast.error('Ingresa un correo válido')
      return
    }
    if (!leadAcepta) {
      toast.error('Debes autorizar el tratamiento de tus datos para continuar')
      return
    }

    setLeadSubmitting(true)
    try {
      await registrarInteresPublico(inmuebleId, {
        nombre: leadNombre.trim(),
        telefono: tel,
        email: leadEmail.trim(),
        mensaje: leadMensaje.trim() || undefined,
        acepta: true,
      })
      setLeadEnviado(true)
      toast.success('¡Listo! Le avisamos al anunciante; te contactará pronto.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar tu interés. Intenta de nuevo.')
    } finally {
      setLeadSubmitting(false)
    }
  }

  const closeModal = () => {
    if (submitting) return
    setShowModal(false)
    setFechaPropuesta(null)
    setNotas('')
  }

  const handleSubmit = async () => {
    if (!fechaPropuesta) {
      toast.error('Selecciona una fecha y hora para la visita')
      return
    }

    setSubmitting(true)
    let expedienteId: string | null = null

    try {
      const interesResult = await registrarInteres(inmuebleId)
      expedienteId = interesResult.expediente.id

      try {
        // fechaPropuesta ya viene en ISO 8601 con offset -05:00 desde SlotSelector.
        // NO re-convertir con new Date().toISOString() — eso duplicaría el cambio de zona.
        await citaService.crearCita({
          expediente_id: expedienteId,
          fecha_propuesta: fechaPropuesta,
          notas_solicitante: notas.trim() || undefined,
        })

        toast.success('Solicitud enviada. El propietario revisará tu cita.')
        router.push(`/expedientes/${expedienteId}`)
      } catch (citaError) {
        // Expediente creado pero cita falló: no rollback. Auditoría en console
        // para detectar si el caso ocurre seguido en pruebas/producción.
        console.error('[MeInteresaCTA] Expediente creado pero cita falló. Requiere intervención:', {
          expediente_id: expedienteId,
          error: citaError,
        })
        toast.message(
          'Expediente creado. No se pudo agendar la cita — agéndala desde tu panel.',
        )
        router.push(`/expedientes/${expedienteId}`)
      }
    } catch (interesError: unknown) {
      const errObj = interesError as { code?: string; statusCode?: number; message?: string }
      if (errObj.code === 'EXPEDIENTE_ALREADY_EXISTS' || errObj.statusCode === 409) {
        toast.error('Ya tienes una solicitud activa sobre este inmueble.')
        // Refrescar el check para que la card se re-renderize en modo "Ver mi solicitud".
        const refreshed = await expedienteService
          .miExpedientePorInmueble(inmuebleId)
          .catch(() => ({ expediente: null }))
        setExpedienteActivo(refreshed.expediente)
        setShowModal(false)
      } else {
        toast.error(errObj.message || 'No se pudo registrar tu interés. Intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render por estado ─────────────────────────────────

  // Mientras el store no esté inicializado, render conservador (visitante).
  // Tras inicializar, decide la rama correcta.

  // RAMA 4 (loading): solicitante esperando check de expediente.
  if (isAuthenticated && isSolicitante && isCheckingExpediente) {
    return (
      <button
        disabled
        className={`${buttonClasses(variant, 'loading')} cursor-wait`}
      >
        Cargando...
      </button>
    )
  }

  // RAMA 3: solicitante con expediente activo → link a "Ver mi solicitud".
  if (isAuthenticated && isSolicitante && expedienteActivo) {
    return (
      <div className="space-y-2">
        <Link
          href={`/expedientes/${expedienteActivo.id}`}
          className={`${buttonClasses(variant, 'primary')} block text-center`}
        >
          Ver mi solicitud →
        </Link>
        {variant === 'primary' && (
          <p className="text-xs text-gray-600">
            Ya tienes una solicitud activa ({expedienteActivo.numero}) sobre este inmueble.
          </p>
        )}
      </div>
    )
  }

  // RAMA 2: autenticado pero rol distinto de solicitante.
  if (isInitialized && isAuthenticated && !isSolicitante) {
    return (
      <button
        disabled
        title="Solo los solicitantes pueden registrar interés en inmuebles"
        className={`${buttonClasses(variant, 'disabled')} cursor-not-allowed`}
      >
        Me interesa este inmueble
      </button>
    )
  }

  // RAMA 1 (no auth) o RAMA 4 sin expediente: botón activo.
  // Si no hay sesión → abre el formulario de interés. Si es solicitante → abre el modal de cita.
  return (
    <>
      <button
        onClick={() => {
          if (!isAuthenticated) {
            handleVisitanteClick()
            return
          }
          setShowModal(true)
        }}
        className={buttonClasses(variant, 'primary')}
      >
        {variant === 'sticky' ? 'Me interesa' : 'Me interesa este inmueble'}
      </button>

      {/* Modal: solo solicitante autenticado puede llegar a abrirlo */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Solicitar visita al inmueble"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Elige un horario disponible. El propietario confirmará o ajustará la fecha.
          </p>

          <SlotSelector
            inmuebleId={inmuebleId}
            value={fechaPropuesta}
            onChange={setFechaPropuesta}
          />

          {/* Resumen de la selección actual */}
          {fechaPropuesta ? (
            <div className="flex items-start gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded">
              <IconCheck size={16} className="text-primary-600 mt-0.5 shrink-0" />
              <p className="text-sm text-primary-900">
                Visitarás el <strong>{formatFechaCompleta(fechaPropuesta)}</strong> a las{' '}
                <strong>{formatSlotHora(fechaPropuesta)}</strong>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Selecciona un horario arriba.</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas para el propietario (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Cuéntale por qué te interesa, o deja alguna observación para la visita."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{notas.length}/500</p>
          </div>

          <div className="flex flex-col items-end gap-2 pt-2">
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !fechaPropuesta}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <IconLoader size={14} className="animate-spin" />}
                Enviar solicitud
              </button>
            </div>
            {!fechaPropuesta && (
              <p className="text-xs text-gray-500">Selecciona fecha y hora para continuar.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal del visitante SIN cuenta: formulario corto de interés (lead) */}
      <Modal
        isOpen={showLeadModal}
        onClose={closeLeadModal}
        title="Me interesa este inmueble"
        size="md"
      >
        {leadEnviado ? (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <IconCheck size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">¡Gracias por tu interés!</p>
              <p className="text-sm text-gray-600 mt-1">
                Le avisamos al anunciante con tus datos. Te contactará por WhatsApp o correo para
                coordinar la visita.
              </p>
            </div>
            <button
              onClick={closeLeadModal}
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Déjanos tus datos y el anunciante te contactará para coordinar una visita. Por ahora
              no pedimos datos personales (cédula, ingresos) — eso solo se pide si decides avanzar.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-coral-500">*</span>
              </label>
              <input
                type="text"
                value={leadNombre}
                onChange={(e) => setLeadNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <PhoneInput
              label="WhatsApp"
              value={leadTelefono}
              onChange={setLeadTelefono}
              placeholder="300 123 4567"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo <span className="text-coral-500">*</span>
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensaje <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={leadMensaje}
                onChange={(e) => setLeadMensaje(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ej. ¿Sigue disponible? Me gustaría verlo el sábado."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={leadAcepta}
                onChange={(e) => setLeadAcepta(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                Autorizo que Cofianza comparta mis datos de contacto con el anunciante de este
                inmueble y acepto la{' '}
                <a href="/privacidad" target="_blank" className="text-primary-600 underline">
                  Política de Tratamiento de Datos
                </a>
                .
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeLeadModal}
                disabled={leadSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleLeadSubmit}
                disabled={leadSubmitting || !leadAcepta}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {leadSubmitting && <IconLoader size={14} className="animate-spin" />}
                Enviar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────

function buttonClasses(variant: Variant, state: 'primary' | 'disabled' | 'loading'): string {
  const base = variant === 'sticky'
    ? 'px-6 py-3 font-semibold rounded-xl shrink-0 transition-colors'
    : 'w-full py-3.5 font-semibold rounded-xl text-center transition-colors'

  if (state === 'primary') {
    return `${base} bg-primary-600 text-white hover:bg-primary-700`
  }
  if (state === 'disabled') {
    return `${base} bg-gray-200 text-gray-400`
  }
  // loading
  return `${base} bg-gray-100 text-gray-500`
}
