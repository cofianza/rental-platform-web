/**
 * Analítica de cartera de la inmobiliaria (mockup 13_v2), agregada en /reportes
 * SIN tocar el grid de reportes existente. Se auto-restringe a rol inmobiliaria
 * (devuelve null para otros). Solo secciones con datos reales: Salud de cartera
 * + Desempeño de estudios + Próximas acciones pendientes (widget existente).
 * No incluye tiers/comisión/cashback/comparación-sector (no existen / inventados).
 *
 * Re-skin (mockup 13_v2): stat-cards grandes estilo "est-stat" (igual que
 * EstudiosExpedientesFusion) dentro de paneles con header de punto verde, en
 * lugar de los Kpi/KpiRow compactos. Mismos datos reales de getMiCarteraAnalitica.
 *
 * Reporte de la Oficina Virtual (25-nov), puntos 1, 7 y 13: los estudios, la tasa y los contratos salen de
 * GET /oficina-virtual/conteos, las mismas cifras de Estudios y Contratos, con su periodo al lado: «Estudios
 * aprobados» desde el inicio (las pestañas de Estudios), la tasa de los últimos 30 días («Aprobamos 6 de cada 10»,
 * con el detalle al pasar el cursor o tocar), «En revisión de Cofianza» en este momento (la pestaña de Estudios, no
 * las decisiones del periodo) y los contratos activos con sus cancelados y terminados.
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { dashboardService, type MiCarteraAnalitica } from '@/services/dashboardService'
import { moneyCompact } from '@/components/dashboard/secciones/_shared'
import { AccionesPendientesWidget } from '@/components/dashboard/AccionesPendientesWidget'
import { cn } from '@/lib/utils'
import { desgloseDeCifras, fraseDesgloseAprobacion, tasaLegible } from '@/lib/conteosEstudios'
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton'
import { InfoTip } from '@/components/ui/InfoTip'
import { AvisoCifras } from '@/components/ui/AvisoCifras'
import { useConteosOficina } from '@/hooks/useConteosOficina'
import { detalleAprobacion, textoAprobamos, TEXTO_PERIODO } from '@/lib/conteosOficina'
import { notaContratosCerrados } from '@/lib/contratosCancelados'
import type { SeccionOficina } from '@/types/oficinaVirtual'

/** Las cifras que comparte con Estudios y Contratos. */
const SECCIONES: readonly SeccionOficina[] = ['estudios', 'aprobacion', 'contratos']

