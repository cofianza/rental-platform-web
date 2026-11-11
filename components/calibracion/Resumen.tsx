'use client'

/**
 * Lo primero que ve la Gerencia: cómo se decide un estudio (la escala), qué
 * paquetes de reglas están encendidos, lo que se cobra y los plazos clave.
 * Cada número abre su diálogo de cambio. La fórmula del puntaje es material
 * de consulta: va al final y plegada.
 */

import type { IHistorialCalibracion, IParametroCalibracion, ITablasPuntaje } from '@/services/calibracionService'
import { IconAlertTriangle, IconArrowRight, IconChevronDown, IconLock, IconPencil } from '@/components/icons'
import { EscalaA5D, EscalaDecision } from './EscalaDecision'
import { ComoSeCalcula, ComoSeCalculaA5D } from './ComoSeCalcula'
import { ParametroFila } from './ParametroFila'
import { a5dEncendida, conUnidad, metaDe, rigeHoy, type SeccionId, type Valores } from './parametros'

interface Props {
  params: IParametroCalibracion[]
  valores: Valores
  tablas: ITablasPuntaje | null
  ultimo: Map<string, IHistorialCalibracion>
  onAbrir: (clave: string) => void
  onIr: (v: SeccionId) => void
}

const REGLAS = ['ADENDA3_V2', 'ADENDA4', 'ADENDA5_DEF']
const COBROS = ['PRECIO_ESTUDIO_INDIVIDUAL', 'TARIFA_IVA', 'TARIFA_VIA_AUTOMATICA', 'TARIFA_VIA_NO_AUTOMATICA']
// Adenda 5 definitiva: una prima y una tarifa únicas en lugar de las dos tarifas.
const COBROS_A5D = ['PRECIO_ESTUDIO_INDIVIDUAL', 'TARIFA_IVA', 'PRIMA_VINCULACION', 'TARIFA_MENSUAL']
const CLAVE = ['CANON_MAX_TRANSITORIO', 'DIAS_EXPIRACION_ESTUDIO', 'DIAS_CADUCIDAD_ESTUDIO', 'VIGENCIA_CRC_DIAS', 'DIAS_EXPIRACION_FIRMA']

function Tarjeta({
  titulo,
  ayuda,
  accion,
  plegable = false,
  children,
}: {
  titulo: string
  ayuda?: string
  accion?: React.ReactNode
  /** Material de consulta: arranca plegado para que el resumen se lea de un vistazo. */
  plegable?: boolean
  children: React.ReactNode
}) {
  const cabecera = (
    <div className="min-w-0">
      <h2 className="text-base font-bold text-gray-900 text-balance">{titulo}</h2>
      {ayuda && <p className="mt-0.5 max-w-prose text-sm text-gray-600">{ayuda}</p>}
    </div>
  )
  if (plegable) {
    // El título queda fuera del <summary>: dentro, el lector lo anunciaba como botón y no como encabezado.
    return (
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 pt-3 sm:px-5">{cabecera}</div>
        <details className="group">
          <summary className="mx-2 mb-2 mt-1 flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary-700 hover:bg-gray-50 sm:mx-3 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Ver la fórmula y los factores</span>
            <span className="hidden group-open:inline">Ocultar la fórmula y los factores</span>
            <IconChevronDown size={16} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="border-t border-gray-100">{children}</div>
        </details>
      </section>
    )
  }
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-3 sm:px-5">
        {cabecera}
        {accion}
      </div>
      {children}
    </section>
  )
}

