/**
 * <MeInteresaCTA> — botón "Me interesa este inmueble" con 4 ramas de UX:
 *   1) No autenticado → redirige a /registro/solicitante con intent=interest.
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
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/ui'
import { IconLoader, IconCheck } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { expedienteService } from '@/services/expedienteService'
import { registrarInteres } from '@/services/publicPropertiesService'
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
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  const [expedienteActivo, setExpedienteActivo] = useState<ExpedienteActivo | null>(null)
  const [isCheckingExpediente, setIsCheckingExpediente] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [fechaPropuesta, setFechaPropuesta] = useState<string | null>(null)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // ── Handlers ──────────────────────────────────────────

  const handleVisitanteClick = useCallback(() => {
    // Mantiene el flujo legacy de visitante → registro con intent.
    if (typeof window !== 'undefined') {
      localStorage.setItem('cofianza_interested_property', inmuebleId)
    }
    router.push(`/registro/solicitante?property_id=${inmuebleId}&intent=interest`)
  }, [inmuebleId, router])

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
        // eslint-disable-next-line no-console
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
  // Si no hay sesión → redirige a registro. Si es solicitante → abre modal.
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
