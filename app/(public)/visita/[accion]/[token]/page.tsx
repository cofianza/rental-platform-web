'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  IconLoader,
  IconMapPin,
  IconCalendar,
  IconClock,
  IconCheckCircle,
  IconAlertTriangle,
} from '@/components/icons'
import { visitaService, type IVisitaPublica, type IVisitaDia } from '@/services/visitaService'
import { cn } from '@/lib/utils'

const TZ = 'America/Bogota'
const DIAS_RANGO = 14

function bogotaISODate(offsetDays = 0): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000 + offsetDays * 86_400_000)
    .toISOString()
    .split('T')[0]
}

function fmtFechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function fmtDia(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function GestionarVisitaPage() {
  const params = useParams()
  // Meta antepone el placeholder "{{1}}" literal al sufijo dinámico del botón
  // (no lo sustituye), así que el token llega como "{{1}}<token>". Extraemos el
  // token real (64 hex) de lo que venga en la URL.
  // useParams puede devolver el segmento URL-codificado (p.ej.
  // "%7B%7B1%7D%7D<token>") porque Meta antepone el placeholder literal "{{1}}".
  // Limpiamos todo lo no-hex y tomamos los ÚLTIMOS 64 chars (el token va al
  // final): robusto tanto para la forma codificada como decodificada.
  const rawToken = String(params.token ?? '')
  const token = rawToken.replace(/[^a-f0-9]/gi, '').slice(-64) || rawToken
  const accionRaw = String(params.accion ?? '')
  const accion: 'cancelar' | 'confirmar' | 'reprogramar' =
    accionRaw === 'cancelar' ? 'cancelar' : accionRaw === 'confirmar' ? 'confirmar' : 'reprogramar'

  const [visita, setVisita] = useState<IVisitaPublica | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'reprogramada' | 'cancelada' | 'confirmada' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reprogramar
  const [dias, setDias] = useState<IVisitaDia[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  // Un fallo de carga no es «no hay horarios»: con eso el arrendatario dejaba de insistir.
  const [slotsError, setSlotsError] = useState(false)
  const [slotSel, setSlotSel] = useState<string | null>(null)

  // Cancelar
  const [motivo, setMotivo] = useState('')

  const cargarSlots = useCallback(async () => {
    setSlotsLoading(true)
    setSlotsError(false)
    try {
      const data = await visitaService.getSlots(token, bogotaISODate(0), bogotaISODate(DIAS_RANGO))
      setDias(data.filter((d) => d.slots.length > 0))
    } catch {
      setSlotsError(true)
    } finally {
      setSlotsLoading(false)
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    visitaService
      .getVisita(token)
      .then((v) => {
        if (cancelled) return
        setVisita(v)
        if (v.accionable && accion === 'reprogramar') cargarSlots()
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar la visita')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, accion, cargarSlots])

  async function handleReprogramar() {
    if (!slotSel) return
    setSubmitting(true)
    setError(null)
    try {
      await visitaService.reprogramar(token, slotSel)
      setDone('reprogramada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reprogramar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelar() {
    setSubmitting(true)
    setError(null)
    try {
      await visitaService.cancelar(token, motivo.trim() || undefined)
      setDone('cancelada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmar() {
    setSubmitting(true)
    setError(null)
    try {
      await visitaService.confirmar(token)
      setDone('confirmada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pantallas ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader size={28} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error && !visita) {
    return (
      <Card>
        <div className="text-center py-6">
          <IconAlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">No pudimos abrir tu visita</h1>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <div className="text-center py-6">
          <IconCheckCircle size={48} className="mx-auto text-primary-600 mb-3" />
          <h1 className="text-xl font-bold text-gray-900">
            {done === 'reprogramada'
              ? '¡Visita reprogramada!'
              : done === 'cancelada'
                ? 'Visita cancelada'
                : '¡Asistencia confirmada!'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {done === 'reprogramada'
              ? 'Enviamos tu nueva fecha al propietario para que la confirme. Te avisaremos cuando quede lista.'
              : done === 'cancelada'
                ? 'Avisamos al propietario que no asistirás. Gracias por avisar a tiempo.'
                : 'Le avisamos al propietario que asistirás. ¡Te esperamos puntual!'}
          </p>
        </div>
      </Card>
    )
  }

  if (!visita) return null

  return (
    <div className="space-y-4">
      {/* Resumen de la visita */}
      <Card>
        <h1 className="text-xl font-bold text-gray-900">
          {visita.nombre ? `Hola ${visita.nombre},` : 'Tu visita'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {accion === 'cancelar'
            ? 'Vas a cancelar tu visita.'
            : accion === 'confirmar'
              ? 'Confirma que asistirás a tu visita.'
              : 'Elige una nueva fecha para tu visita.'}
        </p>

        <div className="mt-4 space-y-2 text-sm">
          {visita.inmueble && (
            <div className="flex items-start gap-2">
              <IconMapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
              <span className="text-gray-700">
                {visita.inmueble.direccion}, {visita.inmueble.ciudad}
              </span>
            </div>
          )}
          {visita.fecha && (
            <div className="flex items-center gap-2">
              <IconCalendar size={16} className="text-gray-500 shrink-0" />
              <span className="text-gray-700 capitalize">{fmtFechaLarga(visita.fecha)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* No accionable */}
      {!visita.accionable ? (
        <Card>
          <div className="text-center py-4">
            <IconAlertTriangle size={36} className="mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-gray-700">
              Esta visita ya no se puede modificar
              {visita.estado === 'cancelada' && ' porque está cancelada'}
              {visita.estado === 'realizada' && ' porque ya se realizó'}.
            </p>
            <ContactoAyuda contacto={visita.contacto} className="mt-2" />
          </div>
        </Card>
      ) : accion === 'confirmar' ? (
        <Card>
          {visita.confirmada_asistencia ? (
            <div className="text-center py-4">
              <IconCheckCircle size={40} className="mx-auto text-primary-600 mb-2" />
              <p className="text-sm text-gray-700">Ya confirmaste tu asistencia. ¡Te esperamos puntual!</p>
            </div>
          ) : visita.estado !== 'confirmada' ? (
            // La web solo exigia `accionable`, que admite 'solicitada' y
            // 'confirmada'; el endpoint exige 'confirmada' estricto. Como el
            // boton de WhatsApp vive para siempre, si la visita volvio a
            // 'solicitada' (reprogramada) el confirmar fallaba SIEMPRE.
            <div className="text-center py-4">
              <p className="text-sm text-gray-700">
                El propietario aún no ha confirmado la fecha de esta visita. En cuanto lo haga te
                avisamos y podrás confirmar tu asistencia.
              </p>
              <Link
                href={`/visita/reprogramar/${token}`}
                className="mt-3 inline-block text-sm text-gray-500 hover:underline"
              >
                Necesito cambiar la fecha
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                ¿Confirmas que asistirás a esta visita? Le avisaremos al propietario para que te espere.
              </p>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={submitting}
                className="mt-4 w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <IconLoader size={16} className="animate-spin" />}
                Sí, confirmo mi asistencia
              </button>
              <Link
                href={`/visita/reprogramar/${token}`}
                className="mt-3 block text-center text-sm text-gray-500 hover:underline"
              >
                Necesito cambiar la fecha
              </Link>
            </>
          )}
        </Card>
      ) : accion === 'cancelar' ? (
        <Card>
          <label htmlFor="token-motivo-opcional" className="block text-sm font-medium text-gray-700 mb-2">
            Motivo (opcional)
          </label>
          <textarea id="token-motivo-opcional"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Cuéntale al propietario por qué cancelas (opcional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button
            type="button"
            onClick={handleCancelar}
            disabled={submitting}
            className="mt-4 w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <IconLoader size={16} className="animate-spin" />}
            Confirmar cancelación
          </button>
          <Link
            href={`/visita/reprogramar/${token}`}
            className="mt-3 block text-center text-sm text-primary-600 hover:underline"
          >
            Mejor reprogramar mi visita
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="text-sm font-medium text-gray-700 mb-3">Horarios disponibles</p>
          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader size={24} className="animate-spin text-gray-500" />
            </div>
          ) : slotsError ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-700">No pudimos cargar los horarios.</p>
              <button
                type="button"
                onClick={cargarSlots}
                className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reintentar
              </button>
            </div>
          ) : dias.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">
                No hay horarios disponibles en los próximos {DIAS_RANGO} días.
              </p>
              <ContactoAyuda contacto={visita.contacto} className="mt-2" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {dias.map((dia) => (
                <div key={dia.fecha}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">
                    {fmtDia(dia.fecha)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dia.slots.map((s) => (
                      <button
                        key={s.inicio}
                        type="button"
                        onClick={() => setSlotSel(s.inicio)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-sm font-medium transition flex items-center gap-1',
                          slotSel === s.inicio
                            ? 'bg-primary-700 text-white border-primary-700'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400',
                        )}
                      >
                        <IconClock size={13} />
                        {fmtHora(s.inicio)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <button
            type="button"
            onClick={handleReprogramar}
            disabled={submitting || !slotSel}
            className="mt-4 w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <IconLoader size={16} className="animate-spin" />}
            Confirmar nueva fecha
          </button>
          <Link
            href={`/visita/cancelar/${token}`}
            className="mt-3 block text-center text-sm text-gray-500 hover:underline"
          >
            No podré asistir, cancelar visita
          </Link>
        </Card>
      )}
    </div>
  )
}

/**
 * A quién escribirle: la inmobiliaria o el propietario por WhatsApp; si no tiene
 * número, el correo de soporte de Cofianza (el WhatsApp de Cofianza nadie lo lee).
 */
function ContactoAyuda({ contacto, className }: { contacto?: IVisitaPublica['contacto']; className?: string }) {
  if (!contacto) return null
  const digitos = contacto.whatsapp?.replace(/\D/g, '') ?? ''
  const wa = digitos.length === 10 ? `57${digitos}` : digitos
  return (
    <p className={cn('text-xs text-gray-500', className)}>
      {contacto.whatsapp ? (
        <>
          Para coordinar otra fecha o si necesitas ayuda, escríbele {contacto.nombre ? `a ${contacto.nombre}` : 'a quien publicó el inmueble'} por WhatsApp al{' '}
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 underline">
            {contacto.whatsapp}
          </a>
          .
        </>
      ) : contacto.email ? (
        <>
          Si necesitas ayuda, escríbenos a{' '}
          <a href={`mailto:${contacto.email}`} className="font-medium text-primary-700 underline">
            {contacto.email}
          </a>
          .
        </>
      ) : null}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">{children}</div>
}
