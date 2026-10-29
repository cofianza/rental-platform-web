'use client'

/**
 * Lo primero que ve la Gerencia: cómo se decide un estudio (la escala), qué
 * paquetes de reglas están encendidos, lo que se cobra y los plazos clave.
 * Cada número abre su diálogo de cambio.
 */

import type { IHistorialCalibracion, IParametroCalibracion } from '@/services/calibracionService'
import { IconInfo, IconLock } from '@/components/icons'
import { EscalaDecision } from './EscalaDecision'
import { ParametroFila } from './ParametroFila'
import { conUnidad, metaDe, type SeccionId, type Valores } from './parametros'

interface Props {
  params: IParametroCalibracion[]
  valores: Valores
  ultimo: Map<string, IHistorialCalibracion>
  onAbrir: (clave: string) => void
  onIr: (v: SeccionId) => void
}

const REGLAS = ['ADENDA3_V2', 'ADENDA4']
const COBROS = ['PRECIO_ESTUDIO_INDIVIDUAL', 'TARIFA_IVA', 'TARIFA_VIA_AUTOMATICA', 'TARIFA_VIA_NO_AUTOMATICA']
const CLAVE = ['CANON_MAX_TRANSITORIO', 'DIAS_EXPIRACION_ESTUDIO', 'DIAS_CADUCIDAD_ESTUDIO', 'VIGENCIA_CRC_DIAS', 'DIAS_EXPIRACION_FIRMA']

function Tarjeta({ titulo, ayuda, accion, children }: { titulo: string; ayuda?: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
          {ayuda && <p className="text-sm text-gray-600">{ayuda}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

export function Resumen({ params, valores, ultimo, onAbrir, onIr }: Props) {
  const de = (claves: string[]) => claves.map((c) => params.find((p) => p.clave === c)).filter((p): p is IParametroCalibracion => !!p)

  const cifra = (p: IParametroCalibracion) => {
    const meta = metaDe(p.clave)
    const ejemplo = meta.ejemplo?.(valores)
    return (
      <li key={p.clave}>
        <button
          type="button"
          onClick={() => onAbrir(p.clave)}
          className="flex h-full w-full flex-col rounded-lg border border-gray-200 p-3 text-left hover:border-primary-300 hover:bg-primary-50/40"
        >
          <span className="text-xs font-semibold text-gray-600">{meta.nombre}</span>
          <span className="mt-1 text-xl font-bold text-gray-900">{conUnidad(p.valor, p)}</span>
          {ejemplo && <span className="mt-0.5 text-xs text-gray-500">{ejemplo}</span>}
        </button>
      </li>
    )
  }

  const verTodo = (id: SeccionId, texto: string) => (
    <button type="button" onClick={() => onIr(id)} className="text-sm font-medium text-primary-700 hover:underline">
      {texto}
    </button>
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 sm:grid-cols-3">
        <p className="flex items-start gap-2">
          <IconInfo size={16} className="mt-0.5 shrink-0 text-primary-600" />
          Toque un valor para ver qué hace y cambiarlo. El cambio aplica de inmediato a lo que se procese después.
        </p>
        <p className="flex items-start gap-2">
          <IconLock size={16} className="mt-0.5 shrink-0 text-gray-500" />
          Los valores que afectan el riesgo (puntajes, precios, tarifas, topes y vigencias) solo los cambia la Gerencia General; al tocar un
          valor se indica si usted puede cambiarlo.
        </p>
        <p className="flex items-start gap-2">
          <IconInfo size={16} className="mt-0.5 shrink-0 text-amber-600" />
          Antes de mover un puntaje o un tope, Tecnología debe validar la matriz de casos de prueba.
        </p>
      </div>

      <Tarjeta
        titulo="Cómo se decide un estudio"
        ayuda="Con el puntaje del solicitante (de 0 a 100) y el puntaje que reporta la central de riesgo. Toque un número para cambiarlo."
        accion={verTodo('aprobacion', 'Ver todos los puntajes')}
      >
        <div className="p-4">
          <EscalaDecision valores={valores} onAbrir={onAbrir} />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Reglas encendidas" ayuda="Paquetes de reglas que se encienden o apagan completos.">
        <div className="divide-y divide-gray-100">
          {de(REGLAS).map((p) => (
            <ParametroFila key={p.clave} p={p} valores={valores} ultimo={ultimo.get(p.clave)} onAbrir={onAbrir} />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Lo que se cobra" accion={verTodo('precios', 'Ver precios y cobros')}>
        <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{de(COBROS).map(cifra)}</ul>
      </Tarjeta>

      <Tarjeta
        titulo="Topes y plazos clave"
        accion={
          <div className="flex flex-wrap gap-3">
            {verTodo('plazos', 'Ver autorización y plazos')}
            {verTodo('contratos', 'Ver canon y contratos')}
          </div>
        }
      >
        <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{de(CLAVE).map(cifra)}</ul>
      </Tarjeta>
    </div>
  )
}
