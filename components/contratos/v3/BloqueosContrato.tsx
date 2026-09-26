/**
 * Bloqueos y pendientes del asistente de contratos V3 (Entrega 3).
 *
 * Los decide el API (§5.2 del diseño): aquí se pintan como una lista de puntos
 * por resolver, en ámbar (pendiente, no error), cada uno con el enlace a donde
 * se corrige. Los que resuelve una misma evaluación nueva van en un solo punto.
 * Un bloqueo impide iniciar o generar; un aviso no.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconAlertTriangle, IconArrowRight, IconInfo, IconLoader } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { EvaluarEnEstudioNuevo } from '@/components/expedientes/EvaluarEnEstudioNuevo'
import { estudioService } from '@/services/estudioService'
import { ApiClientError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { Bloqueo, NumeroPaso } from '@/types/contratoV3'

interface Props {
  bloqueos: Bloqueo[]
  /** Faltantes del asistente ("Falta guardar este paso", fechas vencidas…). */
  faltantes?: { paso: NumeroPaso; mensaje: string }[]
  /** Lo que frenan (p. ej. "iniciar el contrato"): encabeza la lista con «Para …, resuelve estos N puntos:». */
  para?: string
  /** Sin él (solo faltantes) no se pintan los enlaces de acción. */
  expedienteId?: string
  inmuebleId?: string
  /** ¿Abre la ficha del inmueble? El asesor restringido, solo lo suyo o asignado; null mientras se consulta. */
  inmuebleAccesible?: boolean | null
  /** Titular de la inmobiliaria: el único que edita los Datos para contrato. */
  esTitular?: boolean
  /** Puede cancelar el estudio y crear uno nuevo (la salida de una evaluación que ya no sirve). */
  puedeEditar?: boolean
  /** Hay un borrador de contrato: al evaluar de nuevo también se cancela. */
  conBorrador?: boolean
  /** Si llega, los ítems con paso muestran "Ir al paso N". */
  onIrPaso?: (paso: NumeroPaso) => void
  /** Tras emitir o regenerar el CRC aquí mismo: recarga el estado del asistente. */
  onCambio?: () => void
}

const enlace = 'inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline'

/**
 * Del canon pactado (paso 1): se pacta uno menor o, con este, hace falta evaluar de nuevo sobre
 * un canon del inmueble actualizado. Sin enlace al estudio: allí no hay nada que hacer.
 */
const CANON_PIDE_EVALUACION = ['CANON_FUERA_DE_TOLERANCIA', 'CANON_INGRESO_EXCEDE']

/**
 * Sin estos, la única salida es una evaluación nueva (los del canon también se resuelven bajándolo).
 * CRC_SIN_MARGEN / CRC_VENCIDO: al certificado no le alcanza la vigencia para el proceso de firma.
 */
export const SOLO_NUEVA_EVALUACION = ['ESTUDIO_VENCIDO', 'CANON_SIN_EVALUADO', 'CRC_SIN_MARGEN', 'CRC_VENCIDO']

/** El error del API que solo se resuelve con una evaluación nueva (al generar o enviar a firma en el flujo anterior), como bloqueo; null si es otro. */
export function bloqueoDeEvaluacion(err: unknown): Bloqueo | null {
  return err instanceof ApiClientError && SOLO_NUEVA_EVALUACION.includes(err.code ?? '')
    ? { codigo: err.code!, mensaje: err.message }
    : null
}

/** Del certificado de la evaluación actual: la nueva emite el suyo sola, así que no son un punto aparte. */
export const DEL_CRC = ['CRC_NO_EMITIDO', 'CRC_DESACTUALIZADO']

interface Punto {
  key: string
  texto: string
  razones?: string[]
  nota?: string
  /** El bloqueo que decide el enlace de acción. */
  bloqueo?: Bloqueo
  /** El punto de la evaluación nueva: su acción es crear un estudio nuevo. */
  nuevaEvaluacion?: boolean
  paso?: NumeroPaso
  /** Faltante del asistente: con onIrPaso se antepone "Paso N:". */
  esFaltante?: boolean
}

