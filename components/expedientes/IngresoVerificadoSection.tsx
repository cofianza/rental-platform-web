'use client'

/**
 * Ingreso verificado (Adenda 4 §10): el analista registra, dentro de la
 * revisión manual, el ingreso que comprobó con documentos. Con uno vigente,
 * el endeudamiento y el canon sobre ingreso vuelven a ser obligatorios: si no
 * se cumplen, el estudio no se puede aprobar (el bloqueo lo dice el API).
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconFileCheck, IconAlertTriangle } from '@/components/icons'
import { expedienteService, type IIngresoVerificado, type EvaluadoIngreso } from '@/services/expedienteService'
import { formatCurrency, formatDate } from '@/lib/constants'

const EVALUADOS: Array<{ id: EvaluadoIngreso; etiqueta: string }> = [
  { id: 'empleado', etiqueta: 'Empleado' },
  { id: 'independiente', etiqueta: 'Independiente o con actividad comercial' },
  { id: 'pensionado', etiqueta: 'Pensionado' },
]

const CAMPO =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100'

const hoyBogota = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)
const pct = (n: number | null) => (n === null ? 'sin dato' : `${n.toLocaleString('es-CO')} %`)

export function IngresoVerificadoSection({ expedienteId, onRegistrado }: { expedienteId: string; onRegistrado?: () => void }) {
  const [datos, setDatos] = useState<IIngresoVerificado | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [evaluado, setEvaluado] = useState<EvaluadoIngreso | ''>('')
  const [tipo, setTipo] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState('')

  useEffect(() => {
    let cancel = false
    expedienteService.leerIngresoVerificado(expedienteId).then(
      (d) => {
        if (cancel) return
        setDatos(d)
        const declarado = EVALUADOS.find((e) => e.id === d.situacion_laboral)
        if (declarado) setEvaluado(declarado.id)
      },
      () => {},
    )
    return () => {
      cancel = true
    }
  }, [expedienteId])

  if (!datos) return null
  const tipos = datos.tipos.filter((t) => t.evaluado === evaluado)
  const etiquetaSoporte = (clave: string) => datos.tipos.find((t) => t.clave === clave)?.etiqueta ?? clave
  const montoNum = Number(monto.replace(/\D/g, ''))
  const listo = !!tipo && montoNum > 0 && !!fecha

  const guardar = async () => {
    if (!listo || guardando) return
    setGuardando(true)
    try {
      const d = await expedienteService.registrarIngresoVerificado(expedienteId, { monto: montoNum, tipo_soporte: tipo, fecha_soporte: fecha })
      setDatos(d)
      setAbierto(false)
      setMonto('')
      setFecha('')
      toast.success('Ingreso verificado registrado')
      onRegistrado?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el ingreso verificado')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <div className="flex items-start gap-2">
        <IconFileCheck size={16} className="mt-0.5 shrink-0 text-primary-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Ingreso verificado</p>
          {datos.vigente ? (
            <>
              <p className="text-gray-700">
                {formatCurrency(datos.vigente.monto)} al mes · {etiquetaSoporte(datos.vigente.tipo_soporte)} del{' '}
                {formatDate(datos.vigente.fecha_soporte)} · vale hasta el {formatDate(datos.vigente.vence_el)}
              </p>
              {datos.evaluacion && (
                <p className={datos.evaluacion.cumple ? 'text-primary-800' : 'text-red-700'}>
                  {!datos.evaluacion.cumple && <IconAlertTriangle size={14} className="mr-1 inline" />}
                  Con este ingreso, el endeudamiento es {pct(datos.evaluacion.dti_pct)} (máximo 65 %) y el canon es{' '}
                  {pct(datos.evaluacion.canon_ingreso_pct)} del ingreso (máximo 40 %):{' '}
                  {datos.evaluacion.cumple ? 'cumple.' : 'no cumple, y con ingreso verificado eso impide aprobarlo.'}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-600">
              El ingreso de este estudio es una estimación de la central. Si el solicitante entregó soportes, regístrelo
              aquí: con un ingreso verificado, el endeudamiento y el canon sobre ingreso vuelven a ser obligatorios.
            </p>
          )}

          {!abierto ? (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="mt-2 text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              {datos.vigente ? 'Registrar otro ingreso verificado' : 'Registrar ingreso verificado'}
            </button>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Tipo de solicitante</span>
                <select
                  className={CAMPO}
                  value={evaluado}
                  onChange={(e) => {
                    setEvaluado(e.target.value as EvaluadoIngreso)
                    setTipo('')
                  }}
                >
                  <option value="">Elija…</option>
                  {EVALUADOS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Documento soporte</span>
                <select className={CAMPO} value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!evaluado}>
                  <option value="">Elija…</option>
                  {tipos.map((t) => (
                    <option key={t.clave} value={t.clave}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Ingreso mensual comprobado</span>
                <input
                  className={CAMPO}
                  inputMode="numeric"
                  placeholder="$0"
                  value={montoNum > 0 ? formatCurrency(montoNum) : ''}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Fecha del documento</span>
                <input type="date" className={CAMPO} value={fecha} max={hoyBogota()} onChange={(e) => setFecha(e.target.value)} />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={guardar}
                  disabled={!listo || guardando}
                  className="inline-flex items-center rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setAbierto(false)} className="text-xs text-gray-600 hover:text-gray-800">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
