/**
 * CoarrendatarioCard — visible para el SOLICITANTE cuando su expediente
 * está en estado 'condicionado'.
 *
 * Mario (5-may-2026): nuevo paradigma. Cuando el estudio queda condicionado,
 * en vez de pedir documentos, ofrecemos invitar a un co-arrendatario.
 * Cofianza no pide fiador — pide que pongas a la persona con quien vas
 * a vivir y juntos los respaldamos como un solo arrendatario.
 *
 * El formulario de invitación es compartido (CoarrendatarioInviteForm); aquí
 * decidimos visibilidad y mostramos el estado actual de la invitación.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coarrendatarioService, type ICoarrendatario } from '@/services/coarrendatarioService'
import { CoarrendatarioInviteForm } from './CoarrendatarioInviteForm'
import { CoarrendatarioReenviarInvitacion } from './CoarrendatarioReenviarInvitacion'

interface CoarrendatarioCardProps {
  expedienteId: string
  expedienteEstado: string
  userRol?: string
  onUpdate?: () => void
}

export function CoarrendatarioCard({
  expedienteId,
  expedienteEstado,
  userRol,
  onUpdate,
}: CoarrendatarioCardProps) {
  const [coa, setCoa] = useState<ICoarrendatario | null>(null)
  const [loading, setLoading] = useState(true)

  const coaLoadedRef = useRef(false)
  const fetchCoa = useCallback(async () => {
    try {
      const data = await coarrendatarioService.getDelExpediente(expedienteId)
      setCoa(data)
      coaLoadedRef.current = true
    } catch {
      // No borrar la card por un error transitorio del polling: solo dejamos
      // null si nunca llegó a cargar.
      if (!coaLoadedRef.current) setCoa(null)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { fetchCoa() }, [fetchCoa])

  // Polling sutil mientras está pendiente_aceptacion o aceptado (sin resultado)
  // para que el solicitante vea el cambio sin recargar.
  useEffect(() => {
    if (!coa) return
    const enEspera = coa.estado === 'pendiente_aceptacion' || coa.estado === 'aceptado'
    if (!enEspera) return
    const id = setInterval(fetchCoa, 6000)
    return () => clearInterval(id)
  }, [coa, fetchCoa])

  // Visibilidad: solo cuando expediente está condicionado y el usuario es solicitante.
  if (loading) return null
  if (expedienteEstado !== 'condicionado') return null
  if (userRol !== 'solicitante') return null

  // ── Sin coarrendatario: invitar ────────────────────────────────────
  if (!coa) {
    return (
      <CoarrendatarioInviteForm
        expedienteId={expedienteId}
        audience="solicitante"
        onInvited={() => { fetchCoa(); onUpdate?.() }}
      />
    )
  }

  // ── Con coarrendatario invitado: estado actual ─────────────────────
  return (
    <div className="border-2 border-amber-300 bg-amber-50/60 rounded-lg p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-0.5">Co-arrendatario invitado</h3>
          <p className="text-sm text-gray-700 truncate">
            <strong>{coa.nombre} {coa.apellido}</strong> · {coa.email}
          </p>
        </div>
      </div>

      <EstadoBadge estado={coa.estado} />

      {/* Invitación pendiente: el solicitante puede corregir el contacto y
          reenviar — un email mal escrito no debe dejarlo esperando para
          siempre. El key remonta el form cuando el contacto guardado cambia. */}
      {coa.estado === 'pendiente_aceptacion' && (
        <CoarrendatarioReenviarInvitacion
          key={`${coa.email}|${coa.telefono ?? ''}`}
          expedienteId={expedienteId}
          coa={coa}
          onReenviado={fetchCoa}
        />
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: ICoarrendatario['estado'] }) {
  const cfg: Record<ICoarrendatario['estado'], { color: string; label: string; mensaje: string }> = {
    pendiente_aceptacion: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Esperando respuesta',
      mensaje: 'Le enviamos la invitación por correo. Te avisaremos cuando responda.',
    },
    aceptado: {
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      label: 'Aceptó la invitación',
      mensaje: 'Estamos procesando su estudio crediticio. Cuando termine, te diremos si pasaron juntos.',
    },
    rechazado_invitacion: {
      color: 'bg-red-50 border-red-200 text-red-900',
      label: 'Declinó la invitación',
      mensaje: 'La persona declinó. Puedes invitar a alguien más.',
    },
    estudio_completado: {
      color: 'bg-green-50 border-green-200 text-green-900',
      label: 'Estudio completado',
      mensaje: 'El estudio del co-arrendatario terminó. Revisa el resumen del expediente para ver el resultado combinado.',
    },
  }
  const c = cfg[estado]
  return (
    <div className={`border rounded-md p-3 ${c.color}`}>
      <p className="text-sm font-medium">{c.label}</p>
      <p className="text-xs mt-1 opacity-90">{c.mensaje}</p>
    </div>
  )
}