/** Los bloqueos que resuelve una misma evaluación nueva se juntan en el lugar del primero. */
function puntosDe(bloqueos: Bloqueo[]): Punto[] {
  const evaluacion = bloqueos.filter((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo))
  const juntos = evaluacion.length
    ? bloqueos.filter((b) => SOLO_NUEVA_EVALUACION.includes(b.codigo) || DEL_CRC.includes(b.codigo))
    : []
  const out: Punto[] = []
  bloqueos.forEach((b, i) => {
    if (!juntos.includes(b)) {
      out.push({
        key: `${b.codigo}-${i}`,
        texto: b.mensaje,
        razones: b.detalle,
        // Bajar el canon se hace en el paso 1; conservarlo pide evaluar de nuevo sobre el canon nuevo del inmueble.
        nota: CANON_PIDE_EVALUACION.includes(b.codigo)
          ? 'Si necesitas este canon, primero actualiza el canon del inmueble y luego crea el estudio nuevo.'
          : undefined,
        bloqueo: b,
        paso: b.paso,
      })
    } else if (b === juntos[0]) {
      out.push({
        key: 'nueva-evaluacion',
        texto: 'La evaluación crediticia actual ya no sirve para el contrato:',
        // El «Se requiere nueva evaluación.» de cada motivo sobra bajo este encabezado.
        razones: evaluacion.map((e) =>
          e.mensaje.replace(/\s*(Se requiere (una )?nueva evaluación|Hay que renovar la evaluación)\.$/, ''),
        ),
        nota:
          'La evaluación nueva se hace en un estudio nuevo, con su cobro' +
          (juntos.length > evaluacion.length ? '; al aprobarse emite sola su certificado de riesgo (CRC).' : '.'),
        nuevaEvaluacion: true,
      })
    }
  })
  return out
}

