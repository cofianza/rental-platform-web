/**
 * Paso 3 del asistente de contratos V3: plazo, fechas, comisión y cuota de
 * administración (solo con propiedad horizontal). Día de pago, incremento y
 * servicios públicos son fijos en la plantilla y se muestran de solo lectura.
 */

'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/constants'
import { hoyBogota, sumarDias, type Borrador, type ErroresPaso } from '@/hooks/useContratoV3'
import type { Administracion, Paso3 } from '@/types/contratoV3'
import { Campo, EncabezadoPaso, SiNo, inputClass, numeroDe } from './campos'

/**
 * Copia de sumarMeses del motor (formato.ts, art. 67 C.C.): mismo día del mes
 * de llegada, o su último día si no existe. Solo para mostrar; manda el PDF.
 */
function sumarMeses(iso: string, meses: number): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const t = anio * 12 + (mes - 1) + meses
  const [a, m] = [Math.floor(t / 12), (t % 12) + 1]
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return `${a}-${String(m).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

interface Props {
  value: Borrador<Paso3>
  onChange: (v: Borrador<Paso3>) => void
  errores: ErroresPaso
  /** Respuesta del paso 2: con PH se pide la cuota de administración. */
  propiedadHorizontal: boolean | undefined
  /** Canon del paso 1, para mostrar la comisión en pesos. */
  canonCop: number | undefined
}

export function Paso3Condiciones({ value, onChange, errores, propiedadHorizontal, canonCop }: Props) {
  const hoy = hoyBogota()
  // La entrega sigue a la iniciación hasta que el usuario la cambia a mano.
  const [entregaManual, setEntregaManual] = useState(
    () => !!value.fechaEntrega && value.fechaEntrega !== value.fechaInicio,
  )
  const adm: Borrador<Administracion> = value.administracion ?? {}
  const ponerAdm = (patch: Borrador<Administracion>) => onChange({ ...value, administracion: { ...adm, ...patch } })

  const vigencia = value.vigenciaMeses
  const vencimiento =
    value.fechaInicio && FECHA.test(value.fechaInicio) && vigencia && Number.isInteger(vigencia) && vigencia >= 2
      ? formatDate(sumarMeses(value.fechaInicio, vigencia))
      : '—'
  const comision = value.comisionPct
  const comisionCop =
    comision !== undefined && !Number.isNaN(comision) && canonCop ? Math.round((canonCop * comision) / 100) : null

  return (
    <div className="space-y-6">
      <EncabezadoPaso titulo="Plazo y condiciones" subtitulo="Vigencia, fechas y valores que pacta el contrato." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          label="Vigencia (meses)"
          requerido
          type="number"
          inputMode="numeric"
          min={2}
          max={120}
          step={1}
          value={vigencia ?? ''}
          onChange={(e) => onChange({ ...value, vigenciaMeses: numeroDe(e.target.value) })}
          error={errores.vigenciaMeses}
        />
        <div />
        <Campo
          label="Fecha de iniciación"
          requerido
          type="date"
          min={hoy}
          max={sumarDias(hoy, 365)}
          value={value.fechaInicio ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              fechaInicio: e.target.value,
              ...(entregaManual ? {} : { fechaEntrega: e.target.value }),
            })
          }
          error={errores.fechaInicio}
        />
        <div>
          <p className="mb-1 block text-sm font-medium text-gray-700">
            Fecha de vencimiento <span className="font-normal text-gray-400">(calculada)</span>
          </p>
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{vencimiento}</p>
        </div>
        <Campo
          label="Fecha de entrega material"
          requerido
          type="date"
          min={hoy}
          max={sumarDias(hoy, 365)}
          value={value.fechaEntrega ?? ''}
          onChange={(e) => {
            setEntregaManual(true)
            onChange({ ...value, fechaEntrega: e.target.value })
          }}
          error={errores.fechaEntrega}
          help="Alimenta el acta de entrega."
        />
      </div>

      <ul className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <li>Día límite de pago: el primer día de cada período mensual.</li>
        <li>Incremento anual: 100 % del IPC del año anterior, sin puntos adicionales (límite de la Ley 820 de 2003).</li>
      </ul>

      <div className="sm:max-w-xs">
        <Campo
          label="Comisión de intermediación (%)"
          requerido
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.01"
          value={comision ?? ''}
          onChange={(e) => onChange({ ...value, comisionPct: numeroDe(e.target.value) })}
          error={errores.comisionPct}
          help={
            <>
              {comisionCop !== null && (
                <span className="block font-medium text-gray-700">= {formatCurrency(comisionCop)} sobre el canon</span>
              )}
              <span className="block">Con 0 % la cláusula de comisión no se imprime.</span>
            </>
          }
        />
      </div>

      {propiedadHorizontal && (
        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Cuota de administración</legend>
          {errores.administracion && <p className="text-xs text-red-600">{errores.administracion}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cuota de administración a cargo de<span className="text-coral-500"> *</span>
              <select
                value={adm.aCargoDe ?? ''}
                onChange={(e) => ponerAdm({ aCargoDe: e.target.value as Administracion['aCargoDe'] })}
                className={`mt-1 ${inputClass(errores['administracion.aCargoDe'])}`}
              >
                <option value="" disabled>
                  Elige…
                </option>
                <option value="arrendador">Arrendador</option>
                <option value="arrendatario">Arrendatario</option>
              </select>
            </label>
            {errores['administracion.aCargoDe'] && (
              <p className="mt-1 text-xs text-red-600">{errores['administracion.aCargoDe']}</p>
            )}
          </div>
          <div className="sm:max-w-xs">
            <Campo
              label="Valor a la fecha de suscripción (COP)"
              requerido
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={adm.valorCop ?? ''}
              onChange={(e) => ponerAdm({ valorCop: numeroDe(e.target.value) })}
              error={errores['administracion.valorCop']}
              help={adm.valorCop !== undefined && !Number.isNaN(adm.valorCop) ? formatCurrency(adm.valorCop) : undefined}
            />
          </div>
          <SiNo
            label="¿Incluida en el canon?"
            value={adm.incluidaEnCanon}
            onChange={(incluidaEnCanon) => ponerAdm({ incluidaEnCanon })}
            error={errores['administracion.incluidaEnCanon']}
          />
        </fieldset>
      )}

      <div>
        <p className="text-sm font-medium text-gray-700">Servicios públicos</p>
        <p className="mt-1 text-sm text-gray-600">
          A cargo del arrendatario, según la cláusula de SERVICIOS PÚBLICOS del contrato. La elección por servicio estará
          disponible más adelante.
        </p>
      </div>
    </div>
  )
}