export function Resumen({ params, valores, tablas, ultimo, onAbrir, onIr }: Props) {
  const a5d = a5dEncendida(valores)
  // La Adenda 5 solo si el API la trae: con uno anterior, el resumen queda como estaba.
  const hayA5d = params.some((p) => p.clave === 'ADENDA5_DEF')
  const de = (claves: string[]) => claves.map((c) => params.find((p) => p.clave === c)).filter((p): p is IParametroCalibracion => !!p)

  const cifra = (p: IParametroCalibracion) => {
    const meta = metaDe(p.clave)
    const ejemplo = meta.ejemplo?.(valores)
    const soloVer = p.min === p.max || p.editable === false
    return (
      <li key={p.clave}>
        <button
          type="button"
          onClick={() => onAbrir(p.clave)}
          className="group flex h-full min-h-24 w-full flex-col rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/40 motion-reduce:transition-none"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-gray-600">
              <span className="sr-only">{soloVer ? 'Ver: ' : 'Cambiar: '}</span>
              {meta.nombre}
            </span>
            {soloVer ? (
              <IconLock size={14} className="mt-0.5 shrink-0 text-gray-400" />
            ) : (
              <IconPencil size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-primary-700" />
            )}
          </span>
          <span className="mt-1 text-xl font-bold tabular-nums text-gray-900">{conUnidad(p.valor, p)}</span>
          {ejemplo && <span className="mt-0.5 text-xs text-gray-600">{ejemplo}</span>}
        </button>
      </li>
    )
  }

  const verTodo = (id: SeccionId, texto: string) => (
    <button
      type="button"
      onClick={() => onIr(id)}
      className="-mx-1 inline-flex min-h-10 items-center gap-1 rounded-md px-1 text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline"
    >
      {texto}
      <IconArrowRight size={14} />
    </button>
  )

  return (
    <div className="space-y-5">
      <section aria-labelledby="antes-de-cambiar" className="rounded-xl border border-gray-200 bg-white px-4 py-3 sm:px-5">
        <h2 id="antes-de-cambiar" tabIndex={-1} className="text-sm font-semibold text-gray-900 focus:outline-none">
          Antes de cambiar un valor
        </h2>
        <ul className="mt-2 grid gap-x-6 gap-y-2 text-sm text-gray-700 xl:grid-cols-3">
          <li className="flex items-start gap-2">
            <IconPencil size={16} className="mt-0.5 shrink-0 text-primary-700" />
            <span>Toque un valor para ver qué hace y cambiarlo. El cambio aplica de inmediato a lo que se procese después.</span>
          </li>
          <li className="flex items-start gap-2">
            <IconLock size={16} className="mt-0.5 shrink-0 text-gray-500" />
            <span>
              Los valores que afectan el riesgo (puntajes, precios, tarifas, topes y vigencias) solo los cambia la Gerencia General; al tocar un
              valor se indica si usted puede cambiarlo.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <span>Antes de mover un puntaje o un tope, Tecnología debe validar la matriz de casos de prueba.</span>
          </li>
        </ul>
      </section>

      {a5d ? (
        <Tarjeta
          titulo="Cómo se decide un estudio"
          ayuda="Con la Adenda 5 definitiva: con el puntaje de la persona (de 0 a 100) y el puntaje que reporta la central (de 0 a 999). Toque un número para cambiarlo."
          accion={verTodo('a5d_motor', 'Ver el motor de la Adenda 5 definitiva')}
        >
          <div className="px-4 py-4 sm:px-5">
            <EscalaA5D valores={valores} onAbrir={onAbrir} />
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta
          titulo="Cómo se decide un estudio"
          ayuda="Con el puntaje del solicitante (de 0 a 100) y el puntaje que reporta la central de riesgo. Toque un número para cambiarlo."
          accion={verTodo('aprobacion', 'Ver todos los puntajes')}
        >
          <div className="px-4 py-4 sm:px-5">
            <EscalaDecision valores={valores} onAbrir={onAbrir} />
          </div>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Reglas encendidas"
        ayuda="Paquetes de reglas que se encienden o apagan completos."
        accion={hayA5d ? verTodo('a5d_motor', 'Ver la Adenda 5 definitiva') : undefined}
      >
        <div className="divide-y divide-gray-100">
          {de(REGLAS).map((p) => (
            <ParametroFila key={p.clave} p={p} valores={valores} ultimo={ultimo.get(p.clave)} onAbrir={onAbrir} />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Lo que se cobra" accion={verTodo('precios', 'Ver precios y cobros')}>
        <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">{de(a5d ? COBROS_A5D : COBROS).map(cifra)}</ul>
      </Tarjeta>

      <Tarjeta
        titulo="Topes y plazos clave"
        accion={
          <div className="flex flex-wrap gap-x-4">
            {verTodo('plazos', 'Ver autorización y plazos')}
            {verTodo('contratos', 'Ver canon y contratos')}
          </div>
        }
      >
        <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{de(CLAVE).filter((p) => rigeHoy(metaDe(p.clave), valores)).map(cifra)}</ul>
      </Tarjeta>

      <Tarjeta
        titulo="Cómo se calcula el puntaje del solicitante"
        ayuda={
          a5d
            ? 'La fórmula de la Adenda 5 definitiva: nueve factores que suman puntos y se llevan a una escala de 0 a 100.'
            : 'La fórmula de la Política: nueve factores que suman puntos y se llevan a una escala de 0 a 100.'
        }
        plegable
      >
        <div className="px-4 py-4 sm:px-5">{a5d ? <ComoSeCalculaA5D valores={valores} tablas={tablas} /> : <ComoSeCalcula valores={valores} tablas={tablas} />}</div>
      </Tarjeta>
    </div>
  )
}