export function BloqueosContrato({
  bloqueos,
  faltantes = [],
  para,
  expedienteId,
  inmuebleId,
  inmuebleAccesible = true,
  esTitular,
  puedeEditar,
  conBorrador,
  onIrPaso,
  onCambio,
}: Props) {
  const rol = useAuthStore((s) => s.user?.rol)
  const puntos: Punto[] = [
    ...puntosDe(bloqueos),
    ...faltantes.map((f, i) => ({ key: `falta-${f.paso}-${i}`, texto: f.mensaje, paso: f.paso, esFaltante: true })),
  ]
  if (puntos.length === 0) return null

  const accion = (b: Bloqueo) => {
    if (!expedienteId) return null
    const volverAqui = encodeURIComponent(`/expedientes/${expedienteId}/contrato`)
    switch (b.accion) {
      case 'datos_contrato': {
        if (!esTitular) {
          return (
            <p className="text-xs text-gray-600">Pídele al titular de la inmobiliaria que complete los Datos para contrato.</p>
          )
        }
        return (
          <Link href={`/configuracion/datos-contrato?returnTo=${volverAqui}`} className={enlace}>
            Completar Datos para contrato <IconArrowRight size={12} />
          </Link>
        )
      }
      case 'estudio':
        if (CANON_PIDE_EVALUACION.includes(b.codigo)) {
          return (
            <>
              {puedeEditar && inmuebleId && inmuebleAccesible && (
                <Link href={`/inmuebles/${inmuebleId}/editar?returnTo=${volverAqui}`} className={enlace}>
                  Editar el canon del inmueble <IconArrowRight size={12} />
                </Link>
              )}
              {puedeEditar && <EvaluarEnEstudioNuevo expedienteId={expedienteId} conBorrador={conBorrador} />}
            </>
          )
        }
        // La evaluación sigue vigente y el API deja emitir el CRC desde aquí (la ficha del estudio no lo ofrece).
        if (DEL_CRC.includes(b.codigo) && b.estudioId && puedeEditar && onCambio) {
          return <EmitirCertificado estudioId={b.estudioId} regenerar={b.codigo === 'CRC_DESACTUALIZADO'} onCambio={onCambio} />
        }
        return (
          <Link href={`/expedientes/${expedienteId}`} className={enlace}>
            Ir al estudio <IconArrowRight size={12} />
          </Link>
        )
      case 'inmueble':
        // Hoy solo INMUEBLE_INACTIVO: reactivarlo es del administrador de Cofianza, en el detalle del
        // inmueble (el formulario de edición no tiene el estado).
        if (rol === 'administrador' && inmuebleId) {
          return (
            <Link href={`/inmuebles/${inmuebleId}`} className={enlace}>
              Ir al inmueble para reactivarlo <IconArrowRight size={12} />
            </Link>
          )
        }
        return (
          <p className="text-xs text-gray-600">
            {rol === 'operador_analista'
              ? 'Pídele a un administrador que reactive el inmueble.'
              : 'Pídele a Cofianza que reactive el inmueble.'}
          </p>
        )
      default:
        return null
    }
  }

  const irPaso = (paso?: NumeroPaso) =>
    paso && onIrPaso ? (
      <button type="button" onClick={() => onIrPaso(paso)} className={enlace}>
        Ir al paso {paso} <IconArrowRight size={12} />
      </button>
    ) : null

  const numerados = puntos.length > 1
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      {para && (
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
          <IconAlertTriangle size={18} className="shrink-0 text-amber-600" />
          Para {para}, resuelve {numerados ? `estos ${puntos.length} puntos` : 'este punto'}:
        </p>
      )}
      <ol className="space-y-3">
        {puntos.map((p, i) => {
          const hacer = p.nuevaEvaluacion ? (
            expedienteId && puedeEditar ? <EvaluarEnEstudioNuevo expedienteId={expedienteId} conBorrador={conBorrador} /> : null
          ) : p.bloqueo ? (
            accion(p.bloqueo)
          ) : null
          const ir = irPaso(p.paso)
          return (
            <li key={p.key} className="flex items-start gap-3">
              {numerados ? (
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-amber-800 ring-1 ring-amber-300"
                >
                  {i + 1}
                </span>
              ) : (
                !para && <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium text-gray-900">
                  {p.esFaltante && onIrPaso && <span className="font-semibold">Paso {p.paso}: </span>}
                  {p.texto}
                </p>
                {p.razones && p.razones.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                    {p.razones.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                {p.nota && <p className="text-xs text-gray-600">{p.nota}</p>}
                {(hacer || ir) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {hacer}
                    {ir}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Emite (o regenera) el CRC de la evaluación vigente sin salir del contrato. */
function EmitirCertificado({ estudioId, regenerar, onCambio }: { estudioId: string; regenerar: boolean; onCambio: () => void }) {
  const [emitiendo, setEmitiendo] = useState(false)
  const emitir = async () => {
    setEmitiendo(true)
    try {
      await estudioService.generarCertificado(estudioId)
      toast.success(regenerar ? 'Certificado regenerado' : 'Certificado emitido')
      onCambio()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo emitir el certificado.')
    } finally {
      setEmitiendo(false)
    }
  }
  return (
    <Button tamano="sm" onClick={emitir} disabled={emitiendo}>
      {emitiendo && <IconLoader size={14} className="animate-spin" />}
      {regenerar ? 'Regenerar certificado' : 'Emitir certificado'}
    </Button>
  )
}

const TONO_AVISO = {
  // No bloquea (p. ej. el canon del registro antes de pactar el del contrato).
  info: { caja: 'border-blue-200 bg-blue-50 text-blue-800', Icono: IconInfo, icono: 'text-blue-600' },
  // Bloquea el envío a firma (textos pendientes de aprobación).
  aviso: { caja: 'border-amber-200 bg-amber-50 text-amber-900', Icono: IconAlertTriangle, icono: 'text-amber-600' },
}

/** Avisos en lista: en azul los que no bloquean; en ámbar los que impiden enviar a firma. */
export function AvisosContrato({ avisos, tono = 'info' }: { avisos: string[]; tono?: keyof typeof TONO_AVISO }) {
  if (avisos.length === 0) return null
  const t = TONO_AVISO[tono]
  return (
    <ul className="space-y-2">
      {avisos.map((a) => (
        <li key={a} className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${t.caja}`}>
          <t.Icono size={18} className={`mt-0.5 shrink-0 ${t.icono}`} />
          <span>{a}</span>
        </li>
      ))}
    </ul>
  )
}
