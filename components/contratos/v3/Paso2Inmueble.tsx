/**
 * Paso 2 del asistente de contratos V3: usos anexos, amoblado, ocupantes y
 * propiedad horizontal. En `usos`, null = No y un texto = Sí con su número o
 * identificación. La respuesta de propiedad horizontal también actualiza el
 * registro del inmueble (lo hace el API al guardar, §1.4).
 */

'use client'

import type { Borrador, ErroresPaso } from '@/hooks/useContratoV3'
import type { Paso2 } from '@/types/contratoV3'
import { Aviso, Campo, EncabezadoPaso, SiNo, numeroDe } from './campos'

type Usos = Paso2['usos']

const USOS: { clave: keyof Usos; label: string }[] = [
  { clave: 'carro', label: 'Parqueadero de carro' },
  { clave: 'moto', label: 'Parqueadero de moto' },
  { clave: 'util', label: 'Cuarto útil o depósito' },
]

interface Props {
  value: Borrador<Paso2>
  onChange: (v: Borrador<Paso2>) => void
  errores: ErroresPaso
}

export function Paso2Inmueble({ value, onChange, errores }: Props) {
  const usos = value.usos ?? {}
  const ponerUso = (clave: keyof Usos, v: string | null) => onChange({ ...value, usos: { ...usos, [clave]: v } })

  return (
    <div className="space-y-6">
      <EncabezadoPaso titulo="Inmueble y anexos" subtitulo="Lo que se entrega con el inmueble y quién lo habita." />

      <div className="space-y-4">
        {USOS.map(({ clave, label }) => {
          const v = usos[clave]
          return (
            <div key={clave} className="space-y-2">
              <SiNo
                label={label}
                value={v === undefined ? undefined : v !== null}
                // Sí conserva lo escrito antes; No lo borra (null = no incluido).
                onChange={(si) => ponerUso(clave, si ? (v ?? '') : null)}
                error={v === undefined ? errores[`usos.${clave}`] : undefined}
              />
              {typeof v === 'string' && (
                <div className="sm:max-w-xs">
                  <Campo
                    label="Número o identificación"
                    requerido
                    maxLength={40}
                    value={v}
                    onChange={(e) => ponerUso(clave, e.target.value)}
                    error={errores[`usos.${clave}`]}
                  />
                </div>
              )}
            </div>
          )
        })}
        <p className="text-xs text-gray-500">Los usos que marques como No quedan en el contrato como no incluidos.</p>
      </div>

      <SiNo
        label="¿Está amoblado?"
        value={value.amoblado}
        onChange={(amoblado) => onChange({ ...value, amoblado })}
        error={errores.amoblado}
        help="No se imprime; alimenta el acta de entrega."
      />

      <div className="sm:max-w-xs">
        <Campo
          label="Número de ocupantes"
          requerido
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          step={1}
          value={value.ocupantes ?? ''}
          onChange={(e) => onChange({ ...value, ocupantes: numeroDe(e.target.value) })}
          error={errores.ocupantes}
          help="Se guarda con el contrato."
        />
      </div>

      <div className="space-y-3">
        <SiNo
          label="¿Propiedad horizontal?"
          value={value.propiedadHorizontal}
          // Sin PH el nombre de la copropiedad debe ir en null (lo exige el API).
          onChange={(ph) =>
            onChange({ ...value, propiedadHorizontal: ph, nombreCopropiedad: ph ? (value.nombreCopropiedad ?? '') : null })
          }
          error={errores.propiedadHorizontal}
          help="Esta respuesta también actualiza el registro del inmueble."
        />
        {value.propiedadHorizontal === true && (
          <Campo
            label="Nombre de la copropiedad"
            requerido
            maxLength={150}
            value={value.nombreCopropiedad ?? ''}
            onChange={(e) => onChange({ ...value, nombreCopropiedad: e.target.value })}
            error={errores.nombreCopropiedad}
          />
        )}
        {value.propiedadHorizontal === false && (
          <Aviso tono="aviso">
            Sin propiedad horizontal, el texto de la cláusula de administración está pendiente de Gerencia: la vista previa
            saldrá marcada.
          </Aviso>
        )}
      </div>
    </div>
  )
}