export function CarteraAnaliticaSection() {
  const rol = useAuthStore((s) => s.user?.rol)
  const [data, setData] = useState<MiCarteraAnalitica | null>(null)
  const [loading, setLoading] = useState(true)
  const [intento, setIntento] = useState(0)
  const ov = useConteosOficina(SECCIONES)

  useEffect(() => {
    if (rol !== 'inmobiliaria') {
      setLoading(false)
      return
    }
    let cancel = false
    dashboardService
      .getMiCarteraAnalitica()
      .then((d) => {
        if (!cancel) setData(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [rol, intento])

  if (rol !== 'inmobiliaria') return null

  if (loading) {
    return (
      <SkeletonCards cantidad={6} etiqueta="Cargando analítica…" />
    )
  }

  // Sin datos tras cargar = la petición falló. Antes la página quedaba en
  // blanco debajo del título, como si no hubiera nada que mostrar.
  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-900">No se pudo cargar la analítica</p>
        <p className="mt-1 text-sm text-amber-800">Esto no significa que su cartera esté vacía.</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setIntento((n) => n + 1)
          }}
          className="mt-4 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Reintentar
        </button>
      </div>
    )
  }
  const s = data.salud
  const e = data.estudios
  const d = e.decisiones30d
  // Bloque 4: las cifras de la tasa, si la API las manda (misma definición que /estudios y /reportes). Si las omite
  // (una API anterior, o no pudo clasificar), ni la frase ni sus tarjetas.
  const desgloseTasa = desgloseDeCifras(d)
  // Reporte de la Oficina Virtual: con los conteos (la API nueva), sus cifras; con una API anterior, las de antes.
  const conConteos = ov.disponible !== false
  const cargando = conConteos && ov.isLoading && !ov.data
  const pestanas = ov.data?.estudios?.pestanas
  const aprob = ov.data?.aprobacion ?? null
  const contratos = ov.data?.contratos ?? null
  const conDesglose = conConteos ? typeof aprob?.con_segundo_firmante === 'number' : typeof d.con_segundo_firmante === 'number'
  /** La cifra de los conteos (null = no se pudo leer: «—») o, con una API anterior, la de antes. */
  const cifra = (nueva: number | undefined | null, anterior: number | string): number | string =>
    conConteos ? (typeof nueva === 'number' ? nueva : '—') : anterior
  const notaCerrados = conConteos ? notaContratosCerrados(contratos) : null
  const decisiones = conConteos
    ? {
        aprobados: aprob?.aprobados,
        conSegundo: aprob?.con_segundo_firmante,
        rechazados: aprob?.rechazados,
        bloqueados: aprob?.bloqueados,
      }
    : { aprobados: d.aprobados, conSegundo: d.con_segundo_firmante, rechazados: d.rechazados, bloqueados: d.bloqueados }

  // Alguna de las cifras compartidas no se pudo calcular: quedan en «—» y se puede reintentar.
  const faltanCifras = conConteos && !ov.isLoading && (!pestanas || !aprob || !contratos)

  return (
    <div className="space-y-6">
      {faltanCifras && <AvisoCifras onReintentar={() => void ov.refetch()} />}
      {/* Salud de su cartera */}
      <Panel title="Salud de su cartera">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Contratos activos"
            value={cifra(contratos?.activos, s.contratosActivos)}
            cargando={cargando}
            color="text-primary-600"
            // Punto 7: los cancelados y terminados, junto al contador (como en Contratos y en Inicio).
            sub={notaCerrados ? `con Cofianza ${notaCerrados}` : 'con Cofianza'}
          />
          {/* Migración §9.5: con cartera migrada, la morosidad es la de la originada y la migrada va aparte. */}
          <StatCard
            label={s.contratosMigrados && s.migrada ? 'Morosidad (cartera originada)' : 'Morosidad actual'}
            value={`${s.morosidadPct}%`}
            color={s.moraActiva > 0 ? 'text-red-500' : 'text-gray-900'}
            sub={
              `${s.moraActiva} contrato${s.moraActiva === 1 ? '' : 's'} en mora` +
              (s.contratosMigrados && s.migrada ? ` · migrada: ${s.migrada.morosidadPct}% (${s.migrada.moraActiva} en mora)` : '')
            }
          />
          <StatCard
            label="Días prom. de mora"
            value={s.diasPromedioMora || '—'}
            color="text-coral-700"
            sub="cuando hay incumplimiento"
          />
          <StatCard
            label="Canon gestionado"
            value={moneyCompact(s.canonGestionado)}
            color="text-primary-600"
            sub="contratos activos"
          />
        </div>
      </Panel>

      {/* Desempeño de sus estudios */}
      <Panel title="Desempeño de sus estudios">
        <div
          className={cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2',
            e.scorePromedio !== undefined ? (conConteos ? 'lg:grid-cols-4' : 'lg:grid-cols-3') : conConteos ? 'lg:grid-cols-3' : '',
          )}
        >
          <StatCard
            label="Estudios aprobados"
            // Punto 1: la pestaña «Aprobados» de Estudios sobre «Todos», desde el inicio.
            value={cifra(pestanas?.aprobado, e.aprobados)}
            cargando={cargando}
            color="text-primary-600"
            sub={
              conConteos
                ? typeof pestanas?.todos === 'number'
                  ? `de ${pestanas.todos.toLocaleString('es-CO')} ${TEXTO_PERIODO.desde_el_inicio}`
                  : TEXTO_PERIODO.desde_el_inicio
                : `de ${e.total} en total`
            }
          />
          {/* La API puede no enviar este dato: entonces la tarjeta no se muestra. */}
          {e.scorePromedio !== undefined && (
            <StatCard
              label="Puntaje promedio de la central"
              value={e.scorePromedio != null ? String(e.scorePromedio) : '—'}
              color="text-blue-600"
              sub="escala de 0 a 999 · inquilinos calificados"
            />
          )}
          {conConteos ? (
            // Punto 13: la misma tasa y la misma frase de Estudios, con el detalle al pasar el cursor o tocar.
            <StatCard
              label="Tasa de aprobación"
              value={aprob && aprob.tasa !== null ? tasaLegible(aprob.tasa) : '—'}
              cargando={cargando}
              color="text-primary-600"
              sub={textoAprobamos(aprob) ?? TEXTO_PERIODO.ultimos_30_dias}
              ayuda={detalleAprobacion(aprob)}
            />
          ) : (
            <StatCard
              label="Tasa de aprobación"
              value={d.total ? tasaLegible(d.tasaAprobacion) : '—'}
              color="text-primary-600"
              sub={desgloseTasa ? `últimos 30 días · ${fraseDesgloseAprobacion(desgloseTasa)}` : 'últimos 30 días'}
            />
          )}
          {/* Punto 1: lo que Cofianza revisa AHORA, la misma cifra de la pestaña de Estudios (antes eran las decisiones
              del periodo que seguían en revisión, y no coincidía). */}
          {conConteos && (
            <StatCard
              label="En revisión de Cofianza"
              value={cifra(pestanas?.revision_cofianza, 0)}
              cargando={cargando}
              color="text-amber-700"
              sub={TEXTO_PERIODO.ahora}
            />
          )}
        </div>

        {/* Decisiones — últimos 30 días */}
        <div className="mt-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Decisiones — últimos 30 días
          </div>
          {/* En el orden de la frase de la tasa (aprobados, con segundo firmante, no aprobables, bloqueados), la tasa
              y, al final, lo que sigue en revisión (fuera de la tasa). Con el desglose son seis tarjetas (2×3 en el
              celular, 3×2 desde sm); sin él (una API anterior, o no se pudo clasificar), las cuatro de siempre:
              ninguna queda sola en su fila. */}
          {/* Con los conteos, solo las decisiones del periodo (la tasa va arriba y «En revisión de Cofianza» es de ahora):
              cuatro tarjetas con el desglose (2×2 en el celular), dos sin él. Con una API anterior, las de antes. */}
          <div className={cn('grid grid-cols-2 gap-3', conConteos ? (conDesglose ? 'sm:grid-cols-4' : '') : conDesglose ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
            <DecisionCard
              label="Aprobados"
              value={cargando ? null : (decisiones.aprobados ?? '—')}
              variant="border-primary-600 bg-primary-50 text-primary-700"
            />
            {conDesglose && (
              <DecisionCard
                label="Con segundo firmante"
                value={cargando ? null : (decisiones.conSegundo ?? 0)}
                variant="border-amber-300 bg-amber-50 text-amber-700"
              />
            )}
            <DecisionCard
              label="No aprobables"
              value={cargando ? null : (decisiones.rechazados ?? '—')}
              variant="border-red-300 bg-red-50 text-red-500"
            />
            {conDesglose && (
              <DecisionCard label="Bloqueados por listas" value={cargando ? null : (decisiones.bloqueados ?? 0)} variant="border-red-300 bg-red-50 text-red-500" />
            )}
            {!conConteos && (
              <>
                <DecisionCard
                  label="Tasa"
                  value={d.total ? tasaLegible(d.tasaAprobacion) : '—'}
                  variant="border-primary-600 bg-primary-50 text-primary-700"
                />
                {/* P26: lo que revisa Cofianza y todavía no resuelve; no entra en la tasa. */}
                <DecisionCard
                  label="En revisión de Cofianza"
                  value={d.condicionados}
                  variant="border-amber-300 bg-amber-50 text-amber-700"
                />
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* Próximas acciones pendientes */}
      <Panel title="Próximas acciones pendientes">
        <AccionesPendientesWidget />
      </Panel>
    </div>
  )
}

// ── Subcomponentes de presentación (estilo mockup) ──────────────

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
        <h3 className="flex items-center gap-2.5 text-base font-bold text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  cargando = false,
  ayuda,
}: {
  label: string
  value: string | number
  sub: string
  color?: string
  /** Mientras carga, el esqueleto en lugar de la cifra (nunca un 0). */
  cargando?: boolean
  /** El detalle al pasar el cursor o tocar (sirve en el celular). */
  ayuda?: string | null
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4" aria-busy={cargando}>
      {/* La burbuja se ancla a la tarjeta (abre desde su borde izquierdo): a 390 px no se sale de la pantalla. */}
      <div className="relative mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {label}
        {ayuda && !cargando && <InfoTip texto={ayuda} etiqueta={`Detalle: ${label.toLowerCase()}`} anclada lado="derecha" />}
      </div>
      {cargando ? (
        <>
          <span className="sr-only">Cargando…</span>
          <Skeleton className="h-[30px] w-16" />
        </>
      ) : (
        <div className={cn('text-3xl font-black leading-none tracking-tight', color)}>{value}</div>
      )}
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  )
}

function DecisionCard({
  label,
  value,
  variant,
}: {
  label: string
  /** null = cargando: el esqueleto (nunca un 0). */
  value: string | number | null
  variant: string
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3.5 text-center', variant)}>
      {value === null ? (
        <>
          <span className="sr-only">Cargando…</span>
          <Skeleton className="mx-auto h-8 w-10" />
        </>
      ) : (
        <div className="text-2xl font-black">{value}</div>
      )}
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  )
}
