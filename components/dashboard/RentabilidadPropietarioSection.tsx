/**
 * RentabilidadPropietarioSection — "Mi rentabilidad" del propietario (mockup 14).
 * Usa el canon REAL de cada inmueble (dashboardService.getMisInmuebles) y deja
 * que el propietario escriba gastos (administración/predial/otros) y el valor
 * del inmueble para CALCULAR ingreso neto y rentabilidad anual. Esos gastos son
 * estimaciones LOCALES: no se guardan (igual que el mockup). No inventa datos.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { dashboardService, type MiInmueble } from '@/services/dashboardService'
import { money } from '@/components/dashboard/secciones/_shared'
import { cn } from '@/lib/utils'
import {
  IconLoader,
  IconDollarSign,
  IconTrendingUp,
  IconBarChart3,
  IconInfo,
  IconShieldCheck,
  IconHome,
} from '@/components/icons'

const onlyDigits = (s: string) => s.replace(/\D/g, '')
const toNum = (s: string | undefined) => (s ? Number(s) : 0)
const pct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`

interface Gastos {
  admin: string
  predial: string
  otros: string
  valor: string
}
const EMPTY: Gastos = { admin: '', predial: '', otros: '', valor: '' }

export function RentabilidadPropietarioSection() {
  const [inmuebles, setInmuebles] = useState<MiInmueble[]>([])
  const [loading, setLoading] = useState(true)
  const [gastos, setGastos] = useState<Record<string, Gastos>>({})
  const [calc, setCalc] = useState({ valor: '', canon: '' })

  useEffect(() => {
    dashboardService
      .getMisInmuebles()
      .then((d) => setInmuebles(d.inmuebles))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const g = (id: string) => gastos[id] ?? EMPTY
  const setG = (id: string, key: keyof Gastos, v: string) =>
    setGastos((p) => ({ ...p, [id]: { ...EMPTY, ...p[id], [key]: onlyDigits(v) } }))

  // Totales de cartera (canon real + gastos/valor escritos por el propietario).
  const cartera = useMemo(() => {
    let brutos = 0
    let gastosMes = 0
    let valorTot = 0
    for (const i of inmuebles) {
      const x = g(i.id)
      brutos += i.canon || 0
      gastosMes += toNum(x.admin) + toNum(x.predial) + toNum(x.otros)
      valorTot += toNum(x.valor)
    }
    const netoMes = brutos - gastosMes
    const rent = valorTot > 0 ? (netoMes * 12 * 100) / valorTot : null
    return { brutos, gastosMes, netoMes, valorTot, rent }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmuebles, gastos])

  const calcRoi = useMemo(() => {
    const valor = toNum(calc.valor)
    const canon = toNum(calc.canon)
    if (valor <= 0 || canon <= 0) return null
    return (canon * 12 * 100) / valor
  }, [calc])

  if (loading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-live="polite">
        <IconLoader size={24} className="animate-spin text-primary-600" />
        <span className="sr-only">Cargando rentabilidad…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Nota honesta */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
        <IconInfo size={14} className="mt-0.5 shrink-0" />
        <span>
          El canon de cada inmueble es real. Los gastos y el valor del inmueble son estimaciones tuyas para
          calcular la rentabilidad — <strong>no se guardan</strong>.
        </span>
      </div>

      {/* Rentabilidad por inmueble */}
      <Panel title="Rentabilidad por inmueble" dot="bg-primary-600">
        {inmuebles.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            Aún no tienes inmuebles registrados.
          </p>
        ) : (
          <div className="space-y-4 p-5">
            {inmuebles.map((i) => {
              const x = g(i.id)
              const gastosMes = toNum(x.admin) + toNum(x.predial) + toNum(x.otros)
              const netoMes = (i.canon || 0) - gastosMes
              const valor = toNum(x.valor)
              const rent = valor > 0 ? (netoMes * 12 * 100) / valor : null
              return (
                <div key={i.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        {i.codigo && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold">
                            {i.codigo}
                          </span>
                        )}
                        {i.direccion ?? 'Inmueble'}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-500">{i.ciudad ?? '—'}</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                        i.garantiaActiva
                          ? 'bg-primary-50 text-primary-700'
                          : 'bg-gray-50 text-gray-600 border border-gray-200',
                      )}
                    >
                      <IconShieldCheck size={12} />
                      {i.garantiaActiva ? 'Con garantía Cofianza' : 'Sin garantía'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Campo label="Canon mensual">
                      <p className="text-lg font-black tracking-tight text-gray-900">{money(i.canon || 0)}</p>
                    </Campo>
                    <CampoInput label="Administración" value={x.admin} onChange={(v) => setG(i.id, 'admin', v)} />
                    <CampoInput label="Predial mensual" value={x.predial} onChange={(v) => setG(i.id, 'predial', v)} />
                    <CampoInput label="Otros gastos" value={x.otros} onChange={(v) => setG(i.id, 'otros', v)} />
                    <Campo label="Ingreso neto mes">
                      <p className={cn('text-lg font-black tracking-tight', netoMes >= 0 ? 'text-primary-600' : 'text-red-500')}>
                        {money(netoMes)}
                      </p>
                    </Campo>
                    <Campo label="Ingreso neto anual">
                      <p className={cn('text-lg font-black tracking-tight', netoMes >= 0 ? 'text-primary-600' : 'text-red-500')}>
                        {money(netoMes * 12)}
                      </p>
                    </Campo>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
                    <CampoInput
                      label="Valor del inmueble"
                      value={x.valor}
                      onChange={(v) => setG(i.id, 'valor', v)}
                      placeholder="Ej: 180000000"
                    />
                    <Campo label="Rentabilidad anual">
                      <p className="text-2xl font-black tracking-tight text-primary-600">
                        {rent != null ? pct(rent) : '—'}
                      </p>
                    </Campo>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Resumen total de cartera */}
      <Panel title="Resumen de tu cartera" dot="bg-primary-600">
        <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
          <Stat label="Ingresos brutos" value={money(cartera.brutos)} sub="mensual" Icon={IconDollarSign} color="text-blue-600" />
          <Stat label="Gastos" value={money(cartera.gastosMes)} sub="mensual" Icon={IconBarChart3} color="text-coral-500" />
          <Stat
            label="Ingreso neto"
            value={money(cartera.netoMes)}
            sub="mensual"
            Icon={IconTrendingUp}
            color={cartera.netoMes >= 0 ? 'text-primary-600' : 'text-red-500'}
          />
          <Stat
            label="Rentabilidad"
            value={cartera.rent != null ? pct(cartera.rent) : '—'}
            sub="anual promedio"
            Icon={IconBarChart3}
            color="text-primary-600"
          />
        </div>
      </Panel>

      {/* Calculadora rápida */}
      <div className="rounded-xl border border-primary-500 bg-primary-50 p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-primary-800">
          <IconHome size={18} />
          ¿Cuánto te da cada peso invertido?
        </h3>
        <p className="mt-0.5 text-sm text-primary-700">
          Ingresa el valor de un inmueble y su canon para calcular la rentabilidad anual.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <CalcInput label="Valor del inmueble" value={calc.valor} onChange={(v) => setCalc((c) => ({ ...c, valor: onlyDigits(v) }))} placeholder="Ej: 200000000" />
          <CalcInput label="Canon mensual" value={calc.canon} onChange={(v) => setCalc((c) => ({ ...c, canon: onlyDigits(v) }))} placeholder="Ej: 1500000" />
        </div>
        {calcRoi != null && (
          <div className="mt-4 rounded-lg bg-white/70 px-4 py-3">
            <p className="text-2xl font-black tracking-tight text-primary-700">{pct(calcRoi)} anual</p>
            <p className="mt-0.5 text-xs text-primary-700">
              Ingreso anual bruto {money(toNum(calc.canon) * 12)} sobre una inversión de {money(toNum(calc.valor))}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────

function Panel({ title, dot, children }: { title: string; dot: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-200 px-6 py-5">
        <span className={cn('inline-block h-2 w-2 rounded-full', dot)} />
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      {children}
    </div>
  )
}

function CampoInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
      />
      {value && <p className="mt-1 text-xs text-gray-500">{money(toNum(value))}</p>}
    </div>
  )
}

function CalcInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-primary-700">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  Icon,
  color,
}: {
  label: string
  value: string
  sub: string
  Icon: typeof IconDollarSign
  color: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        <Icon size={13} />
        {label}
      </div>
      <div className={cn('text-2xl font-black leading-none tracking-tight', color)}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}
